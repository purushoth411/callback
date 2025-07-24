const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');


router.post('/fetchBooking', bookingController.fetchBookings);
router.get('/history/:id', bookingController.getBookingHistory);
router.get('/getPresaleClientDetails/:client_id', bookingController.getPresaleClientDetails);
router.get('/getPostsaleClientDetails/:client_id', bookingController.getPostsaleClientDetails);
router.get('/getProjectMilestones/:projectId', bookingController.getProjectMilestones);
router.post('/checkCallrecording', bookingController.checkCallrecording);
router.post("/checkConsultantWebsiteCondition", bookingController.checkConsultantWebsiteCondition);
router.post("/checkConsultantTeamCondition", bookingController.checkConsultantTeamCondition);
router.post("/checkPresalesCall", bookingController.checkPresalesCall);
router.post("/addBooking", bookingController.insertCallRequest);






module.exports = router;
