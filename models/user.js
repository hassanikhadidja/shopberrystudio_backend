const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, default: "" },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["Admin", "Client"],
      default: "Client",
    },
    google: { type: Boolean, default: false },
    orderCount: { type: Number, default: 0, min: 0 },
    notif: { type: Boolean, default: true },
    favorites: [{ type: Number }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("user", userSchema);
