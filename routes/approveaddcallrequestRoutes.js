// routes/approveaddcallrequestRoutes.js
const express = require('express');
const router = express.Router();
const approveaddcallrequestController = require('../controllers/approveaddcallrequestController');

router.get('/getAllActiveApproveaddcallrequests', approveaddcallrequestController.getAllActiveApproveaddcallrequests);
router.get('/getAllApproveaddcallrequests', approveaddcallrequestController.getAllApproveaddcallrequests);
router.put('/update-approveaddcallrequest-status/:id', approveaddcallrequestController.updateApproveaddcallrequeststatus);

module.exports = router;
