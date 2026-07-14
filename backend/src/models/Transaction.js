const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["TOPUP", "MEAL_CHARGE", "REBATE_DAY", "REBATE_REFUND"],
      required: true,
    },

    // Positive = money into wallet, negative = money out
    amount: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);