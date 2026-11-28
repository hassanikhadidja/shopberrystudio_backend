const crypto = require("crypto");
const connectDB = require("../config/connectDB");
const Order = require("../models/order");
const Product = require("../models/product");
const User = require("../models/user");

/**
 * Checks Paddle's Paddle-Signature header ("ts=<unix>;h1=<hex>") against the raw body.
 * Signed payload is "<ts>:<raw body>" with HMAC-SHA256 and the notification secret.
 */
function verifySignature(rawBody, header, secret) {
  if (!header || !secret) return false;
  const fields = {};
  for (const part of String(header).split(";")) {
    const at = part.indexOf("=");
    if (at > 0) fields[part.slice(0, at).trim()] = part.slice(at + 1).trim();
  }
  if (!fields.ts || !fields.h1) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${fields.ts}:${rawBody}`)
    .digest();
  const received = Buffer.from(fields.h1, "hex");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function parseIds(value) {
  return String(value || "")
    .split(",")
    .map((part) => Number.parseInt(part, 10));
}

/** Creates one paid order from a completed Paddle transaction. Returns false if it already existed. */
async function recordPaidOrder(transaction) {
  const transactionId = transaction.id;
  if (!transactionId) throw new Error("Transaction has no id");

  const already = await Order.exists({ paddleTransactionId: transactionId });
  if (already) return false;

  // The checkout route sends product ids and quantities in the same order.
  const custom = transaction.custom_data || {};
  const ids = parseIds(custom.product_ids);
  const quantities = parseIds(custom.quantities);

  const products = await Product.find({ id: { $in: ids.filter((id) => id > 0) } });
  const byId = new Map(products.map((product) => [product.id, product]));

  const items = [];
  ids.forEach((id, index) => {
    const product = byId.get(id);
    if (!product) return;
    items.push({
      productId: product.id,
      title: product.title,
      price: product.price,
      quantity: Math.max(1, quantities[index] || 1),
      emoji: product.emoji || "",
      image: (product.images && product.images[0]) || "",
    });
  });
  if (!items.length) throw new Error(`No known products in transaction ${transactionId}`);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // Paddle totals are in minor units (cents). Fall back to our own sum if they are missing.
  const paidMinor = Number(transaction.details?.totals?.total);
  const total = Number.isFinite(paidMinor) ? paidMinor / 100 : subtotal;

  const email = String(custom.customer_email || transaction.customer?.email || "")
    .trim()
    .toLowerCase();
  const user = email ? await User.findOne({ email }).select("_id name").lean() : null;

  try {
    await Order.create({
      userId: user ? user._id : null,
      customerName: user?.name || "",
      customerEmail: email,
      items,
      subtotal,
      total,
      status: "paid",
      note: "Paddle",
      paddleTransactionId: transactionId,
    });
  } catch (error) {
    // Two deliveries of the same event raced; the other one already wrote the order.
    if (error.code === 11000) return false;
    throw error;
  }

  // Keep dashboard sales numbers in step with the order.
  await Promise.all(
    items.map((item) =>
      Product.updateOne({ id: item.productId }, { $inc: { salesCount: item.quantity } })
    )
  );
  if (user) {
    const units = items.reduce((sum, item) => sum + item.quantity, 0);
    await User.updateOne({ _id: user._id }, { $inc: { orderCount: units } });
  }
  return true;
}

exports.verifySignature = verifySignature;

exports.PaddleWebhook = async (req, res) => {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(503).json({ msg: "PADDLE_WEBHOOK_SECRET is not set" });
  }

  // Mounted with express.raw, so the body is the exact bytes Paddle signed.
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
  if (!verifySignature(rawBody, req.get("Paddle-Signature"), secret)) {
    return res.status(401).json({ msg: "Invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ msg: "Invalid JSON" });
  }

  if (event.event_type !== "transaction.completed") {
    return res.status(200).json({ msg: "ignored" });
  }

  try {
    await connectDB();
    const created = await recordPaidOrder(event.data || {});
    return res.status(200).json({ msg: created ? "order recorded" : "already recorded" });
  } catch (error) {
    // 5xx makes Paddle retry the delivery later.
    return res.status(500).json({ msg: error.message });
  }
};
