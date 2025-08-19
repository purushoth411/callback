const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });



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
router.post('/checkPostsaleCompletedCalls', bookingController.checkPostsaleCompletedCalls);
router.post('/saveCallScheduling', bookingController.saveCallScheduling);
router.post('/updateCallScheduling', bookingController.updateCallScheduling);
router.post("/fetchBookingById", bookingController.fetchBookingById);
router.post("/deleteBookingById", bookingController.deleteBookingById);
router.post("/setAsConverted", bookingController.setAsConverted);
router.post("/updateStatusByCrm", bookingController.updateStatusByCrm);
router.get("/getBookingData", bookingController.getBookingDataNew);
router.post("/markAsConfirmByClient", bookingController.markAsConfirmByClient);
router.post("/reassignComment", bookingController.reassignComment);
router.get("/getExternalCallByBookingId", bookingController.getExternalCallByBookingId);
router.post("/rescheduleOtherBookings", bookingController.rescheduleOtherBookings);
router.post("/reassignToConsultant", bookingController.reassignToConsultant);
router.post(
  "/updateConsultationStatus",
  upload.single("booking_file"), 
  bookingController.updateConsultationStatus
);
router.get("/getExternalCallCount", bookingController.getExternalCallCount);
router.get("/statusHistory", bookingController.getBookingStatusHistory);
router.get("/getAllClientBookingData", bookingController.getAllClientBookingData);
router.post("/assignExternalCall", bookingController.assignExternalCall);
router.post("/checkCompletedCall", bookingController.checkCompletedCall);
router.post("/updateReassignCallStatus", bookingController.updateReassignCallStatus);
router.post("/updateExternalConsultationStatus", bookingController.updateExternalConsultationStatus);
router.post("/submitCallCompletionComment", bookingController.submitCallCompletionComment);
router.post("/fetchSummaryBookings", bookingController.fetchSummaryBookings);
router.post("/updateSubjectArea", bookingController.updateSubjectArea);
router.get("/getConsultantTeamBookings", bookingController.getConsultantTeamBookings);






module.exports = router;
