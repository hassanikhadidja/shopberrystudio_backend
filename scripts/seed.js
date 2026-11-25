/**
 * Seed Berry Studio catalog + users into MongoDB.
 * Matches frontend lib/berry/catalog.ts and lib/berry/model.ts.
 * Usage: npm run seed
 */
require("dotenv").config();
const bcrypt = require("bcrypt");
const connectDB = require("../config/connectDB");
const Product = require("../models/product");
const User = require("../models/user");
const Review = require("../models/review");

const CATALOG = [
  {
    id: 1,
    title: "Personalized embroidery hoop",
    ratingLabel: "4.5 (569)",
    price: 12.4,
    originalPrice: 24.8,
    emoji: "🐕",
    gradient: "linear-gradient(160deg,#cfd9ee,#f3ece0)",
    salesCount: 96,
  },
  {
    id: 2,
    title: "Set of 6 vinyl record shelves",
    ratingLabel: "4.2 (5)",
    price: 25.4,
    originalPrice: 36.3,
    emoji: "💿",
    gradient: "linear-gradient(160deg,#2b2b34,#6d5a48)",
    salesCount: 12,
  },
  {
    id: 3,
    title: "500+ Coloring Pages Pack",
    ratingLabel: "4.7 (737)",
    price: 2.12,
    originalPrice: 7.07,
    emoji: "🎨",
    gradient: "linear-gradient(135deg,#ffd45e,#ff7a59 55%,#b05cf0)",
    bestseller: true,
    pdfCount: 1,
    tags: ["coloring", "kids", "printable"],
    description: "Instant download coloring pack for kids — hundreds of pages ready to print.",
    salesCount: 312,
  },
  {
    id: 4,
    title: "Wall mount for records",
    ratingLabel: "4.8 (212)",
    price: 18.9,
    originalPrice: 22.5,
    emoji: "🪵",
    gradient: "linear-gradient(160deg,#e8d9c3,#b98a5e)",
    salesCount: 28,
  },
  {
    id: 5,
    title: "Stained glass moon ornament",
    ratingLabel: "4.9 (98)",
    price: 21,
    originalPrice: 0,
    emoji: "🌙",
    gradient: "linear-gradient(160deg,#4a3b2a,#c9b58f)",
    salesCount: 33,
  },
  {
    id: 6,
    title: "Matching family Christmas pajamas",
    ratingLabel: "4.6 (1.2k)",
    price: 39,
    originalPrice: 52,
    emoji: "🎄",
    gradient: "linear-gradient(160deg,#2f7d5a,#c8392b)",
    salesCount: 74,
  },
  {
    id: 7,
    title: "Gold and topaz ring",
    ratingLabel: "5.0 (64)",
    price: 74,
    originalPrice: 0,
    emoji: "💍",
    gradient: "linear-gradient(160deg,#a8d4e6,#f0e1c2)",
    salesCount: 41,
  },
  {
    id: 8,
    title: "Kids educational pack",
    ratingLabel: "4.7 (301)",
    price: 1.65,
    originalPrice: 5.49,
    emoji: "✏️",
    gradient: "linear-gradient(160deg,#9fd8ff,#ffe27a)",
    bestseller: true,
    pdfCount: 1,
    tags: ["education", "kids", "worksheets"],
    description: "Printable worksheets and activities for kids.",
    salesCount: 187,
  },
];

const USERS = [
  { email: "khadidja@berrystudio.example", name: "Khadidja H.", role: "Admin", password: "Admin123!", orderCount: 14 },
  { email: "sara@example.com", name: "Sara M.", role: "Client", password: "Client123!", orderCount: 6 },
  { email: "lina@example.com", name: "Lina B.", role: "Client", password: "Client123!", orderCount: 3 },
  { email: "ahmed@example.com", name: "Ahmed R.", role: "Client", password: "Client123!", orderCount: 9 },
];

async function seed() {
  await connectDB();

  for (const item of CATALOG) {
    await Product.findOneAndUpdate(
      { id: item.id },
      {
        ...item,
        code: `BS-${String(item.id).padStart(3, "0")}`,
        custom: false,
        images: item.images || [],
        files: item.files || [],
        tags: item.tags || [],
        description: item.description || "",
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
  }
  console.log(`Seeded ${CATALOG.length} products (codes BS-001 … BS-008)`);

  for (const u of USERS) {
    const password = await bcrypt.hash(u.password, 10);
    await User.findOneAndUpdate(
      { email: u.email },
      {
        name: u.name,
        role: u.role,
        password,
        google: false,
        notif: true,
        orderCount: u.orderCount || 0,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
  }
  console.log(`Seeded ${USERS.length} users (admin: khadidja@berrystudio.example / Admin123!)`);

  const reviewCount = await Review.countDocuments();
  if (reviewCount === 0) {
    await Review.insertMany([
      {
        productId: 3,
        rating: 5,
        text: "Great quality, clean files and perfect for printing.",
        name: "Ahmed",
      },
      {
        productId: 3,
        rating: 5,
        text: "My kids love these pages. Very easy to use.",
        name: "Lina",
      },
      {
        productId: 3,
        rating: 5,
        text: "Instant download and a very responsive seller.",
        name: "Sofia",
      },
    ]);
    console.log("Seeded sample reviews (coloring pack)");
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
