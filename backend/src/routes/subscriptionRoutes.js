const express = require("express");

const router = express.Router();

const { protect } =
require("../middleware/authMiddleware");

const {
  createSubscription,
  getCurrentSubscription,
} = require(
  "../controllers/subscriptionController"
);

router.post(
  "/", protect,
  createSubscription
);

router.get(
  "/current", protect,
  getCurrentSubscription
);

module.exports = router;