const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  createRebate,
  cancelRebate,
  getRebateHistory,
} = require("../controllers/rebateController");

router.post("/", protect, createRebate);

router.get("/history", protect, getRebateHistory);

// NEW: cancel a rebate (owner only, future/today dates only)
router.put("/:id/cancel", protect, cancelRebate);

module.exports = router;