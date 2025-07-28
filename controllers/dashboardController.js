// controllers/dashboardController.js
const dashboardModel = require("../models/dashboardModel");
const db = require("../config/db");
const moment = require('moment');


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

const getParticularStatusCallsOfCrm = (req, res) => {
  const { crm_id, status } = req.body;

  if ( !status) {
    return res.status(400).json({ status: false, message: 'Missing status' });
  }

  dashboardModel.getParticularStatusCallsOfCrm(crm_id, status, (err, data) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ status: false, message: 'Server error' });
    }

    return res.status(200).json({
      status: true,
      message: 'Success',
      data: data.length > 0 ? data : []
    });
  });
};


const getConsultantSettingData = (req, res) => {
  const { consultantid } = req.body;

  dashboardModel.getConsultantSettingData(consultantid, (err, result) => {
    if (err) {
      console.error("Error fetching consultant setting:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }

    return res.status(200).json({
      status: true,
      message: "Success",
      data: result || null,
    });
  });
};

const saveConsultantSettings = (req, res) => {
  const {
    consultantid,
    timezone,
    selectedWeekDays,
    saturdayOff,
    exclusions,
    timeData = {}
  } = req.body;

  // Basic validation
  if (!consultantid || !timezone?.id) {
    return res.status(400).json({ status: false, message: "Missing required fields" });
  }

  const data = {
    fld_timezone: timezone.id || null,
    fld_selected_week_days: selectedWeekDays || null,
    fld_saturday_off: saturdayOff || null,
    fld_days_exclusion: exclusions || null,

    fld_sun_time_data: timeData.sun_time_data ?? null,
    fld_mon_time_data: timeData.mon_time_data ?? null,
    fld_tue_time_data: timeData.tue_time_data ?? null,
    fld_wed_time_data: timeData.wed_time_data ?? null,
    fld_thu_time_data: timeData.thu_time_data ?? null,
    fld_fri_time_data: timeData.fri_time_data ?? null,
    fld_sat_time_data: timeData.sat_time_data ?? null,

    fld_updatedon: moment().format("YYYY-MM-DD HH:mm:ss")
  };

  dashboardModel.updateConsultantSettings(consultantid, data, (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).json({ status: false, message: "Database update failed" });
    }

    return res.status(200).json({
      status: true,
      message: "Consultant settings updated successfully",
    });
  });
};


module.exports = {
    getAllActiveTeams,
    getCallStatistics,
    getParticularStatusCallsOfCrm,
    getConsultantSettingData,
    saveConsultantSettings
}