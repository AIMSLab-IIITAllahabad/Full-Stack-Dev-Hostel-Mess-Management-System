// One-time script to create the first ADMIN account.
// Usage:  node src/scripts/seedAdmin.js
// Reads admin details from environment variables (in .env):
//   ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_ROLL_NUMBER

require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const seedAdmin = async () => {
  try {
    const {
      MONGODB_URI,
      ADMIN_NAME,
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      ADMIN_ROLL_NUMBER,
    } = process.env;

    if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_ROLL_NUMBER) {
      console.error(
        "Missing env vars. Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_ROLL_NUMBER in .env"
      );
      process.exit(1);
    }

    if (ADMIN_PASSWORD.length < 6) {
      console.error("ADMIN_PASSWORD must be at least 6 characters");
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const existing = await User.findOne({
      $or: [{ email: ADMIN_EMAIL }, { rollNumber: ADMIN_ROLL_NUMBER }],
    });

    if (existing) {
      if (existing.role !== "ADMIN") {
        existing.role = "ADMIN";
        await existing.save();
        console.log(`Existing user ${existing.email} promoted to ADMIN`);
      } else {
        console.log(`Admin ${existing.email} already exists — nothing to do`);
      }
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const admin = await User.create({
      name: ADMIN_NAME,
      rollNumber: ADMIN_ROLL_NUMBER,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "ADMIN",
      // Placeholder values for student-specific required fields
      hostel: "N/A",
      roomNumber: "N/A",
      homeHostel: "N/A",
    });

    console.log(`Admin created: ${admin.email} (${admin.rollNumber})`);
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  }
};

seedAdmin();