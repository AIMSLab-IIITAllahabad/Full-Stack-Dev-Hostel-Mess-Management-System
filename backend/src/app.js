const express = require("express");
const cors = require("cors");

const app = express();

const authRoutes = require("./routes/authRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const rebateRoutes = require("./routes/rebateRoutes");
const managerRoutes = require("./routes/managerRoutes");
const profileRoutes = require("./routes/profileRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const hostelRoutes = require("./routes/hostelRoutes");
const adminRoutes = require("./routes/adminRoutes");
const faceRoutes = require("./routes/faceRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const walletRoutes = require("./routes/walletRoutes");
// Middleware
app.use(cors());
app.use(express.json());

// Test Route
app.get("/", (req, res) => {
  res.send("OmniMess API  is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/rebates", rebateRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/hostels", hostelRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/face", faceRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/wallet", walletRoutes);
// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON in request body",
    });
  }

  res.status(500).json({
    success: false,
    message: "Server Error",
  });
});

module.exports = app;