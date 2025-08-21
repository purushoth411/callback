// controllers/planController.js
const planModel = require("../models/planModel");
const db = require("../config/db");
const moment = require('moment-timezone');
const { getIO } = require("../socket");


const getAllActivePlans = (req, res) => {
  planModel.getAllActivePlans((err, Plans) => {
    if (err) {
      console.error("Error fetching Plans:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }

    return res.json({
      status: true,
      message: "Success",
      data: Plans.length > 0 ? Plans : [],
    });
  });
};

const getAllPlans = (req, res) => {
  planModel.getAllPlans((err, Plans) => {
    if (err) {
      console.error("Error fetching Plans:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }

    return res.json({
      status: true,
      message: "Success",
      data: Plans.length > 0 ? Plans : [],
    });
  });
};

const updatePlan = (req, res) => {
  const id = req.params.id;
  const planData = req.body;

  if (!planData.plan) {
    return res
      .status(400)
      .json({ status: false, message: "Plan name is required" });
  }

  if (!planData.allowedCalls) {
    return res
      .status(400)
      .json({ status: false, message: "Allowed Calls is required" });
  }

  planModel.updatePlan(id, planData, (err, result) => {
    if (err) {
      console.error("Update Plan error:", err);
      return res
        .status(500)
        .json({ status: false, message: "Database error while updating Plan" });
    }

    const io = getIO();
   
    io.emit("planUpdated", { id, ...planData });

    return res.json({ status: true, message: "Plan updated successfully" });
  });
};




module.exports = {
  getAllActivePlans,
  getAllPlans,
  updatePlan
};
