// Daily wallet settlement + automatic home-hostel renewal.
//
// CHARGES (per day, not upfront):
//   - home-hostel day:  Rs 150
//   - guest-hostel day: Rs 200
//   - rebate day: FLAT Rs 54 (prepaid at creation, refunded on cancel)
//
// AUTO-RENEWAL: a student may choose any mess until 10 PM on their
// plan's last day. If they don't, a new 15-day HOME-hostel plan is
// created automatically starting the next day (provided their wallet
// can cover it). Triggered lazily whenever settlement runs.

const Subscription = require("../models/Subscription");
const Rebate = require("../models/Rebate");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { todayUTC } = require("./dates");

const HOME_RATE = 150;
const GUEST_RATE = 200;
const REBATE_DAY_PRICE = 54; // flat, for both home and guest plans
const PLAN_DAYS = 15;
const CUTOFF_HOUR = 22; // 10 PM

const DAY_MS = 24 * 60 * 60 * 1000;

const fmt = (d) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;

// If the student's latest plan has lapsed (or ends today and it's past
// 10 PM), chain new home-hostel plans until coverage reaches today.
const autoRenewIfNeeded = async (studentId) => {
  const user = await User.findById(studentId);

  if (
    !user ||
    user.role !== "STUDENT" ||
    !user.homeHostel ||
    user.homeHostel === "N/A"
  ) {
    return;
  }

  const today = todayUTC();

  // Safety cap: at most 5 chained renewals per pass
  for (let i = 0; i < 5; i++) {
    const latest = await Subscription.findOne({ studentId }).sort({
      endDate: -1,
    });

    // Never subscribed at all -> nothing to renew
    if (!latest) return;

    const ended = latest.endDate < today;
    const endsTodayPastCutoff =
      latest.endDate.getTime() === today.getTime() &&
      new Date().getHours() >= CUTOFF_HOUR;

    if (!ended && !endsTodayPastCutoff) return;

    // Tidy up the lapsed plan's status
    if (ended && latest.status === "ACTIVE") {
      latest.status = "EXPIRED";
      await latest.save();
    }

    // Wallet must cover a full home plan, otherwise no auto-renewal
    // (student must top up and subscribe manually)
    const fresh = await User.findById(studentId).select("walletBalance");

    if ((fresh.walletBalance || 0) < HOME_RATE * PLAN_DAYS) return;

    const startDate = new Date(latest.endDate.getTime() + DAY_MS);
    const endDate = new Date(startDate.getTime() + (PLAN_DAYS - 1) * DAY_MS);

    await Subscription.create({
      studentId,
      homeHostel: user.homeHostel,
      selectedHostel: user.homeHostel, // AUTO: defaults to home hostel
      startDate,
      endDate,
      autoRenewed: true,
    });
  }
};

const settleStudent = async (studentId) => {
  // First make sure coverage is continuous (auto home renewal if lapsed)
  await autoRenewIfNeeded(studentId);

  const today = todayUTC();

  // Any subscription that has started (active OR since expired)
  const subs = await Subscription.find({
    studentId,
    startDate: { $lte: today },
  });

  let totalCharge = 0;
  const txns = [];

  for (const sub of subs) {
    const lastDay = sub.endDate < today ? sub.endDate : today;

    let cursor = sub.settledUpTo
      ? new Date(sub.settledUpTo.getTime() + DAY_MS)
      : new Date(sub.startDate.getTime());

    if (cursor > lastDay) continue;

    const rate =
      sub.selectedHostel === sub.homeHostel ? HOME_RATE : GUEST_RATE;

    while (cursor <= lastDay) {
      const rebate = await Rebate.findOne({
        studentId,
        date: cursor,
        status: "APPROVED",
      });

      if (rebate && rebate.prepaidAmount != null) {
        // Already paid (flat Rs 54) when the rebate was created — skip.
        cursor = new Date(cursor.getTime() + DAY_MS);
        continue;
      }

      const charge = rebate ? REBATE_DAY_PRICE : rate;
      totalCharge += charge;

      txns.push({
        studentId,
        type: rebate ? "REBATE_DAY" : "MEAL_CHARGE",
        amount: -charge,
        description: rebate
          ? `${fmt(cursor)} rebate day at ${sub.selectedHostel} (flat Rs ${REBATE_DAY_PRICE})`
          : `${fmt(cursor)} meal charge at ${sub.selectedHostel}`,
      });

      cursor = new Date(cursor.getTime() + DAY_MS);
    }

    sub.settledUpTo = new Date(lastDay.getTime());
    await sub.save();
  }

  if (totalCharge > 0) {
    await User.findByIdAndUpdate(studentId, {
      $inc: { walletBalance: -totalCharge },
    });
    await Transaction.insertMany(txns);
  }
};

module.exports = { settleStudent, HOME_RATE, GUEST_RATE, REBATE_DAY_PRICE };