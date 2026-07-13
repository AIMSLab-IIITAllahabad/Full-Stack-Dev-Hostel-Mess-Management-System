const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Rebate = require("../models/Rebate");
const Attendance = require("../models/Attendance");
const Hostel = require("../models/Hostel");
const { todayUTC, daysFromTodayUTC } = require("../utils/dates");

const GUEST_SEAT_RATIO = 0.3;

// GET /api/manager/report            -> overall report
// GET /api/manager/report?hostel=X   -> detailed report for one hostel's mess
const getManagerReport = async (req, res) => {
  try {
    const { hostel: hostelName } = req.query;

    const today = todayUTC();
    const tomorrow = daysFromTodayUTC(1);

    // ---------- PER-HOSTEL REPORT ----------
    if (hostelName) {
      const hostelDoc = await Hostel.findOne({ name: hostelName });

      if (!hostelDoc) {
        return res.status(404).json({
          success: false,
          message: "Hostel not found",
        });
      }

      // Students who live in this hostel
      const residents = await User.countDocuments({
        role: "STUDENT",
        homeHostel: hostelName,
      });

      // Subscriptions eating at this mess TODAY (already started, not ended)
      const subs = await Subscription.find({
        selectedHostel: hostelName,
        status: "ACTIVE",
        startDate: { $lte: today },
        endDate: { $gte: today },
      }).select("studentId homeHostel");

      const homeSubscribers = subs.filter(
        (s) => s.homeHostel === hostelName
      ).length;
      const guestSubscribers = subs.length - homeSubscribers;

      // Who among them is absent today (approved rebate for today)?
      const subscriberIds = subs.map((s) => s.studentId);

      const todaysRebates = await Rebate.find({
        studentId: { $in: subscriberIds },
        status: "APPROVED",
        date: { $gte: today, $lt: tomorrow },
      }).select("studentId");

      const absentSet = new Set(
        todaysRebates.map((r) => r.studentId.toString())
      );

      let absentHome = 0;
      let absentGuest = 0;

      for (const sub of subs) {
        if (absentSet.has(sub.studentId.toString())) {
          if (sub.homeHostel === hostelName) absentHome++;
          else absentGuest++;
        }
      }

      const homePresent = homeSubscribers - absentHome;
      const guestPresent = guestSubscribers - absentGuest;

      const mealsServedToday = await Attendance.countDocuments({
        hostel: hostelName,
        date: { $gte: today, $lt: tomorrow },
      });

      const guestSeatsTotal = Math.floor(
        hostelDoc.capacity * GUEST_SEAT_RATIO
      );

      // Guest seats count active AND upcoming guest subscriptions
      const guestSeatsTaken = await Subscription.countDocuments({
        selectedHostel: hostelName,
        status: "ACTIVE",
        endDate: { $gte: today },
        homeHostel: { $ne: hostelName },
      });

      return res.status(200).json({
        success: true,
        report: {
          hostel: hostelName,
          capacity: hostelDoc.capacity,
          residents,
          subscribers: subs.length,
          homeSubscribers,
          guestSubscribers,
          absenteesToday: absentSet.size,
          homePresent,
          guestPresent,
          mealsToPrepare: Math.max(homePresent + guestPresent, 0),
          mealsServedToday,
          guestSeatsTotal,
          guestSeatsAvailable: Math.max(guestSeatsTotal - guestSeatsTaken, 0),
        },
      });
    }

    // ---------- OVERALL REPORT ----------
    const totalStudents = await User.countDocuments({
      role: "STUDENT",
    });

    // Subscriptions actually covering TODAY
    const activeSubscriptions = await Subscription.countDocuments({
      status: "ACTIVE",
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    const absentees = await Rebate.countDocuments({
      status: "APPROVED",
      date: { $gte: today, $lt: tomorrow },
    });

    const mealsToPrepare = Math.max(activeSubscriptions - absentees, 0);

    const mealsServedToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
    });

    res.status(200).json({
      success: true,
      report: {
        totalStudents,
        activeSubscriptions,
        absentees,
        mealsToPrepare,
        mealsServedToday,
      },
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
  getManagerReport,
};