// models/helperModel.js
const db = require("../config/db"); // Update path if needed
const moment = require("moment-timezone");

const checkIfDomainExists = (domain, callback) => {
  const query = "SELECT COUNT(*) AS cnt FROM tbl_domain_pref WHERE domain = ?";
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, [domain], (error, results) => {
      connection.release();
      if (error) return callback(error);
      const exists = results[0]?.cnt > 0;
      callback(null, exists);
    });
  });
};

const insertDomainPref = (data, callback) => {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const placeholders = fields.map(() => "?").join(", ");
  const query = `INSERT INTO tbl_domain_pref (${fields.join(", ")}) VALUES (${placeholders})`;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, values, (error, result) => {
      connection.release();
      if (error) return callback(error);
      callback(null, result.insertId);
    });
  });
};

const checkIfDomainExistsForUpdate = (domain, id, callback) => {
  const query = "SELECT COUNT(*) AS cnt FROM tbl_domain_pref WHERE domain = ? AND id != ?";
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, [domain, id], (error, results) => {
      connection.release();
      if (error) return callback(error);
      const exists = results[0]?.cnt > 0;
      callback(null, exists);
    });
  });
};

const updateDomainPref = (id, data, callback) => {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const updates = fields.map(field => `${field} = ?`).join(", ");
  const query = `UPDATE tbl_domain_pref SET ${updates} WHERE id = ?`;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, [...values, id], (error, result) => {
      connection.release();
      if (error) return callback(error);
      callback(null, result.affectedRows);
    });
  });
};

const deleteDomainById = (id, callback) => {
  db.getConnection((err, connection) => {
    if (err) {
      console.error("Connection error:", err);
      return callback(err, null);
    }

    const query = "DELETE FROM tbl_domain_pref WHERE id = ?";
    connection.query(query, [id], (error, result) => {
      connection.release();

      if (error) {
        console.error("Query error:", error);
        return callback(error, null);
      }

      callback(null, result);
    });
  });
};

const updateDomainStatus = (domainId, status, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const sql = `UPDATE tbl_domain_pref SET status = ? WHERE id = ?`;

    connection.query(sql, [status, domainId], (queryErr, result) => {
      connection.release();
      if (queryErr) return callback(queryErr);
      return callback(null, result);
    });
  });
};

const getDomainbyId = (domainId, callback) => {
  if (!domainId) return callback(new Error("Domain ID is required"));

  const query = 'SELECT * FROM tbl_domain_pref WHERE id = ?';

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, [domainId], (error, results) => {
      connection.release();
      if (error) return callback(error);

      if (results.length > 0) {
        callback(null, results[0]);
      } else {
        callback(null, null); 
      }
    });
  });
};

module.exports = {
    checkIfDomainExists,
 insertDomainPref,
 checkIfDomainExistsForUpdate,
 updateDomainPref,
 deleteDomainById,
 updateDomainStatus,
 getDomainbyId,
};
