// controllers/dashboardController.js
const dashboardModel = require("../models/dashboardModel");
const db = require("../config/db");
const moment = require('moment-timezone');


function getCurrentDate(format = "YYYY-MM-DD") {
  return moment().tz("Asia/Kolkata").format(format);
}
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

    fld_updatedon: getCurrentDate("YYYY-MM-DD HH:mm:ss")
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

const dayFieldMap = {
  sun: 'fld_sun_time_block',
  mon: 'fld_mon_time_block',
  tue: 'fld_tue_time_block',
  wed: 'fld_wed_time_block',
  thu: 'fld_thu_time_block',
  fri: 'fld_fri_time_block',
  sat: 'fld_sat_time_block',
};

const updateBlockSlots = (req, res) => {
  const { consultantid, day, blockedSlots } = req.body;

  if (!consultantid || !day || typeof blockedSlots !== 'string') {
    return res.status(400).json({
      status: false,
      message: 'Missing required fields: consultantid, day, or blockedSlots',
    });
  }

  const dayKey = day.toLowerCase(); 

  if (!dayFieldMap[dayKey]) {
    return res.status(400).json({
      status: false,
      message: 'Invalid day value. Must be one of sun, mon, tue, wed, thu, fri, sat',
    });
  }


  const dataToUpdate = {
    [dayFieldMap[dayKey]]: blockedSlots,
    fld_updatedon: new Date(),
  };

  dashboardModel.updateConsultantSettings(consultantid, dataToUpdate, (err, result) => {
    if (err) {
      console.error('DB update error:', err);
      return res.status(500).json({
        status: false,
        message: 'Database error while updating blocked slots',
        error: err.message || err,
      });
    }

    
    return res.json({
      status: true,
      message: 'Blocked slots updated successfully',
      data: result,
    });
  });
};

module.exports = {
    getAllActiveTeams,
    getCallStatistics,
    getParticularStatusCallsOfCrm,
    getConsultantSettingData,
    saveConsultantSettings,
    updateBlockSlots,
}