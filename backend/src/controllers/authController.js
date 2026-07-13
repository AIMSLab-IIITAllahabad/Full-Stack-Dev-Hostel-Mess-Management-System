const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Register User
const registerUser = async (req, res) => {
  try {
    const {
      name,
      rollNumber,
      email,
      password,
      hostel,
      roomNumber,
      phoneNumber,
      homeHostel,
    } = req.body;

    if (
      !name ||
      !rollNumber ||
      !email ||
      !password ||
      !hostel ||
      !roomNumber ||
      !homeHostel
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Check existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { rollNumber }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      rollNumber,
      email,
      password: hashedPassword,
      hostel,
      roomNumber,
      phoneNumber,
      homeHostel,
    });

    res.status(201).json({
      success: true,
      message: "Registration Successful",
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        email: user.email,
        homeHostel: user.homeHostel,
        role: user.role,
      },
    });
  } catch (error) {
    // FIX: log the real error server-side, return a generic message
    // so internal details (Mongo/validation errors) don't leak to clients
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Login User
const loginUser = async (req, res) => {
  try {
    const { rollNumber, password } = req.body;

    if (!rollNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "Roll number and password are required",
      });
    }

    const user = await User.findOne({ rollNumber });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    res.status(200).json({
      success: true,
      message: "Login Successful",
      token: generateToken(user._id),

      user: {
        id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        email: user.email,
        hostel: user.hostel,
        roomNumber: user.roomNumber,
        phoneNumber: user.phoneNumber,
        homeHostel: user.homeHostel,
        role: user.role,
      },
    });
  } catch (error) {
    // FIX: generic message, real error logged server-side
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
