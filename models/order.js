const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    emoji: { type: String, default: "" },
    image: { type: String, default: "" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    customerName: { type: String, default: "" },
    customerEmail: { type: String, default: "" },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "delivered", "cancelled"],
      // Digital downloads are available as soon as payment succeeds
      default: "paid",
    },
    note: { type: String, default: "" },
    // Set for orders created from a Paddle transaction.completed webhook.
    // Unique so a retried webhook can never create the same order twice.
    paddleTransactionId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("order", orderSchema);
