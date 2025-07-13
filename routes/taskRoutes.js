const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const multer = require('multer');

// Simple memory storage (you can configure disk storage if needed)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /api/tasks/get
router.post('/get', taskController.getTasks);

router.post('/details', taskController.getTaskById);

// Multer will parse the form-data and populate req.body
router.post('/closetask', upload.none(), taskController.closeTask);

router.post('/create', upload.none(), taskController.insertTask);
router.post('/update', upload.none(), taskController.updateTask);

module.exports = router;
