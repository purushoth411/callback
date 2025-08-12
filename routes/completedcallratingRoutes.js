// routes/completedcallratingRoutes.js
const express = require('express');
const router = express.Router();
const completedcallratingController = require('../controllers/completedcallratingController');

router.get('/getAllActiveCompletedcallratings', completedcallratingController.getAllActiveCompletedcallratings);
router.get('/getAllCompletedcallratings', completedcallratingController.getAllCompletedcallratings);

module.exports = router;
