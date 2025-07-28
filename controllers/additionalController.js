// controllers/additionalController.js
const additionalModel = require("../models/additionalModel");
const db = require("../config/db");
const moment = require('moment');

const getRcCallBookingRequest = (req, res) => {
  const {
    id = '',
    crmid = '',
    consultantid = '',
    selectedDate = '',
    selectedslot = '',
    status = ''
  } = req.body;

  additionalModel.getRcCallBookingRequest({ id, crmid, consultantid, selectedDate, selectedslot, status }, (err, result) => {
    if (err) {
      console.error("Error fetching RC call booking request:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }

    return res.status(200).json({
      status: true,
      message: "Success",
      data: result || null
    });
  });
};



module.exports = {
    getRcCallBookingRequest
}