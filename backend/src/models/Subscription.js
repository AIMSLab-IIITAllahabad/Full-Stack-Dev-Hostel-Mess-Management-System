const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    homeHostel: {
      type: String,
      required: true,
    },

    selectedHostel: {
      type: String,
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRED"],
      default: "ACTIVE",
    },
    // Last day (UTC midnight) whose meal charge has been settled
    settledUpTo: {
      type: Date,
      default: null,
    },
    // True when this plan was created automatically because the student
    // didn't choose a mess by 10 PM on their previous plan's last day
    autoRenewed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);