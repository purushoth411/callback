// routes/helperRoutes.js
const express = require('express');
const router = express.Router();
const helperController = require('../controllers/helperController');

router.get('/getAllActiveTeams', helperController.getAllActiveTeams);
router.get('/getAllTeams', helperController.getAllTeams);

router.get('/getAllDomains', helperController.getAllDomains);





module.exports = router;
