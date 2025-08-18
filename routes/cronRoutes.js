
const express = require('express');
const router = express.Router();
const cronController = require('../controllers/cronController');

router.post('/cancelAbsentCalls', cronController.consultantAbsentCallCancelled);
router.post('/autoAcceptCall', cronController.autoAcceptCall);

module.exports = router;
