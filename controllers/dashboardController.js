// controllers/dashboardController.js
const dashboardModel = require("../models/dashboardModel");
const db = require("../config/db");

const getAllActiveTeams = (req, res) => {
  dashboardModel.getAllActiveTeams((err, teams) => {
    if (err) {
      console.error("Error fetching teams:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }

    return res.json({
      status: true,
      message: "Success",
      data: teams.length > 0 ? teams : [],
    });
  });
};

const getCallStatistics = async (req, res) => {
  try {
    const {
      consultantid,
      crm_id,
      filter_type,
      session_user_type,
      session_user_id,
      team_id
    } = req.body;

    // Convert string IDs to integers
    const params = {
      filter_type,
      consultantid: consultantid ? parseInt(consultantid, 10) : '',
      crm_id: crm_id ? parseInt(crm_id, 10) : '',
      session_user_type,
      session_user_id: session_user_id ? parseInt(session_user_id, 10) : '',
      team_id
    };

    const totalbooking = await dashboardModel.getTotalData(params);

    const totalpresales = await dashboardModel.getTotalData({
      ...params,
      sale_type: 'Presales'
    });

    const converted = await dashboardModel.getTotalData({
      ...params,
      converted_sts: 'Converted'
    });

    const totalpostsales = await dashboardModel.getTotalData({
      ...params,
      sale_type: 'Postsales'
    });

    const conversion = totalpresales > 0 ? (converted / totalpresales) * 100 : 0;

    return res.json({
      totalbooking,
      totalpresales,
      conversion: conversion.toFixed(2),
      totalpostsales
    });
  } catch (error) {
    console.error('Error getting call statistics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
    getAllActiveTeams,
    getCallStatistics
}