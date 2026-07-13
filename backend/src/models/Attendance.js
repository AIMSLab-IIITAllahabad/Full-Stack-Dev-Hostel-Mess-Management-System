const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
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

    mealType: {
      type: String,
      enum: ["BREAKFAST", "LUNCH", "DINNER"],
      required: true,
    },

    hostel: {
      type: String,
      required: true,
    },

    // Cosine similarity score of the face match (0 to 1)
    matchConfidence: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// One attendance record per student per meal per day
attendanceSchema.index(
  { studentId: 1, date: 1, mealType: 1 },
  { unique: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);