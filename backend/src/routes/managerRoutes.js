const express = require("express");

const router = express.Router();

const {
  protect,
  managerOnly,
} = require("../middleware/authMiddleware");

const {
  getManagerReport,
} = require("../controllers/managerController");

// FIX: was accessible to any logged-in student; now manager/admin only
router.get("/report", protect, managerOnly, getManagerReport);

module.exports = router;
