const express = require("express");
const router = express.Router();
const apiController = require("../controllers/apiController");

router.get("/getCallDriveLink", apiController.getCallDriveLink);
router.post("/markAsPresent", apiController.markAsPresent);
router.post("/markAsAbsent", apiController.markAsAbsent);
router.post("/markAsAbsentAll", apiController.markAsAbsentAll);
router.get("/getPostSaleInfo", apiController.getPostSaleInfo);

module.exports = router;
