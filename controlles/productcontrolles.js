const Product = require("../models/product");
const Review = require("../models/review");
const cloudinary = require("../config/cloudinary");
const nextProductId = require("../utils/nextProductId");
const { toFrontendProduct, fromFrontendBody } = require("../utils/productMap");

const FOLDER = process.env.CLOUDINARY_FOLDER || "shopberrystudio";

const uploadOne = (buffer, resourceType = "image") =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: FOLDER, resource_type: resourceType }, (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      })
      .end(buffer);
  });

const uploadImages = (files) =>
  files && files.length > 0
    ? Promise.all(
        files
          .filter((f) => f.mimetype.startsWith("image/"))
          .map((f) => uploadOne(f.buffer, "image"))
      )
    : Promise.resolve([]);

async function uploadDocuments(files = []) {
  const docs = files.filter((f) => !f.mimetype.startsWith("image/"));
  const out = [];
  for (const file of docs) {
    const url = await uploadOne(file.buffer, "raw");
    out.push({
      id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.originalname || "document",
      kind: file.mimetype.includes("pdf") ? "pdf" : file.mimetype.includes("zip") ? "zip" : "file",
      source: "device",
      href: url,
      size: file.size,
    });
  }
  return out;
}

exports.AddProduct = async (req, res) => {
  try {
    const data = fromFrontendBody(req.body);
    if (!data.title) return res.status(400).json({ msg: "Product title is required" });
    if (data.price == null || Number.isNaN(data.price)) {
      return res.status(400).json({ msg: "Product price is required" });
    }

    const uploaded = req.files || [];
    const urls = await uploadImages(uploaded);
    if (urls.length) data.images = [...(data.images || []), ...urls];

    const docs = await uploadDocuments(uploaded);
    if (docs.length) data.files = [...(data.files || []), ...docs];

    if (data.id == null) data.id = await nextProductId();
    if (!data.code) data.code = `BS-${String(data.id).padStart(3, "0")}`;

    data.custom = data.custom !== false;

    const product = new Product(data);
    await product.save();
    return res.status(201).json({ msg: "product added", product: toFrontendProduct(product, { withFileLinks: true }) });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

const isAdminUser = (user) => user?.role === "Admin" || user?.role === "admin";

/** "4.5 (12)" per product id, computed from the real reviews. */
async function ratingLabels() {
  const rows = await Review.aggregate([
    { $group: { _id: "$productId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, `${row.avg.toFixed(1)} (${row.count})`]));
}

exports.GetProducts = async (req, res) => {
  try {
    const [products, labels] = await Promise.all([Product.find().sort({ id: 1 }), ratingLabels()]);
    const withFileLinks = isAdminUser(req.user);
    return res.status(200).json(
      products.map((product) => ({
        ...toFrontendProduct(product, { withFileLinks }),
        r: labels.get(product.id) || "New",
      })),
    );
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.GetOneProduct = async (req, res) => {
  try {
    const key = req.params.id;
    const product = /^\d+$/.test(key)
      ? await Product.findOne({ id: Number(key) })
      : await Product.findById(key);
    if (!product) return res.status(404).json({ msg: "Product not found" });
    const labels = await ratingLabels();
    return res.status(200).json({
      ...toFrontendProduct(product, { withFileLinks: isAdminUser(req.user) }),
      r: labels.get(product.id) || "New",
    });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.UpdateProduct = async (req, res) => {
  try {
    const key = req.params.id;
    const existing = /^\d+$/.test(key)
      ? await Product.findOne({ id: Number(key) })
      : await Product.findById(key);
    if (!existing) return res.status(404).json({ msg: "Product not found" });

    const updateData = fromFrontendBody(req.body);
    // A file sent back without its address keeps the stored one, so an edit can never blank a paid file.
    if (Array.isArray(updateData.files)) {
      const stored = new Map((existing.files || []).map((file) => [file.id, file.href]));
      updateData.files = updateData.files.map((file) =>
        file.href ? file : { ...file, href: stored.get(file.id) || file.href }
      );
    }
    let keepImgs = req.body.keepImgs || req.body.imgs || [];
    if (typeof keepImgs === "string") {
      try {
        keepImgs = JSON.parse(keepImgs);
      } catch {
        keepImgs = [keepImgs];
      }
    }

    const uploaded = req.files || [];
    const newUrls = await uploadImages(uploaded);
    if (Array.isArray(keepImgs) || newUrls.length) {
      updateData.images = [...(Array.isArray(keepImgs) ? keepImgs : []), ...newUrls];
    }

    const docs = await uploadDocuments(uploaded);
    if (docs.length) {
      updateData.files = [...(updateData.files || existing.files || []), ...docs];
    }

    Object.assign(existing, updateData);
    await existing.save();
    return res.status(202).json({ msg: "Update success", product: toFrontendProduct(existing, { withFileLinks: true }) });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.DeleteProduct = async (req, res) => {
  try {
    const key = req.params.id;
    const target = /^\d+$/.test(key)
      ? await Product.findOne({ id: Number(key) }).select("id").lean()
      : await Product.findById(key).select("id").lean();
    if (!target) return res.status(404).json({ msg: "Product not found" });
    await Product.deleteOne({ _id: target._id });
    await Review.deleteMany({ productId: target.id });
    return res.status(202).json({ msg: "product deleted" });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};
