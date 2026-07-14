const mongoose = require("mongoose");

const rebateSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    amount: {
      type: Number,
      default: 96,
    },

    status: {
      type: String,
      enum: ["APPROVED", "CANCELLED"],
      default: "APPROVED",
    },

    // Amount charged to the wallet when this rebate was created
    // (flat Rs 54). Refunded in full on cancellation. Settlement
    // SKIPS days that have this set — that's what prevents the
    // double charge.
    prepaidAmount: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One rebate per student per date
rebateSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Rebate", rebateSchema);