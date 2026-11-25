const Product = require("../models/product");

async function nextProductId() {
  const last = await Product.findOne().sort({ id: -1 }).select("id").lean();
  // After seeding ids 1–8, new dashboard products continue at 9+
  return (last?.id || 0) + 1;
}

module.exports = nextProductId;
