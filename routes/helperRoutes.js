// routes/helperRoutes.js
const express = require('express');
const router = express.Router();
const helperController = require('../controllers/helperController');

router.get('/getAllActiveTeams', helperController.getAllActiveTeams);
router.get('/getAllTeams', helperController.getAllTeams);
router.post('/addTeam', helperController.addTeam);
router.put('/updateTeam/:id', helperController.updateTeam);
router.put('/update-team-status/:id', helperController.updateTeamStatus);

router.get('/getAllDomains', helperController.getAllDomains);


router.get('/getAllActiveConsultants', helperController.getAllActiveConsultants);
router.post('/getAdmin', helperController.getAdmin);
router.get('/getAllSubjectAreas', helperController.getAllSubjectAreas);
router.post('/getConsultantsBySubjectArea', helperController.getConsultantsBySubjectArea);

router.get('/getPlanDetails', helperController.getPlanDetails);
router.get("/getBookingDetailsWithRc", helperController.fetchBookingDetailsWithRc);
router.post("/getUsersByRole", helperController.getUsersByRole);
router.get("/getTimezones", helperController.getTimezones);
router.post("/getBookingData", helperController.getBookingData);
router.post("/getRcCallBookingRequest", helperController.getRcCallBookingRequest);
router.get("/getMessageData", helperController.getMessageData);
router.post("/sendMessage", helperController.chatSubmit);
router.post("/fetchFollowerData", helperController.fetchFollowerData);
router.post("/getFollowerConsultant", helperController.getFollowerConsultant);
router.post("/addFollower", helperController.addFollower);
router.post("/updateExternalBookingInfo", helperController.updateExternalBookingInfo);






module.exports = router;
