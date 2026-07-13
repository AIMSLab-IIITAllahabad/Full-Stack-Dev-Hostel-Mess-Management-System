const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect Routes
const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select("-password");

      // Token may be valid but user deleted from DB
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Not authorized",
        });
      }

      req.user = user;
      return next();
    }

    return res.status(401).json({
      success: false,
      message: "Not authorized",
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// Manager/Admin Only
const managerOnly = (req, res, next) => {
  if (req.user.role === "MANAGER" || req.user.role === "ADMIN") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Access Denied",
  });
};

// Admin Only (stricter than managerOnly — managers can't manage roles)
const adminOnly = (req, res, next) => {
  if (req.user.role === "ADMIN") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Access Denied",
  });
};

module.exports = {
  protect,
  managerOnly,
  adminOnly,
};