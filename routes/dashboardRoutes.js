// routes/helperRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/getAllActiveTeams', dashboardController.getAllActiveTeams);
router.post('/getcall_statistics', dashboardController.getCallStatistics);
router.post('/getparticularstatuscalls', dashboardController.getParticularStatusCallsOfCrm);
router.post('/getconsultantsettings', dashboardController.getConsultantSettingData);

module.exports = router