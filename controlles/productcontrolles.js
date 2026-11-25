const Product = require("../models/product");
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
    return res.status(201).json({ msg: "product added", product: toFrontendProduct(product) });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.GetProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ id: 1 });
    return res.status(200).json(products.map(toFrontendProduct));
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
    return res.status(200).json(toFrontendProduct(product));
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
    return res.status(202).json({ msg: "Update success", product: toFrontendProduct(existing) });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.DeleteProduct = async (req, res) => {
  try {
    const key = req.params.id;
    const result = /^\d+$/.test(key)
      ? await Product.deleteOne({ id: Number(key) })
      : await Product.deleteOne({ _id: key });
    if (result.deletedCount === 0) return res.status(404).json({ msg: "Product not found" });
    return res.status(202).json({ msg: "product deleted" });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};
