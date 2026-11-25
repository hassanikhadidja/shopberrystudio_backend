const jwt = require("jsonwebtoken");
const User = require("../models/user");

/** Attach req.user when a valid Bearer token is present; otherwise continue as guest. */
exports.optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header) return next();
    const token = header.split(" ")[1];
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.secretKey);
    const user = await User.findById(decoded._id).select("-password");
    if (user) req.user = user;
    next();
  } catch {
    next();
  }
};
