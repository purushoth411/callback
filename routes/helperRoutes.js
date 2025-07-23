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
router.get('/getAllSubjectAreas', helperController.getAllSubjectAreas);





module.exports = router;
