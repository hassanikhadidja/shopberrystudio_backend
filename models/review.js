const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true },
    name: { type: String, default: "Buyer" },
    images: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("review", reviewSchema);
