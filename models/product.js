const mongoose = require("mongoose");

const productFileSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    kind: { type: String, default: "file" },
    source: { type: String, enum: ["device", "github"], default: "device" },
    href: { type: String, required: true },
    size: { type: Number },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    // Public numeric id used by the Berry Studio frontend cart/fav/purchases
    id: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: [true, "Product title is required"], trim: true },
    code: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: 0, min: 0 },
    emoji: { type: String, default: "🎨" },
    gradient: { type: String, default: "linear-gradient(160deg,#cfd9ee,#f3ece0)" },
    ratingLabel: { type: String, default: "0 (0)" },
    images: [{ type: String }],
    files: [productFileSchema],
    tags: [{ type: String, trim: true }],
    description: { type: String, default: "" },
    bestseller: { type: Boolean, default: false },
    pdfCount: { type: Number, default: 0, min: 0 },
    salesCount: { type: Number, default: 0, min: 0 },
    custom: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("product", productSchema);
