// routes/helperRoutes.js
const express = require('express');
const router = express.Router();
const domainController = require('../controllers/domainController');


router.post('/addDomain', domainController.addDomain);
router.put('/updateDomain/:id', domainController.updateDomain);
router.delete("/deleteDomain/:id", domainController.deleteDomain);
router.put('/updateDomainStatus/:id', domainController.updateDomainStatus);




module.exports = router;
