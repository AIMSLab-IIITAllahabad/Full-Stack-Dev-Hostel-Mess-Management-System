const express = require("express");

const router = express.Router();

const {
  protect,
  managerOnly,
} = require("../middleware/authMiddleware");

const {
  markAttendance,
  getMyAttendance,
  getTodayAttendance,
} = require("../controllers/attendanceController");

router.post("/mark", protect, managerOnly, markAttendance);

router.get("/my", protect, getMyAttendance);

router.get("/today", protect, managerOnly, getTodayAttendance);

module.exports = router;