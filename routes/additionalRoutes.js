// routes/additionalRoutes.js
const express = require('express');
const router = express.Router();
const additionalController = require('../controllers/additionalController');

router.post('/callrequestrc', additionalController.getRcCallBookingRequest);
router.post('/getexternalcalls', additionalController.getExternalCalls);
router.post('/getwritersemail', additionalController.getWritersByProjectSegment);

module.exports = router