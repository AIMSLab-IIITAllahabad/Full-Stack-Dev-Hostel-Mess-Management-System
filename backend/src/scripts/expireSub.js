// TEST HELPER: makes a student's latest subscription end YESTERDAY,
// so the auto-renewal logic fires on their next dashboard/wallet open.
// Usage:  node src/scripts/expireSub.js 2023BCS002

require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");
const Subscription = require("../models/Subscription");

const run = async () => {
  const roll = process.argv[2];

  if (!roll) {
    console.error("Usage: node src/scripts/expireSub.js <rollNumber>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ rollNumber: roll });
  if (!user) {
    console.error("User not found");
    process.exit(1);
  }

  const sub = await Subscription.findOne({ studentId: user._id }).sort({
    endDate: -1,
  });
  if (!sub) {
    console.error("No subscription found");
    process.exit(1);
  }

  const now = new Date();
  const yesterday = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  );

  sub.endDate = yesterday;
  // also pretend all its days were already settled, so only the new
  // auto plan generates fresh charges
  sub.settledUpTo = yesterday;
  await sub.save();

  console.log(
    `${roll}'s subscription now ends ${yesterday.toISOString().slice(0, 10)} — open their dashboard to watch auto-renewal fire`
  );
  process.exit(0);
};

run();