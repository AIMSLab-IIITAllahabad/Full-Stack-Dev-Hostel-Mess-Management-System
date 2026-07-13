const express = require("express");

const router = express.Router();

const {
  protect,
  managerOnly,
} = require("../middleware/authMiddleware");

const {
  getHostels,
  createHostel,
} = require("../controllers/hostelController");

router.get("/", getHostels);

router.post("/", protect, managerOnly, createHostel);

module.exports = router;