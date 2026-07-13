const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  enrollFace,
  getFaceStatus,
  deleteFace,
} = require("../controllers/faceController");

router.post("/enroll", protect, enrollFace);

router.get("/status", protect, getFaceStatus);

router.delete("/", protect, deleteFace);

module.exports = router;