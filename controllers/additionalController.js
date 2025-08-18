// controllers/additionalController.js
const additionalModel = require("../models/additionalModel");
const db = require("../config/db");
const moment = require('moment-timezone');


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

const getWritersByProjectSegment = (req, res) => {
  const { project_id = '', milestone_id = '' } = req.body;

  if (!project_id || !milestone_id) {
    return res.status(400).json({ status: false, message: "project_id and milestone_id are required" });
  }

  additionalModel.getWritersByProjectSegment({ project_id, milestone_id }, (err, result) => {
    if (err) {
      console.error("Error fetching writer details:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }

    return res.status(200).json({
      status: true,
      message: "Success",
      data: result || null
    });
  });
};

const getExternalCalls = async (req, res) => {
  try {
    const {
      session_user_id,
      session_user_type,
      bookingid = ''
    } = req.body;

    if (!session_user_id || !session_user_type) {
      return res.status(400).json({ status: false, message: "Missing user session info" });
    }

    const params = {
      session_user_id: parseInt(session_user_id),
      session_user_type,
      bookingid: bookingid ? parseInt(bookingid) : ''
    };

    const result = await additionalModel.viewExternalCalls(params);

    return res.json({
      status: true,
      message: "Success",
      data: result || []
    });
  } catch (err) {
    console.error("Error fetching external calls:", err);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};


module.exports = {
    getRcCallBookingRequest,
    getWritersByProjectSegment,
    getExternalCalls
}