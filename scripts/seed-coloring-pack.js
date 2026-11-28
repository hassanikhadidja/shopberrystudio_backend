/**
 * Adds the 500+ Coloring Pages Pack (id 3) and its two sample reviews.
 * Safe to run more than once: the product is upserted and reviews are only
 * added when this product has none yet. Does not touch other products.
 * Usage: node scripts/seed-coloring-pack.js
 */
require("dotenv").config();
const connectDB = require("../config/connectDB");
const Product = require("../models/product");
const Review = require("../models/review");

const PRODUCT_ID = 3;

const PRODUCT = {
  id: PRODUCT_ID,
  title: "500+ Coloring Pages Pack",
  code: "BS-003",
  price: 2.12,
  originalPrice: 7.07,
  emoji: "🎨",
  gradient: "linear-gradient(135deg,#ffd45e,#ff7a59 55%,#b05cf0)",
  bestseller: true,
  pdfCount: 2,
  custom: true,
  tags: ["coloring", "kids", "printable"],
  description:
    "Step into a world of fun with the 500+ Coloring Pages Pack! Castles, astronauts, dinosaurs, animals and many more themes are waiting to be brought to life with your favorite colors. Print at home in A4 or Letter format. Every page has bold lines and large areas to color, designed for kids aged 3 to 10.",
  included: ["2 PDF files", "500+ unique coloring pages", "A4 and Letter sizes", "Personal use license"],
  perfect: [
    "Kids aged 3 to 10",
    "Rainy days and quiet time",
    "Birthday parties and playdates",
    "Parents looking for screen-free activities",
  ],
  benefits: [
    "Bold lines and big areas that are easy to color",
    "Builds focus, creativity and fine motor skills",
    "Print as many times as you like at home",
    "Instant download after payment",
  ],
};

const REVIEWS = [
  { name: "Ahmed", rating: 5, text: "Great quality, clean files and perfect for printing." },
  { name: "Lina", rating: 5, text: "My kids love these pages. Very easy to use." },
];

async function seed() {
  await connectDB();

  await Product.findOneAndUpdate({ id: PRODUCT_ID }, { $set: PRODUCT }, { upsert: true, returnDocument: "after" });
  console.log(`Product ${PRODUCT_ID} saved`);

  const existing = await Review.countDocuments({ productId: PRODUCT_ID });
  if (existing === 0) {
    await Review.insertMany(REVIEWS.map((review) => ({ productId: PRODUCT_ID, ...review })));
    console.log(`Added ${REVIEWS.length} reviews`);
  } else {
    console.log(`Product ${PRODUCT_ID} already has ${existing} reviews, left as is`);
  }

  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
