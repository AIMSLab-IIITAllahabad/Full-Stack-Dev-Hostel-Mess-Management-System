const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Subscription = require("../models/Subscription");
const Rebate = require("../models/Rebate");
const Hostel = require("../models/Hostel");
const {
  isValidEmbedding,
  findBestMatch,
  EMBEDDING_LENGTH,
} = require("../utils/faceMatch");
const { todayUTC } = require("../utils/dates");

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER"];

// Mark attendance via face scan (manager's device at the mess gate)
const markAttendance = async (req, res) => {
  try {
    const { embedding, mealType, hostel } = req.body;

    if (!isValidEmbedding(embedding)) {
      return res.status(400).json({
        success: false,
        message: `Embedding must be an array of ${EMBEDDING_LENGTH} numbers`,
      });
    }

    if (!MEAL_TYPES.includes(mealType)) {
      return res.status(400).json({
        success: false,
        message: "mealType must be BREAKFAST, LUNCH or DINNER",
      });
    }

    const hostelExists = await Hostel.findOne({ name: hostel });

    if (!hostelExists) {
      return res.status(400).json({
        success: false,
        message: "Hostel does not exist",
      });
    }

    const candidates = await User.find({
      role: "STUDENT",
      faceEnrolled: true,
    }).select("name rollNumber homeHostel +faceEmbedding");

    const threshold = parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.45;

    const match = findBestMatch(embedding, candidates, threshold);

    if (!match) {
      return res.status(404).json({
        success: false,
        code: "NO_MATCH",
        message: "Face not recognized. Student may not be enrolled.",
      });
    }

    const student = match.user;
    const today = todayUTC();

    const subscription = await Subscription.findOne({
      studentId: student._id,
      status: "ACTIVE",
      selectedHostel: hostel,
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    if (!subscription) {
      return res.status(403).json({
        success: false,
        code: "NO_SUBSCRIPTION",
        message: `${student.name} (${student.rollNumber}) has no active subscription for this mess`,
        student: {
          name: student.name,
          rollNumber: student.rollNumber,
        },
      });
    }

    // REBATE MISUSE PREVENTION:
    // student claimed a rebate for today but showed up to eat
    const rebateToday = await Rebate.findOne({
      studentId: student._id,
      date: today,
      status: "APPROVED",
    });

    if (rebateToday) {
      return res.status(403).json({
        success: false,
        code: "REBATE_CONFLICT",
        message: `${student.name} (${student.rollNumber}) has an approved rebate for today. Entry denied — cancel the rebate first.`,
        student: {
          name: student.name,
          rollNumber: student.rollNumber,
        },
        rebateId: rebateToday._id,
      });
    }

    const existing = await Attendance.findOne({
      studentId: student._id,
      date: today,
      mealType,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        code: "ALREADY_MARKED",
        message: `${student.name} (${student.rollNumber}) already marked for ${mealType} today`,
        student: {
          name: student.name,
          rollNumber: student.rollNumber,
        },
      });
    }

    const attendance = await Attendance.create({
      studentId: student._id,
      date: today,
      mealType,
      hostel,
      matchConfidence: Math.round(match.confidence * 1000) / 1000,
    });

    res.status(201).json({
      success: true,
      message: `Welcome, ${student.name}!`,
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
        homeHostel: student.homeHostel,
      },
      confidence: attendance.matchConfidence,
      attendance,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        code: "ALREADY_MARKED",
        message: "Attendance already marked for this meal",
      });
    }

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Student's own attendance history
const getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({
      studentId: req.user._id,
    }).sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Manager: today's attendance, optionally filtered by hostel and/or meal
const getTodayAttendance = async (req, res) => {
  try {
    const { hostel, mealType } = req.query;

    const filter = { date: todayUTC() };

    if (hostel) filter.hostel = hostel;
    if (mealType) {
      if (!MEAL_TYPES.includes(mealType)) {
        return res.status(400).json({
          success: false,
          message: "mealType must be BREAKFAST, LUNCH or DINNER",
        });
      }
      filter.mealType = mealType;
    }

    const records = await Attendance.find(filter)
      .populate("studentId", "name rollNumber homeHostel roomNumber")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: records.length,
      records,
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
  markAttendance,
  getMyAttendance,
  getTodayAttendance,
};