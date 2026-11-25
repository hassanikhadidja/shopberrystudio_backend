/** Map a Product document to the Berry Studio frontend Product shape. */
function toFrontendProduct(doc) {
  const p = doc.toObject ? doc.toObject() : doc;
  return {
    id: p.id,
    t: p.title,
    r: p.ratingLabel || "0 (0)",
    p: p.price,
    o: p.originalPrice || 0,
    e: p.emoji || "🎨",
    c: p.gradient || "linear-gradient(160deg,#cfd9ee,#f3ece0)",
    b: Boolean(p.bestseller),
    imgs: p.images || [],
    files: p.files || [],
    code: p.code || `BS-${String(p.id).padStart(3, "0")}`,
    pdf: p.pdfCount || 0,
    tags: p.tags || [],
    d: p.description || "",
    cu: Boolean(p.custom),
    sales: p.salesCount || 0,
    _id: p._id,
  };
}

function fromFrontendBody(body = {}) {
  const data = {};
  if (body.t != null || body.title != null) data.title = body.title ?? body.t;
  if (body.code != null) data.code = body.code;
  if (body.p != null || body.price != null) data.price = Number(body.price ?? body.p);
  if (body.o != null || body.originalPrice != null) data.originalPrice = Number(body.originalPrice ?? body.o);
  if (body.e != null || body.emoji != null) data.emoji = body.emoji ?? body.e;
  if (body.c != null || body.gradient != null) data.gradient = body.gradient ?? body.c;
  if (body.r != null || body.ratingLabel != null) data.ratingLabel = body.ratingLabel ?? body.r;
  if (body.imgs != null || body.images != null) data.images = body.images ?? body.imgs;
  if (body.files != null) {
    data.files = typeof body.files === "string" ? JSON.parse(body.files) : body.files;
  }
  if (body.tags != null) {
    data.tags =
      typeof body.tags === "string"
        ? body.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : body.tags;
  }
  if (body.d != null || body.description != null) data.description = body.description ?? body.d;
  if (body.b != null || body.bestseller != null) {
    data.bestseller = body.bestseller === true || body.bestseller === "true" || body.b === true || body.b === "true";
  }
  if (body.pdf != null || body.pdfCount != null) data.pdfCount = Number(body.pdfCount ?? body.pdf);
  if (body.cu != null || body.custom != null) {
    data.custom = body.custom === true || body.custom === "true" || body.cu === true || body.cu === "true";
  }
  if (body.salesCount != null) data.salesCount = Number(body.salesCount);
  return data;
}

function toFrontendUser(doc) {
  const u = doc.toObject ? doc.toObject() : doc;
  return {
    _id: u._id,
    n: u.name,
    e: u.email,
    r: u.role,
    o: u.orderCount || 0,
    g: u.google ? 1 : 0,
    notif: u.notif !== false,
    favorites: u.favorites || [],
  };
}

module.exports = { toFrontendProduct, fromFrontendBody, toFrontendUser };
