// controllers/completedcallratingController.js
const completedcallratingModel = require("../models/completedcallratingModel");
const db = require("../config/db");
const moment = require('moment-timezone');


const getAllActiveCompletedcallratings = (req, res) => {
  completedcallratingModel.getAllActiveCompletedcallratings((err, Completedcallratings) => {
    if (err) {
      console.error("Error fetching Completedcallratings:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }

    return res.json({
      status: true,
      message: "Success",
      data: Completedcallratings.length > 0 ? Completedcallratings : [],
    });
  });
};

const getAllCompletedcallratings = (req, res) => {
  completedcallratingModel.getAllCompletedcallratings((err, Completedcallratings) => {
    if (err) {
      console.error("Error fetching Completedcallratings:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }

    return res.json({
      status: true,
      message: "Success",
      data: Completedcallratings.length > 0 ? Completedcallratings : [],
    });
  });
};

module.exports = {
  getAllActiveCompletedcallratings,
  getAllCompletedcallratings
};
