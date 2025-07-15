const bookingModel = require('../models/bookingModel');

const fetchBookings = (req, res) => {
  const userId = req.user?.id || req.body.userId; // Assuming JWT middleware or fallback
  const userType = req.user?.type || req.body.userType;
  const assigned_team = req.user?.assigned_team || req.body.assigned_team;
  const filters = req.body.filters || {};

  // Validate required fields
  if (!userId || !userType) {
    return res.status(400).json({
      status: false,
      message: "Missing userId or userType",
    });
  }

  bookingModel.getBookings(userId, userType, assigned_team, filters, (err, bookings) => {
    if (err) {
      console.error("Booking Fetch Error:", err);
      return res.status(500).json({
        status: false,
        message: "Error fetching bookings",
        error: err.message,
      });
    }

    res.status(200).json({
      status: true,
      message: "Bookings fetched successfully",
      data: bookings,
    });
  });
};

const getBookingHistory = (req, res) => {
  const bookingId = req.params.id;

  if (!bookingId) {
    return res.status(400).json({ status: false, message: "Missing booking ID" });
  }

  bookingModel.getBookingHistory(bookingId, (err, results) => {
    if (err) {
      console.error("Error fetching booking history:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    return res.status(200).json({ status: true, data: results });
  });
};
module.exports={
    fetchBookings,getBookingHistory
}