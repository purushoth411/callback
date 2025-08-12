// routes/followerRoutes.js
const express = require('express');
const router = express.Router();
const followerController = require('../controllers/followerController');

router.get('/getAllActiveFollowers', followerController.getAllActiveFollowers);
router.get('/getAllFollowers', followerController.getAllFollowers);
router.put('/followerclaimbooking/:followerId/:bookingId/', followerController.followerclaimbooking);

module.exports = router;
