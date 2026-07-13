const Subscription = require("../models/Subscription");
const User = require("../models/User");
const Hostel = require("../models/Hostel");
const { todayUTC, daysFromTodayUTC } = require("../utils/dates");
const {
  settleStudent,
  HOME_RATE,
  GUEST_RATE,
  REBATE_DAY_PRICE,
} = require("../utils/settlement");

const PLAN_DAYS = 15;

// Renewal on the last day of a subscription closes at this hour,
// so the mess can plan tomorrow's meals tonight.
const SUBSCRIPTION_CUTOFF_HOUR = 22; // 10 PM

// 30% of capacity is reserved for guest students (must match hostelController)
const GUEST_SEAT_RATIO = 0.3;

// Create Subscription
const createSubscription = async (req, res) => {
  try {
    const { selectedHostel } = req.body;
    const studentId = req.user._id;

    if (!selectedHostel) {
      return res.status(400).json({
        success: false,
        message: "selectedHostel is required",
      });
    }

    const user = await User.findById(studentId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Only students eat at the mess — admins/managers cannot subscribe
    if (user.role !== "STUDENT") {
      return res.status(403).json({
        success: false,
        message: "Only students can subscribe to a mess",
      });
    }

    // selectedHostel must be a real hostel, not free text
    const hostelDoc = await Hostel.findOne({ name: selectedHostel });

    if (!hostelDoc) {
      return res.status(400).json({
        success: false,
        message: "Selected hostel does not exist",
      });
    }

    // Lazily mark any stale ACTIVE-but-expired subscriptions as EXPIRED
    await Subscription.updateMany(
      {
        studentId,
        status: "ACTIVE",
        endDate: { $lt: todayUTC() },
      },
      { status: "EXPIRED" }
    );

    // RENEWAL RULE:
    // - a subscription that ends AFTER today blocks new subscriptions
    // - a subscription that ends TODAY may be renewed, but only
    //   before 10 PM (the new one starts tomorrow -> seamless coverage)
    const currentSub = await Subscription.findOne({
      studentId,
      status: "ACTIVE",
      endDate: { $gte: todayUTC() },
    }).sort({ endDate: -1 });

    if (currentSub) {
      const endsToday =
        currentSub.endDate.getTime() === todayUTC().getTime();

      if (!endsToday) {
        return res.status(400).json({
          success: false,
          message: "Active subscription already exists",
        });
      }

      if (new Date().getHours() >= SUBSCRIPTION_CUTOFF_HOUR) {
        return res.status(400).json({
          success: false,
          message:
            "Renewal for tomorrow closes at 10 PM — you can subscribe again tomorrow",
        });
      }
      // ends today and before 10 PM -> renewal allowed
    }

    // GUEST SEAT RULE: selecting a mess other than your home hostel
    // takes one of its guest seats (30% of capacity)
    if (selectedHostel !== user.homeHostel) {
      const guestSeatsTotal = Math.floor(
        hostelDoc.capacity * GUEST_SEAT_RATIO
      );

      const guestSeatsTaken = await Subscription.countDocuments({
        selectedHostel,
        status: "ACTIVE",
        endDate: { $gte: todayUTC() },
        homeHostel: { $ne: selectedHostel },
      });

      if (guestSeatsTaken >= guestSeatsTotal) {
        return res.status(400).json({
          success: false,
          message: `No guest seats left in ${selectedHostel} (${guestSeatsTotal} total)`,
        });
      }
    }

    // DAILY CHARGING MODEL: nothing is deducted upfront. Each subscribed
    // day is charged to the wallet as it arrives (rebate days flat Rs 54,
    // prepaid at creation). To subscribe, the wallet must hold at least
    // the full plan cost.
    await settleStudent(studentId);

    const freshUser = await User.findById(studentId).select("walletBalance");

    const isHome = selectedHostel === user.homeHostel;
    const dailyRate = isHome ? HOME_RATE : GUEST_RATE;
    const totalCost = dailyRate * PLAN_DAYS;

    if ((freshUser.walletBalance || 0) < totalCost) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance — this plan charges ₹${dailyRate}/day (₹${totalCost} over ${PLAN_DAYS} days), you have ₹${freshUser.walletBalance || 0}. Please top up your wallet.`,
      });
    }

    // Subscription starts TOMORROW and covers 15 days (day 1 = tomorrow).
    const startDate = daysFromTodayUTC(1);
    const endDate = daysFromTodayUTC(15);

    const subscription = await Subscription.create({
      studentId,
      homeHostel: user.homeHostel,
      selectedHostel,
      startDate,
      endDate,
    });

    res.status(201).json({
      success: true,
      message: `Subscription created — ₹${dailyRate} will be charged per day starting tomorrow (rebate days flat ₹${REBATE_DAY_PRICE})`,
      dailyRate,
      subscription,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Get Current Subscription
// (if a renewal exists, returns the one ending soonest = covering now)
const getCurrentSubscription = async (req, res) => {
  try {
    const studentId = req.user._id;

    const subscription = await Subscription.findOne({
      studentId,
      status: "ACTIVE",
      endDate: { $gte: todayUTC() },
    }).sort({ endDate: 1 });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No active subscription found",
      });
    }

    res.status(200).json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  createSubscription,
  getCurrentSubscription,
};