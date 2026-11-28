/**
 * Removes the demo catalog, sample users and sample reviews.
 * Makes khadidja.khaoila.hassani@gmail.com the admin.
 * Usage: npm run seed
 */
require("dotenv").config();
const connectDB = require("../config/connectDB");
const Product = require("../models/product");
const User = require("../models/user");
const Review = require("../models/review");

const DEMO_EMAILS = [
  "khadidja@berrystudio.example",
  "sara@example.com",
  "lina@example.com",
  "ahmed@example.com",
];
const ADMIN_EMAIL = "khadidja.khaoila.hassani@gmail.com";

async function seed() {
  await connectDB();

  const products = await Product.deleteMany({ id: { $gte: 1, $lte: 8 }, custom: { $ne: true } });
  console.log(`Removed ${products.deletedCount} demo products`);

  const reviews = await Review.deleteMany({ productId: { $gte: 1, $lte: 8 } });
  console.log(`Removed ${reviews.deletedCount} demo reviews`);

  const users = await User.deleteMany({ email: { $in: DEMO_EMAILS } });
  console.log(`Removed ${users.deletedCount} demo users`);

  await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      email: ADMIN_EMAIL,
      name: "Khadidja Khaoila Hassani",
      role: "Admin",
      google: true,
      password: "",
      notif: true,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
  console.log(`Admin: ${ADMIN_EMAIL}`);

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
