const Review = require("../models/review");

function toFrontend(review) {
  const r = review.toObject ? review.toObject() : review;
  const created = r.createdAt ? new Date(r.createdAt) : new Date();
  const label = created.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return {
    i: r.productId,
    s: r.rating,
    t: r.text,
    d: label,
    n: r.name,
    im: r.images || [],
    _id: r._id,
  };
}

exports.GetReviews = async (req, res) => {
  try {
    const filter = {};
    if (req.query.productId) filter.productId = Number(req.query.productId);
    const reviews = await Review.find(filter).sort({ createdAt: -1 });
    return res.status(200).json(reviews.map(toFrontend));
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.AddReview = async (req, res) => {
  try {
    const productId = Number(req.body.productId ?? req.body.i);
    const rating = Number(req.body.rating ?? req.body.s);
    const text = String(req.body.text ?? req.body.t ?? "").trim();
    const name = String(req.body.name ?? req.body.n ?? req.user?.name ?? "Buyer").trim();
    const images = req.body.images ?? req.body.im ?? [];

    if (!productId) return res.status(400).json({ msg: "productId is required" });
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ msg: "rating must be 1–5" });
    if (!text) return res.status(400).json({ msg: "Review text is required" });

    const review = new Review({
      productId,
      userId: req.user?._id || null,
      rating,
      text,
      name,
      images: Array.isArray(images) ? images : [],
    });
    await review.save();
    return res.status(201).json({ msg: "Review added", review: toFrontend(review) });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};
