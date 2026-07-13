const Rebate = require("../models/Rebate");
const Subscription = require("../models/Subscription");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { normalizeDateUTC, todayUTC, daysFromTodayUTC } = require("../utils/dates");
const { REBATE_DAY_PRICE } = require("../utils/settlement");

// Rebates must be requested at least one day in advance.
// Requests for tomorrow close at this hour (server local time) today.
const REBATE_CUTOFF_HOUR = 22; // 10 PM

const fmtDay = (d) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;

// Mark Absence / Create Rebate
const createRebate = async (req, res) => {
  try {
    const { date } = req.body;
    const studentId = req.user._id;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    const rebateDate = normalizeDateUTC(date);

    if (!rebateDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid date",
      });
    }

    const tomorrow = daysFromTodayUTC(1);

    // ADVANCE-NOTICE RULE: no same-day (or past) rebates
    if (rebateDate < tomorrow) {
      return res.status(400).json({
        success: false,
        message: "Rebates must be requested at least one day in advance",
      });
    }

    // 10 PM CUTOFF: a rebate for tomorrow must be requested before
    // 10 PM today, so the mess can plan tomorrow's meals tonight.
    if (
      rebateDate.getTime() === tomorrow.getTime() &&
      new Date().getHours() >= REBATE_CUTOFF_HOUR
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Requests for tomorrow close at 10 PM — please choose a later date",
      });
    }

    // Student must have an active subscription covering that date
    const subscription = await Subscription.findOne({
      studentId,
      status: "ACTIVE",
      startDate: { $lte: rebateDate },
      endDate: { $gte: rebateDate },
    });

    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: "No active subscription covering this date",
      });
    }

    // MISUSE PREVENTION (reverse direction):
    // can't claim a rebate for a date you already ate on
    const ateToday = await Attendance.findOne({
      studentId,
      date: rebateDate,
    });

    if (ateToday) {
      return res.status(400).json({
        success: false,
        message:
          "Attendance already recorded for this date — rebate not allowed",
      });
    }

    const existingRebate = await Rebate.findOne({
      studentId,
      date: rebateDate,
    });

    // PREPAY the rebate day at the FLAT rebate-day price (Rs 54 for
    // everyone, home or guest). The daily settlement skips this day
    // since it's already paid. Cancelling refunds this exact amount.
    const prepaidAmount = REBATE_DAY_PRICE;

    const payer = await User.findById(studentId).select("walletBalance");

    if ((payer.walletBalance || 0) < prepaidAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance — the rebate day is prepaid at ₹${prepaidAmount}. Please top up.`,
      });
    }

    if (existingRebate) {
      // A CANCELLED rebate for this date can be re-approved
      if (existingRebate.status === "CANCELLED") {
        existingRebate.status = "APPROVED";
        existingRebate.prepaidAmount = prepaidAmount;
        await existingRebate.save();

        await User.findByIdAndUpdate(studentId, {
          $inc: { walletBalance: -prepaidAmount },
        });
        await Transaction.create({
          studentId,
          type: "REBATE_DAY",
          amount: -prepaidAmount,
          description: `${fmtDay(rebateDate)} rebate day at ${subscription.selectedHostel} prepaid (flat Rs ${REBATE_DAY_PRICE})`,
        });

        return res.status(200).json({
          success: true,
          message: `Rebate re-approved — ₹${prepaidAmount} charged now for that day`,
          rebate: existingRebate,
        });
      }

      return res.status(400).json({
        success: false,
        message: "Rebate already requested for this date",
      });
    }

    const rebate = await Rebate.create({
      studentId,
      date: rebateDate,
      prepaidAmount,
    });

    await User.findByIdAndUpdate(studentId, {
      $inc: { walletBalance: -prepaidAmount },
    });
    await Transaction.create({
      studentId,
      type: "REBATE_DAY",
      amount: -prepaidAmount,
      description: `${fmtDay(rebateDate)} rebate day at ${subscription.selectedHostel} prepaid (flat Rs ${REBATE_DAY_PRICE})`,
    });

    res.status(201).json({
      success: true,
      message: `Rebate created — ₹${prepaidAmount} charged now for that day`,
      rebate,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Rebate already requested for this date",
      });
    }

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Cancel Rebate (student changes their mind and will eat that day)
const cancelRebate = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user._id;

    const rebate = await Rebate.findById(id);

    // Only the owner can cancel their own rebate
    if (!rebate || rebate.studentId.toString() !== studentId.toString()) {
      return res.status(404).json({
        success: false,
        message: "Rebate not found",
      });
    }

    if (rebate.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Rebate is already cancelled",
      });
    }

    // Cancellation follows the same advance-notice rule: once the
    // mess has planned (10 PM the night before), the rebate is locked.
    const tomorrow = daysFromTodayUTC(1);

    if (rebate.date < tomorrow) {
      return res.status(400).json({
        success: false,
        message: "This rebate is locked — the mess has already planned for it",
      });
    }

    if (
      rebate.date.getTime() === tomorrow.getTime() &&
      new Date().getHours() >= REBATE_CUTOFF_HOUR
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Changes for tomorrow close at 10 PM — this rebate is locked",
      });
    }

    rebate.status = "CANCELLED";
    const refund = rebate.prepaidAmount || 0;
    rebate.prepaidAmount = null;
    await rebate.save();

    if (refund > 0) {
      await User.findByIdAndUpdate(studentId, {
        $inc: { walletBalance: refund },
      });
      await Transaction.create({
        studentId,
        type: "REBATE_REFUND",
        amount: refund,
        description: `${fmtDay(rebate.date)} rebate cancelled — prepaid ₹${refund} returned`,
      });
    }

    res.status(200).json({
      success: true,
      message:
        refund > 0
          ? `Rebate cancelled — ₹${refund} returned to your wallet (full meal charge applies that day)`
          : "Rebate cancelled — full meal charge applies for that day",
      rebate,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Get Rebate History
const getRebateHistory = async (req, res) => {
  try {
    const studentId = req.user._id;

    const rebates = await Rebate.find({ studentId }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      rebates,
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
  createRebate,
  cancelRebate,
  getRebateHistory,
};