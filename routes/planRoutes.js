// routes/planRoutes.js
const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');

router.get('/getAllActivePlans', planController.getAllActivePlans);
router.get('/getAllPlans', planController.getAllPlans);
router.put('/updatePlan/:id', planController.updatePlan);

module.exports = router;
