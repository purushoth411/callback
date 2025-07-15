const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');


router.post('/fetchBooking', bookingController.fetchBookings);
router.get('/history/:id', bookingController.getBookingHistory);





module.exports = router;
