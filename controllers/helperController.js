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
    

    helperModel.getTeams( (err, remarks) => {
        if (err) {
            console.error('Error fetching remarks:', err);
            return res.status(500).json({ status: false, message: 'Server error' });
        }

        return res.json({
            status: true,
            message: 'Success',
            data: teams.length > 0 ? teams : []
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

module.exports = {
    getAllActiveTeams, getAllTeams,getAllDomains

};
