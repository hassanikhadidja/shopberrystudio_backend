const Order = require("../models/order");
const Product = require("../models/product");
const User = require("../models/user");

function purchaseShape(order) {
  return (order.items || []).map((item) => ({
    i: item.productId,
    ts: new Date(order.createdAt).getTime(),
    title: item.title,
    price: item.price,
    orderId: order._id,
    status: order.status,
  }));
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** Calendar Mon–Sun week counts — matches frontend lib/berry/sales.ts */
function calendarWeekSales(orders, now = new Date()) {
  const start = startOfDay(now);
  const weekday = start.getDay();
  start.setDate(start.getDate() - (weekday === 0 ? 6 : weekday - 1));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const end = new Date(day);
    end.setDate(day.getDate() + 1);
    return orders.reduce((sum, order) => {
      const ts = new Date(order.createdAt).getTime();
      if (ts < day.getTime() || ts >= end.getTime()) return sum;
      return sum + order.items.reduce((s, i) => s + i.quantity, 0);
    }, 0);
  });
}

/** Jan–Dec of current year — matches frontend lib/berry/sales.ts */
function calendarMonthSales(orders, now = new Date()) {
  const year = now.getFullYear();
  return Array.from({ length: 12 }, (_, month) =>
    orders.reduce((sum, order) => {
      const date = new Date(order.createdAt);
      if (date.getFullYear() !== year || date.getMonth() !== month) return sum;
      return sum + order.items.reduce((s, i) => s + i.quantity, 0);
    }, 0)
  );
}

exports.CreateOrder = async (req, res) => {
  try {
    const { items, note } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ msg: "Order must have at least one item" });
    }

    const lineItems = [];
    for (const line of items) {
      const productId = Number(line.productId ?? line.i ?? line.id);
      const product = await Product.findOne({ id: productId });
      if (!product) return res.status(400).json({ msg: `Unknown product ${productId}` });
      const quantity = Math.max(1, Number(line.quantity) || 1);
      lineItems.push({
        productId: product.id,
        title: product.title,
        price: product.price,
        quantity,
        emoji: product.emoji,
        image: (product.images && product.images[0]) || "",
      });
      product.salesCount = (product.salesCount || 0) + quantity;
      await product.save();
    }

    const subtotal = lineItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const order = new Order({
      userId: req.user ? req.user._id : null,
      customerName: req.user?.name || req.body.customerName || "",
      customerEmail: req.user?.email || req.body.customerEmail || "",
      items: lineItems,
      subtotal,
      total: subtotal,
      // Digital printables: paid = ready to download
      status: "paid",
      note: note || "",
    });
    await order.save();

    if (req.user) {
      const units = lineItems.reduce((s, i) => s + i.quantity, 0);
      await User.findByIdAndUpdate(req.user._id, { $inc: { orderCount: units } });
    }

    return res.status(201).json({
      msg: "Order placed successfully",
      orderId: order._id,
      order,
      purchases: purchaseShape(order),
    });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.GetMyPurchases = async (req, res) => {
  try {
    const email = String(req.user.email || "").trim().toLowerCase();
    const orders = await Order.find({
      $or: [{ userId: req.user._id }, ...(email ? [{ customerEmail: email }] : [])],
    }).sort({ createdAt: -1 });
    const purchases = orders.flatMap(purchaseShape);
    return res.status(200).json({ orders, purchases });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

const isAdminUser = (user) => user?.role === "Admin" || user?.role === "admin";

/** Product ids this user has paid for. Matches by account, or by email for orders made before sign-in. */
async function ownedProductIds(user) {
  const email = String(user.email || "").trim().toLowerCase();
  const orders = await Order.find({
    $or: [{ userId: user._id }, ...(email ? [{ customerEmail: email }] : [])],
    status: { $in: ["paid", "delivered"] },
  });
  return new Set(orders.flatMap((order) => order.items.map((item) => item.productId)));
}

exports.GetMyDownloads = async (req, res) => {
  try {
    const owned = await ownedProductIds(req.user);
    const products = await Product.find({ id: { $in: [...owned] } });
    // File names only. Addresses are handed out one at a time by DownloadFile.
    const downloads = products.map((p) => ({
      title: p.title,
      detail: p.pdfCount ? `PDF · ${p.pdfCount} file(s)` : "Digital download",
      files: (p.files || []).map((file) => ({
        id: file.id,
        name: file.name,
        kind: file.kind,
        size: file.size,
      })),
      productId: p.id,
    }));
    return res.status(200).json(downloads);
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

/** Returns the address of one file, but only to someone who bought the product (or an admin). */
exports.DownloadFile = async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!isAdminUser(req.user)) {
      const owned = await ownedProductIds(req.user);
      if (!owned.has(productId)) {
        return res.status(403).json({ msg: "Buy this product to download its files" });
      }
    }
    const product = await Product.findOne({ id: productId });
    const file = product?.files?.find((item) => item.id === req.params.fileId);
    if (!file) return res.status(404).json({ msg: "File not found" });
    return res.status(200).json({ url: file.href, name: file.name });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.GetOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    return res.status(200).json(orders);
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.GetOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ msg: "Order not found" });
    return res.status(200).json(order);
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.UpdateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "paid", "delivered", "cancelled"];
    if (!allowed.includes(status)) return res.status(400).json({ msg: "Invalid status value" });

    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ msg: "Order not found" });
    return res.status(200).json({ msg: "Status updated", order });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.DeleteOrder = async (req, res) => {
  try {
    const result = await Order.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ msg: "Order not found" });
    return res.status(200).json({ msg: "Order deleted" });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.GetDashboardStats = async (req, res) => {
  try {
    const products = await Product.find().sort({ salesCount: -1 });
    const moneyReceived = products.reduce((sum, p) => sum + p.price * (p.salesCount || 0), 0);
    const topSellers = products.slice(0, 5).map((p) => ({
      id: p.id,
      title: p.title,
      sold: p.salesCount || 0,
      revenue: +(p.price * (p.salesCount || 0)).toFixed(2),
      emoji: p.emoji,
    }));

    const orders = await Order.find({ status: { $in: ["paid", "delivered"] } });
    const now = new Date();

    return res.status(200).json({
      moneyReceived: +moneyReceived.toFixed(2),
      topSellers,
      weekSales: calendarWeekSales(orders, now),
      monthSales: calendarMonthSales(orders, now),
      productCount: products.length,
      orderCount: orders.length,
    });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};
