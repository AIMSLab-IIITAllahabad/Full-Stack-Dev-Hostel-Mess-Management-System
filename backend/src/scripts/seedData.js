// Wipes ALL data and seeds a rich demo world:
//   - 5 hostels
//   - 1 admin (from .env)
//   - 50 students, 10 per hostel (2023BCS001 ... 2023BCS050)
//     password for ALL: "password123"
//
// Within each hostel's 10 students (by position):
//   #1-5  : eating at their HOME hostel (sub covers today)
//   #6-7  : eating at a GUEST hostel (the next hostel, cyclically)
//   #8    : home sub + APPROVED REBATE FOR TODAY  (kiosk denial demo)
//   #9    : home sub + APPROVED REBATE FOR TOMORROW
//   #10   : NOT subscribed (for live subscribe demos)
//
// Rebates are properly PREPAID (flat Rs 54): wallet reduced + txn created,
// so all ledgers balance. A few breakfast attendance records exist too.
//
// Usage:  node src/scripts/seedData.js
// WARNING: deletes everything incl. face enrollments — re-run enroll.py.

require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Hostel = require("../models/Hostel");
const Subscription = require("../models/Subscription");
const Rebate = require("../models/Rebate");
const Attendance = require("../models/Attendance");
const Transaction = require("../models/Transaction");

const HOSTELS = [
  { name: "Hostel A", capacity: 200 },
  { name: "Hostel B", capacity: 180 },
  { name: "Hostel C", capacity: 150 },
  { name: "Hostel D", capacity: 220 },
  { name: "Hostel E", capacity: 170 },
];

const PER_HOSTEL = 10;
const START_WALLET = 5000;

const REBATE_DAY_PRICE = 54;

const FIRST_NAMES = [
  "Kritika", "Vivaan", "Aditya", "Ananya", "Diya",
  "Arjun", "Sai", "Ishaan", "Saanvi", "Myra",
  "Rohan", "Kabir", "Anika", "Navya", "Kiara",
  "Krishna", "Reyansh", "Riya", "Tanvi", "Ishita",
  "Rashika", "Kritika", "Meera", "Pari", "Aadhya",
];

const LAST_NAMES = [
  "Yadav","Sharma", "Verma", "Gupta",  "Singh",
  "Patel", "Reddy", "Nair", "Iyer", "Das",
  "Bose", "Mishra", "Pandey", "Joshi", "Kulkarni",
];

const startOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};

