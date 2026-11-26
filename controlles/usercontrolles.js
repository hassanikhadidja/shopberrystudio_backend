const isValidEmail = require("../middlewares/emailvalidator");
const passwordvalidator = require("../middlewares/passwordvalidator");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { toFrontendUser } = require("../utils/productMap");

function signToken(user) {
  return jwt.sign({ _id: user._id }, process.env.secretKey, { expiresIn: "30d" });
}

exports.Adduser = async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const name = String(req.body.name || req.body.n || "").trim();
    const password = req.body.password;

    if (req.body.role) return res.status(400).json({ msg: "Not auth !!" });
    if (!name) return res.status(400).json({ msg: "Name is required" });
    if (!isValidEmail(email)) return res.status(400).json({ msg: "Should be format email" });
    if (await User.findOne({ email })) {
      return res.status(400).json({ msg: "Email exist please login" });
    }
    if (!passwordvalidator(password)) {
      return res.status(400).json({ msg: "Password needs 6 characters or more" });
    }

    const user = new User({
      email,
      name,
      password: await bcrypt.hash(password, 10),
      role: "Client",
    });
    await user.save();
    const token = signToken(user);
    return res.status(201).json({
      msg: "Register success",
      token,
      user: toFrontendUser(user),
    });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.Login = async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const { password } = req.body;

    const existUser = await User.findOne({ email });
    if (!existUser || !existUser.password) {
      return res.status(400).json({ msg: "Bad credential !" });
    }
    const ok = await bcrypt.compare(password, existUser.password);
    if (!ok) return res.status(400).json({ msg: "Bad credential !" });

    const token = signToken(existUser);
    return res.status(200).json({
      msg: "login success",
      token,
      user: toFrontendUser(existUser),
    });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

function nameFromEmail(email) {
  return (email.split("@")[0] || "Guest")
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

/**
 * Verifies a Google ID token (the `credential` from Google Identity Services).
 * Google checks the signature and expiry; we check audience, issuer and email.
 */
async function verifyGoogleCredential(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
  );
  const info = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error("Google could not verify this sign-in");
  if (info.aud !== clientId) throw new Error("This token was issued for another app");
  if (!GOOGLE_ISSUERS.has(info.iss)) throw new Error("Unexpected token issuer");
  if (info.email_verified !== true && info.email_verified !== "true") {
    throw new Error("Your Google email is not verified");
  }
  if (!info.email) throw new Error("Google did not share an email address");

  return { email: String(info.email).toLowerCase(), name: String(info.name || "").trim() };
}

/**
 * Google sign-in.
 * - Production / GOOGLE_CLIENT_ID set: requires a verified Google ID token in `credential`.
 * - Local dev without GOOGLE_CLIENT_ID: falls back to the old email-only demo.
 */
exports.GoogleContinue = async (req, res) => {
  try {
    const hasClientId = Boolean(process.env.GOOGLE_CLIENT_ID);
    const demoAllowed = !hasClientId && process.env.NODE_ENV !== "production";

    let email;
    let name = "";

    if (req.body.credential) {
      if (!hasClientId) {
        return res.status(503).json({ msg: "Google sign-in is not configured (GOOGLE_CLIENT_ID)" });
      }
      try {
        ({ email, name } = await verifyGoogleCredential(String(req.body.credential)));
      } catch (error) {
        return res.status(401).json({ msg: error.message });
      }
    } else if (demoAllowed) {
      email = String(req.body.email || "")
        .trim()
        .toLowerCase();
    } else {
      return res.status(400).json({ msg: "Google credential is required" });
    }

    if (!isValidEmail(email)) return res.status(400).json({ msg: "Should be format email" });

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        name: name || nameFromEmail(email),
        password: "",
        google: true,
        role: "Client",
      });
      await user.save();
    } else if (!user.google && req.body.credential) {
      // Same verified email as an existing account: link it to Google.
      user.google = true;
      await user.save();
    }

    const token = signToken(user);
    return res.status(200).json({
      msg: req.body.credential ? "Signed in with Google" : "Signed in with Google (demo)",
      token,
      user: toFrontendUser(user),
    });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    return res.status(200).json(toFrontendUser(req.user));
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    return res.status(200).json(users.map(toFrontendUser));
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
};

exports.UpdateUSER = async (req, res) => {
  try {
    const isSelf = String(req.user._id) === String(req.params.id);
    const isAdminUser = req.user.role === "Admin" || req.user.role === "admin";
    if (!isSelf && !isAdminUser) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const body = { ...req.body };
    delete body.password;
    if (body.n) body.name = body.n;
    if (body.e) body.email = String(body.e).toLowerCase();
    if (body.r) body.role = body.r;
    if (body.o != null) body.orderCount = body.o;

    if (!isAdminUser) {
      delete body.role;
      delete body.orderCount;
    }

    if (req.body.password) {
      if (!passwordvalidator(req.body.password)) {
        return res.status(400).json({ msg: "Password needs 6 characters or more" });
      }
      body.password = await bcrypt.hash(req.body.password, 10);
    }

    if (req.body.notif != null) body.notif = Boolean(req.body.notif);

    if (body.role && body.role !== "Admin") {
      const target = await User.findById(req.params.id);
      if (target && target.role === "Admin") {
        const admins = await User.countDocuments({ role: "Admin" });
        if (admins <= 1) return res.status(400).json({ msg: "Keep at least one Admin" });
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, body, { new: true }).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    return res.status(202).json({ msg: "Update success", user: toFrontendUser(user) });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.DeleteUser = async (req, res) => {
  try {
    if (String(req.user._id) === String(req.params.id)) {
      return res.status(400).json({ msg: "You cannot remove your own account" });
    }
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ msg: "User not found" });
    if (target.role === "Admin") {
      const admins = await User.countDocuments({ role: "Admin" });
      if (admins <= 1) return res.status(400).json({ msg: "Keep at least one Admin" });
    }
    await User.deleteOne({ _id: req.params.id });
    return res.status(200).json({ msg: "User deleted" });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.AdminAddUser = async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const name = String(req.body.name || "").trim();
    const password = req.body.password;
    const role = req.body.role === "Admin" ? "Admin" : "Client";

    if (!name) return res.status(400).json({ msg: "Name is required" });
    if (!isValidEmail(email)) return res.status(400).json({ msg: "Should be format email" });
    if (await User.findOne({ email })) return res.status(400).json({ msg: "Email already exists" });
    if (!passwordvalidator(password)) {
      return res.status(400).json({ msg: "Password needs 6 characters or more" });
    }

    const user = new User({
      email,
      name,
      role,
      password: await bcrypt.hash(password, 10),
    });
    await user.save();
    return res.status(201).json({ msg: "User created", user: toFrontendUser(user) });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.ToggleFavorite = async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!productId) return res.status(400).json({ msg: "Invalid product id" });

    const user = await User.findById(req.user._id);
    const set = new Set(user.favorites || []);
    if (set.has(productId)) set.delete(productId);
    else set.add(productId);
    user.favorites = [...set];
    await user.save();
    return res.status(200).json({ favorites: user.favorites });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.SetNotifications = async (req, res) => {
  try {
    const notif = req.body.notif != null ? Boolean(req.body.notif) : !req.user.notif;
    const user = await User.findByIdAndUpdate(req.user._id, { notif }, { new: true }).select("-password");
    return res.status(200).json({ notif: user.notif, user: toFrontendUser(user) });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};
