const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');


router.post('/fetchBooking', bookingController.fetchBookings);
router.get('/history/:id', bookingController.getBookingHistory);
router.get('/getPresaleClientDetails/:client_id', bookingController.getPresaleClientDetails);
router.get('/getPostsaleClientDetails/:client_id', bookingController.getPostsaleClientDetails);
router.get('/getProjectMilestones/:projectId', bookingController.getProjectMilestones);






module.exports = router;
