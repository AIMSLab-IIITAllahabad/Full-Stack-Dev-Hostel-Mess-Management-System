const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { settleStudent } = require("../utils/settlement");
// GET /api/wallet — balance + transaction history
const getWallet = async (req, res) => {
  try {
    // Charge any un-charged subscribed days first
    await settleStudent(req.user._id);

    const user = await User.findById(req.user._id).select("walletBalance");

    const transactions = await Transaction.find({
      studentId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      balance: user.walletBalance || 0,
      transactions,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// POST /api/wallet/topup — add money (demo top-up, no payment gateway)
const topUp = async (req, res) => {
  try {
    const { amount } = req.body;

    if (typeof amount !== "number" || amount <= 0 || amount > 100000) {
      return res.status(400).json({
        success: false,
        message: "Amount must be between 1 and 100000",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { walletBalance: amount } },
      { new: true }
    ).select("walletBalance");

    await Transaction.create({
      studentId: req.user._id,
      type: "TOPUP",
      amount,
      description: "Wallet top-up",
    });

    res.status(200).json({
      success: true,
      message: `₹${amount} added to wallet`,
      balance: user.walletBalance,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = { getWallet, topUp };