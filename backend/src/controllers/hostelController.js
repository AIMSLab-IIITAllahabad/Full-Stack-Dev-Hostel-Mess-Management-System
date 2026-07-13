const Hostel = require("../models/Hostel");
const Subscription = require("../models/Subscription");
const { todayUTC } = require("../utils/dates");

// 30% of each hostel's capacity is reserved for guest students
// (students whose home hostel is a different one).
const GUEST_SEAT_RATIO = 0.3;

// List all hostels with live guest-seat availability
const getHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find().sort({ name: 1 });

    const result = [];

    for (const hostel of hostels) {
      const guestSeatsTotal = Math.floor(hostel.capacity * GUEST_SEAT_RATIO);

      // Guest seats currently taken = active/upcoming subscriptions to this
      // mess from students whose home hostel is different
      const guestSeatsTaken = await Subscription.countDocuments({
        selectedHostel: hostel.name,
        status: "ACTIVE",
        endDate: { $gte: todayUTC() },
        homeHostel: { $ne: hostel.name },
      });

      result.push({
        _id: hostel._id,
        name: hostel.name,
        capacity: hostel.capacity,
        guestSeatsTotal,
        guestSeatsAvailable: Math.max(guestSeatsTotal - guestSeatsTaken, 0),
      });
    }

    res.status(200).json({
      success: true,
      hostels: result,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Add a hostel (manager/admin only)
const createHostel = async (req, res) => {
  try {
    const { name, capacity } = req.body;

    if (!name || !capacity) {
      return res.status(400).json({
        success: false,
        message: "Name and capacity are required",
      });
    }

    if (typeof capacity !== "number" || capacity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Capacity must be a positive number",
      });
    }

    const hostel = await Hostel.create({ name, capacity });

    res.status(201).json({
      success: true,
      message: "Hostel created successfully",
      hostel,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A hostel with this name already exists",
      });
    }

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  getHostels,
  createHostel,
};