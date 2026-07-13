const User = require("../models/User");

// Change a user's role (ADMIN only)
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ["STUDENT", "MANAGER", "ADMIN"];

    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be one of STUDENT, MANAGER, ADMIN",
      });
    }

    if (id === req.user._id.toString() && role !== "ADMIN") {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own admin role",
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Role updated to ${role}`,
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// List users (ADMIN only)
const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
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
  updateUserRole,
  getUsers,
};