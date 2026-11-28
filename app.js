const express = require("express");
const path = require("path");
const cors = require("cors");
const connectDB = require("./config/connectDB");

const productRoutes = require("./routes/productRoutes");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
// Paddle signs the exact raw body, so this route must run before express.json parses it.
app.post(
  "/paddle/webhook",
  express.raw({ type: "*/*", limit: "1mb" }),
  require("./controlles/paddlewebhookcontrolles").PaddleWebhook
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({
    name: "Berry Studio API",
    version: "2.0.0",
    docs: "See spec.md",
  });
});

// Serverless hosts (Vercel) load this file without running index.js, so connect here.
// Cached per instance; a failed attempt is retried on the next request.
let dbReady = null;
app.use(async (req, res, next) => {
  try {
    if (!dbReady) dbReady = connectDB();
    await dbReady;
    next();
  } catch (error) {
    dbReady = null;
    return res.status(503).json({ msg: `Database unavailable: ${error.message}` });
  }
});

app.use("/product", productRoutes);
app.use("/user", userRoutes);
app.use("/order", orderRoutes);
app.use("/review", reviewRoutes);
app.use("/message", messageRoutes);

app.use((req, res) => {
  return res.status(404).json({ message: "Route not found" });
});

module.exports = app;
