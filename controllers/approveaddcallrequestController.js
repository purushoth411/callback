// controllers/approveaddcallrequestController.js
const approveaddcallrequestModel = require("../models/approveaddcallrequestModel");
const db = require("../config/db");
const moment = require('moment-timezone');

const { getIO } = require("../socket");

const getAllActiveApproveaddcallrequests = (req, res) => {
  approveaddcallrequestModel.getAllActiveApproveaddcallrequests((err, Approveaddcallrequests) => {
    if (err) {
      console.error("Error fetching Approveaddcallrequests:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }

    return res.json({
      status: true,
      message: "Success",
      data: Approveaddcallrequests.length > 0 ? Approveaddcallrequests : [],
    });
  });
};

const getAllApproveaddcallrequests = (req, res) => {
  approveaddcallrequestModel.getAllApproveaddcallrequests((err, Approveaddcallrequests) => {
    if (err) {
      console.error("Error fetching Approveaddcallrequests:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }

    return res.json({
      status: true,
      message: "Success",
      data: Approveaddcallrequests.length > 0 ? Approveaddcallrequests : [],
    });
  });
};

const updateApproveaddcallrequeststatus = (req, res) => {
  const approveaddcallrequestId = req.params.id;
  const { status } = req.body;

  if (!["Approved", "Rejected"].includes(status)) {
    return res
      .status(400)
      .json({ status: false, message: "Invalid status value" });
  }

  approveaddcallrequestModel.updateApproveaddcallrequeststatus(approveaddcallrequestId, status, (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }
     const io = getIO();
      io.emit("updatedCallRequestStatus",approveaddcallrequestId,status);
    return res.json({
      status: true,
      message: "Request status updated successfully",
    });
  });
};


module.exports = {
  getAllActiveApproveaddcallrequests,
  getAllApproveaddcallrequests,
  updateApproveaddcallrequeststatus
};
