// controllers/helperController.js
const helperModel = require('../models/helperModel');





const getAllActiveTeams = (req, res) => {
    helperModel.getAllActiveTeams((err, teams) => {
        if (err) {
            console.error('Error fetching teams:', err);
            return res.status(500).json({ status: false, message: 'Server error' });
        }

        return res.json({
            status: true,
            message: 'Success',
            data: teams.length > 0 ? teams : []
        });
    });
};




const getAllTeams = (req, res) => {
    

    helperModel.getAllTeams( (err, teams) => {
        if (err) {
            console.error('Error fetching teams:', err);
            return res.status(500).json({ status: false, message: 'Server error' });
        }

        return res.json({
            status: true,
            message: 'Success',
            data: teams.length > 0 ? teams : []
        });
    });
};

const addTeam = (req, res) => {
  const teamData = req.body;
  if (!teamData.team) {
    return res.status(400).json({ status: false, message: "Team name is required" });
  }

  helperModel.addTeam(teamData, (err, result) => {
    if (err) {
      console.error("Add team error:", err);
      return res.status(500).json({ status: false, message: "Database error while adding team" });
    }
    return res.json({ status: true, message: "Team added successfully" });
  });
};

const updateTeam = (req, res) => {
  const id = req.params.id;
  const teamData = req.body;
  if (!teamData.team) {
    return res.status(400).json({ status: false, message: "Team name is required" });
  }

  helperModel.updateTeam(id, teamData, (err, result) => {
    if (err) {
      console.error("Update team error:", err);
      return res.status(500).json({ status: false, message: "Database error while updating team" });
    }
    return res.json({ status: true, message: "Team updated successfully" });
  });
};

const updateTeamStatus = (req, res) => {
  const teamId = req.params.id;
  const { status } = req.body;

  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    return res.status(400).json({ status: false, message: "Invalid status value" });
  }

  helperModel.updateTeamStatus(teamId, status, (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    return res.json({ status: true, message: "Team status updated successfully" });
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

module.exports = {
    getAllActiveTeams, getAllTeams,addTeam,updateTeam,updateTeamStatus,getAllDomains

};
