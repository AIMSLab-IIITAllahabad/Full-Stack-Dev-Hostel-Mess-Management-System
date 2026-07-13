
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
  },
  {
    timestamps: true,
  }
);

// FIX: safety net against duplicate rebates for the same student + date,
// even if the application-level check is bypassed (e.g. race condition)
rebateSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Rebate", rebateSchema);
