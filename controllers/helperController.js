// controllers/helperController.js
const helperModel = require("../models/helperModel");
const db = require("../config/db");

const getAllActiveTeams = (req, res) => {
  helperModel.getAllActiveTeams((err, teams) => {
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

const getAllTeams = (req, res) => {
  helperModel.getAllTeams((err, teams) => {
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

const addTeam = (req, res) => {
  const teamData = req.body;
  if (!teamData.team) {
    return res
      .status(400)
      .json({ status: false, message: "Team name is required" });
  }

  helperModel.addTeam(teamData, (err, result) => {
    if (err) {
      console.error("Add team error:", err);
      return res
        .status(500)
        .json({ status: false, message: "Database error while adding team" });
    }
    return res.json({ status: true, message: "Team added successfully" });
  });
};

const updateTeam = (req, res) => {
  const id = req.params.id;
  const teamData = req.body;
  if (!teamData.team) {
    return res
      .status(400)
      .json({ status: false, message: "Team name is required" });
  }

  helperModel.updateTeam(id, teamData, (err, result) => {
    if (err) {
      console.error("Update team error:", err);
      return res
        .status(500)
        .json({ status: false, message: "Database error while updating team" });
    }
    return res.json({ status: true, message: "Team updated successfully" });
  });
};

const updateTeamStatus = (req, res) => {
  const teamId = req.params.id;
  const { status } = req.body;

  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    return res
      .status(400)
      .json({ status: false, message: "Invalid status value" });
  }

  helperModel.updateTeamStatus(teamId, status, (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    return res.json({
      status: true,
      message: "Team status updated successfully",
    });
  });
};

const getAllDomains = (req, res) => {
  helperModel.getAllDomains((err, results) => {
    if (err) {
      console.error("Error fetching domains:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    return res.json({ status: true, data: results });
  });
};

const getAllSubjectAreas = (req, res) => {
  try {
    helperModel.getAllSubjectAreas((err, results) => {
      if (err) {
        console.error("Error fetching subject areas:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }

      return res.json({ status: true, data: results });
    });
  } catch (err) {
    console.error("Error in getting Subject Areas:", err);
    return res
      .status(404)
      .json({ status: false, message: `Server error occurred in controller` });
  }
};

const getAllActiveConsultants = (req, res) => {
  try {
    helperModel.getAllActiveConsultants((err, results) => {
      if (err) {
        console.error("Error fetching consultants:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }

      return res.json({ results });
    });
  } catch (err) {
    console.error("Error in getting consultants:", err);
    return res
      .status(404)
      .json({ status: false, message: `Server error occurred in controller` });
  }
};

const getPlanDetails=(req,res)=>{
  try{
    helperModel.getPlanDetails((err,results)=>{
       if (err) {
        console.error("Error fetching plans:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }

      return res.json({ results });
    })
  }catch (err) {
    console.error("Error in getting plans:", err);
    return res
      .status(404)
      .json({ status: false, message: `Server error occurred in controller` });
  }
}



// controllers/helperController.js
const getConsultantsBySubjectArea = (req, res) => {
  const { subject_area } = req.body;

  if (!subject_area) {
    return res.status(400).json({ message: "Subject area is required" });
  }

  db.getConnection((err, connection) => {
    if (err) {
      console.error("DB connection error:", err);
      return res.status(500).json({ message: "Database connection error" });
    }

    // Step 1: Get consultantId from tbl_domain_pref
    const query1 = `
      SELECT cosultantId 
      FROM tbl_domain_pref 
      WHERE domain = ? AND status = 'Active' 
      LIMIT 1
    `;

    connection.query(query1, [subject_area.trim()], (error1, domainRows) => {
      if (error1) {
        connection.release();
        console.error("Query error:", error1);
        return res.status(500).json({ message: "Query error" });
      }

      if (!domainRows.length || !domainRows[0].cosultantId) {
        connection.release();
        return res
          .status(404)
          .json({ message: "No consultants found for this subject area" });
      }

      // Step 2: Extract and process names
      const rawNames = domainRows[0].cosultantId;
      const nameArray = rawNames
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

      if (nameArray.length === 0) {
        connection.release();
        return res.status(404).json({ message: "No valid consultants listed" });
      }

      // Step 3: Query consultants
      const placeholders = nameArray.map(() => "?").join(",");
      const query2 = `
        SELECT id, fld_name, fld_email, fld_permission ,fld_username
        FROM tbl_admin 
        WHERE fld_name IN (${placeholders}) 
        AND fld_admin_type = 'CONSULTANT' 
        AND attendance = 'PRESENT'
      `;

      connection.query(query2, nameArray, (error2, consultants) => {
        connection.release();

        if (error2) {
          console.error("Consultant query error:", error2);
          return res.status(500).json({ message: "Consultant fetch error" });
        }

        // Step 4: Sort consultants as per original order
        const sortedConsultants = nameArray
          .map((name) => consultants.find((con) => con.fld_name === name))
          .filter(Boolean);

        const formatted = sortedConsultants.map((con) => ({
          id: con.id,
          fld_name: con.fld_name,
          fld_email: con.fld_email,
          fld_permission: con.fld_permission,
          fld_username: con.fld_username,
        }));

        return res.json(formatted);
      });
    });
  });
};

const fetchBookingDetailsWithRc = (req, res) => {
   const id = req.query.id;
  helperModel.getBookingDetailsWithRc(id,(err, bookingRow) => {
    if (err) {
      console.error("Error fetching booking details:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    if (!bookingRow) {
      return res.status(404).json({ status: false, message: "Booking not found" });
    }

    const consultantId = bookingRow.fld_consultantid;

    helperModel.getConsultantSettingData(consultantId, (err2, settingRow) => {
      if (err2) {
        console.error("Error fetching consultant setting:", err2);
        return res.status(500).json({ status: false, message: "Error fetching consultant settings" });
      }

      return res.json({
        status: true,
        bookingDetails: bookingRow,
        consultantSettings: settingRow || {},
      });
    });
  });
};

module.exports = {
  getAllActiveTeams,
  getAllTeams,
  addTeam,
  updateTeam,
  updateTeamStatus,
  getAllDomains,
  getAllSubjectAreas,
  getAllActiveConsultants,
  getConsultantsBySubjectArea,
  getPlanDetails,
  fetchBookingDetailsWithRc,
};
