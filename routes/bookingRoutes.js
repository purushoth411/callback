const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9.]/g, "");
    cb(null, uniqueName);
  }
});
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
router.post("/updateConsultationStatus",upload.any(), bookingController.updateConsultationStatus);
router.get("/getExternalCallCount", bookingController.getExternalCallCount);






module.exports = router;
