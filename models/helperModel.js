// models/helperModel.js
const db = require('../config/db'); // Update path if needed


const getAllActiveTeams = (callback) => {
  const sql = `
    SELECT * FROM tbl_team
    WHERE status = 'Active'
    ORDER BY fld_addedon DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return callback(err, null);
    return callback(null, results);
  });
};


const getAllTeams = (callback) => {
    const sql = `
        SELECT 
          *
        FROM 
            tbl_team 
       
        ORDER BY 
            tbl_team.fld_addedon DESC
    `;

    db.query(sql, (err, results) => {
        if (err) return callback(err, null);
        return callback(null, results);
    });
};

const addTeam = (teamData, callback) => {
  const sql = `INSERT INTO tbl_team (fld_title, fld_addedon, status) VALUES (?, NOW(), 'Active')`;
  db.query(sql, [teamData.team], (err, result) => {
    if (err) return callback(err);
    return callback(null, result);
  });
};

const updateTeam = (id, teamData, callback) => {
  const sql = `UPDATE tbl_team SET fld_title = ? WHERE id = ?`;
  db.query(sql, [teamData.team, id], (err, result) => {
    if (err) return callback(err);
    return callback(null, result);
  });
};

const updateTeamStatus = (teamId, status, callback) => {
  const sql = `UPDATE tbl_team SET status = ? WHERE id = ?`;
  const params = [status, teamId];

  db.query(sql, params, callback);
};

const getAllDomains = (callback) => {
  const sql = `
    SELECT 
      id, 
      domain,
      fld_addedon,
      status,
      cosultantId
    FROM tbl_domain_pref
    ORDER BY id DESC
  `;

  db.query(sql, [], (err, results) => {
    if (err) return callback(err, null);

   

    return callback(null, results);
  });
};


const getAllSubjectAreas = (callback) => {
  const query = `
    SELECT id, domain 
    FROM tbl_domain_pref 
    WHERE status = 'Active'
  `;

  db.getConnection((err, connection) => {
    if (err) {
      console.error("DB connection error:", err);
      return callback(err, null);
    }

    connection.query(query, (error, results) => {
      connection.release(); // always release
      if (error) {
        console.error("Query error (subject areas):", error);
        return callback(error, null);
      }
      return callback(null, results);
    });
  });
};

const getAllActiveConsultants = (callback) => {
  const query = `
    SELECT id, fld_name, fld_email, fld_phone 
    FROM tbl_admin 
    WHERE fld_admin_type = 'CONSULTANT' 
      AND status = 'Active' 
      AND attendance = 'PRESENT'
  `;

  db.getConnection((err, connection) => {
    if (err) {
      console.error("DB connection error:", err);
      return callback(err, null);
    }

    connection.query(query, (error, results) => {
      connection.release(); // always release
      if (error) {
        console.error("Query error (consultants):", error);
        return callback(error, null);
      }
      return callback(null, results);
    });
  });
};

module.exports = {
   
    getAllTeams,
    getAllActiveTeams,
    addTeam,
    updateTeam,
    updateTeamStatus,
    getAllDomains,
    getAllActiveConsultants,
    getAllSubjectAreas,
   
};
