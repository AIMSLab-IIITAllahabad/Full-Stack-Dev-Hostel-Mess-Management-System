const express = require("express");

const router = express.Router();

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  updateUserRole,
  getUsers,
} = require("../controllers/adminController");

router.get("/users", protect, adminOnly, getUsers);

router.put("/users/:id/role", protect, adminOnly, updateUserRole);

module.exports = router;