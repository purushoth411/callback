// models/helperModel.js
const db = require("../config/db"); // Update path if needed

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
    SELECT id, fld_name, fld_email, fld_phone ,fld_username,fld_permission
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

const getPlanDetails = (callback) => {
  const query = `
    SELECT *
    FROM tbl_plan 
    
  `;

  db.getConnection((err, connection) => {
    if (err) {
      console.error("DB connection error:", err);
      return callback(err, null);
    }

    connection.query(query, (error, results) => {
      connection.release(); // always release
      if (error) {
        console.error("Query error (plans):", error);
        return callback(error, null);
      }
      return callback(null, results);
    });
  });
};

const getBookingDetailsWithRc = (id, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    let sql = `
      SELECT b.*, r.slot_time AS rc_slot_time, r.booking_date AS rc_booking_date
      FROM tbl_booking b
      LEFT JOIN tbl_rc_call_booking_request r ON r.id = b.fld_call_request_id
      WHERE b.callDisabled IS NULL
    `;

    const values = [];

    // If ID is provided, add condition
    if (id) {
      sql += ` AND b.id = ?`;
      values.push(id);
    }

 
    sql += ` ORDER BY b.id DESC`;
    if (!id) {
      
    }

    connection.query(sql, values, (error, results) => {
      connection.release();
      if (error) return callback(error);

      if (id) {
        callback(null, results.length ? results[0] : null); 
      } else {
        callback(null, results); 
      }
    });
  });
};


const getConsultantSettingData = (consultantId, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const sql = `
      SELECT * FROM tbl_consultant_setting
      WHERE fld_consultantid = ?
      ORDER BY id DESC
      LIMIT 1
    `;

    connection.query(sql, [consultantId], (error, results) => {
      connection.release();
      if (error) return callback(error);

      callback(null, results.length ? results[0] : null);
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
  getPlanDetails,
  getBookingDetailsWithRc,
  getConsultantSettingData,
};
