const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    rollNumber: {
      type: String,
      required: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    hostel: {
      type: String,
      required: true,
    },

    roomNumber: {
      type: String,
      required: true,
    },

    phoneNumber: {
      type: String,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["STUDENT", "MANAGER", "ADMIN"],
      default: "STUDENT",
    },

    homeHostel: {
      type: String,
      required: true,
    },

    // Face recognition: 192-float embedding from MobileFaceNet (on-device).
    // No face images are ever stored — only this numeric fingerprint.
    faceEmbedding: {
      type: [Number],
      default: undefined,
      select: false, // never returned in queries unless explicitly asked
    },

    faceEnrolled: {
      type: Boolean,
      default: false,
    },
    walletBalance: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);