const daysFromToday = (n) => {
  const d = startOfToday();
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

const fmt = (d) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    await Promise.all([
      User.deleteMany({}),
      Hostel.deleteMany({}),
      Subscription.deleteMany({}),
      Rebate.deleteMany({}),
      Attendance.deleteMany({}),
      Transaction.deleteMany({}),
    ]);
    console.log("All collections wiped");

    const hostels = await Hostel.insertMany(HOSTELS);
    console.log(`Created ${hostels.length} hostels`);

    // ---- ADMIN ----
    const adminPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || "admin123",
      10
    );

    await User.create({
      name: process.env.ADMIN_NAME || "Admin",
      rollNumber: process.env.ADMIN_ROLL_NUMBER || "ADMIN001",
      email: process.env.ADMIN_EMAIL || "admin@omnimess.com",
      password: adminPassword,
      role: "ADMIN",
      hostel: "N/A",
      roomNumber: "N/A",
      homeHostel: "N/A",
    });
    console.log("Admin created");

    // ---- 50 STUDENTS ----
    const studentPassword = await bcrypt.hash("password123", 10);
    const studentDocs = [];
    let roll = 1;

    for (const hostel of HOSTELS) {
      for (let pos = 0; pos < PER_HOSTEL; pos++) {
        const idx = roll - 1;
        const first = FIRST_NAMES[idx % FIRST_NAMES.length];
        const last = LAST_NAMES[(idx * 2) % LAST_NAMES.length];

        // Position 8 in each hostel (index 7) prepays today's rebate,
        // position 9 (index 8) prepays tomorrow's — reflect in wallet
        const prepaysRebate = pos === 7 || pos === 8;

        studentDocs.push({
          name: `${first} ${last}`,
          rollNumber: `2023BCS${String(roll).padStart(3, "0")}`,
          email: `${first.toLowerCase()}.${last.toLowerCase()}${roll}@college.edu`,
          password: studentPassword,
          hostel: hostel.name,
          homeHostel: hostel.name,
          roomNumber: `${hostel.name.slice(-1)}-${101 + pos}`,
          phoneNumber: `9${String(700000000 + roll * 11111).slice(0, 9)}`,
          role: "STUDENT",
          walletBalance: prepaysRebate
            ? START_WALLET - REBATE_DAY_PRICE
            : START_WALLET,
        });

        roll++;
      }
    }

    const students = await User.insertMany(studentDocs);
    console.log(`Created ${students.length} students (10 per hostel)`);

    // ---- SUBSCRIPTIONS / REBATES / ATTENDANCE / TRANSACTIONS ----
    const subs = [];
    const rebates = [];
    const attendance = [];
    const txns = [];

    for (let h = 0; h < HOSTELS.length; h++) {
      const home = HOSTELS[h].name;
      const guest = HOSTELS[(h + 1) % HOSTELS.length].name; // next, cyclic

      for (let pos = 0; pos < PER_HOSTEL; pos++) {
        const student = students[h * PER_HOSTEL + pos];

        // #10 (pos 9): unsubscribed
        if (pos === 9) continue;

        // #6-7 (pos 5,6): guest hostel; everyone else: home
        const eatingAt = pos === 5 || pos === 6 ? guest : home;

        subs.push({
          studentId: student._id,
          homeHostel: home,
          selectedHostel: eatingAt,
          startDate: startOfToday(),
          endDate: daysFromToday(14),
          status: "ACTIVE",
        });

        // #8 (pos 7): rebate TODAY  |  #9 (pos 8): rebate TOMORROW
        if (pos === 7 || pos === 8) {
          const rebateDate = pos === 7 ? startOfToday() : daysFromToday(1);

          rebates.push({
            studentId: student._id,
            date: rebateDate,
            status: "APPROVED",
            prepaidAmount: REBATE_DAY_PRICE,
          });

          txns.push({
            studentId: student._id,
            type: "REBATE_DAY",
            amount: -REBATE_DAY_PRICE,
            description: `${fmt(rebateDate)} rebate day at ${eatingAt} prepaid (flat Rs ${REBATE_DAY_PRICE})`,
          });
        }

        // Breakfast already scanned today for pos 0,1 (home) and 5 (guest)
        if (pos === 0 || pos === 1 || pos === 5) {
          attendance.push({
            studentId: student._id,
            date: startOfToday(),
            mealType: "BREAKFAST",
            hostel: eatingAt,
            matchConfidence: 0.6 + (pos + h) * 0.03,
          });
        }
      }
    }

    await Subscription.insertMany(subs);
    await Rebate.insertMany(rebates);
    await Attendance.insertMany(attendance);
    await Transaction.insertMany(txns);

    console.log(`Created ${subs.length} subscriptions (7 home + 2 guest per hostel)`);
    console.log(`Created ${rebates.length} rebates (1 today + 1 tomorrow per hostel, prepaid)`);
    console.log(`Created ${attendance.length} breakfast attendance records for today`);

    console.log("\n=== SEED COMPLETE ===");
    console.log("Admin:    ADMIN001 / (your .env ADMIN_PASSWORD)");
    console.log("Students: 2023BCS001-050 / password123 | wallet Rs 5000");
    console.log("Per hostel (positions within its 10 rolls):");
    console.log("  #1-5 home eaters | #6-7 guest eaters (next hostel)");
    console.log("  #8 REBATE TODAY (kiosk denies!) | #9 rebate tomorrow | #10 unsubscribed");
    console.log("Hostel A: 001-010 | B: 011-020 | C: 021-030 | D: 031-040 | E: 041-050");
    console.log("NOTE: face enrollments wiped — re-run enroll.py");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seed();