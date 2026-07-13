const Subscription = require("../models/Subscription");
const Rebate = require("../models/Rebate");
const User = require("../models/User");
const { todayUTC } = require("../utils/dates");
const { settleStudent } = require("../utils/settlement");

const getDashboard = async (req, res) => {
  try {
    // Charge any un-charged subscribed days first (students only)
    if (req.user.role === "STUDENT") {
      await settleStudent(req.user._id);
    }

    // Re-read the user so walletBalance reflects the settlement
    const freshUser = await User.findById(req.user._id).select("-password");

    const subscription = await Subscription.findOne({
      studentId: req.user._id,
      status: "ACTIVE",
      endDate: { $gte: todayUTC() },
    }).sort({ endDate: 1 });

    const rebateCount = await Rebate.countDocuments({
      studentId: req.user._id,
    });

    res.status(200).json({
      success: true,

      user: {
        id: req.user._id,
        name: req.user.name,
        rollNumber: req.user.rollNumber,
        email: req.user.email,
        phoneNumber: req.user.phoneNumber,
        roomNumber: req.user.roomNumber,
        homeHostel: req.user.homeHostel,
        role: req.user.role,
        walletBalance: (freshUser && freshUser.walletBalance) || 0,
      },

      subscription,

      rebateCount,
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
  getDashboard,
};