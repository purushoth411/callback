// models/planModel.js
const db = require("../config/db"); // Update path if needed
const moment = require("moment-timezone");

// Get all active plans
const getAllActivePlans = (callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    const sql = `
      SELECT * FROM tbl_plan ORDER BY id ASC
      `;

    connection.query(sql, (queryErr, results) => {
      connection.release(); // Always release the connection
      if (queryErr) return callback(queryErr, null);
      return callback(null, results);
    });
  });
};

// Get all plans
const getAllPlans = (callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    const sql = `
      SELECT * FROM tbl_plan ORDER BY id ASC
    `;

    connection.query(sql, (queryErr, results) => {
      connection.release();
      if (queryErr) return callback(queryErr, null);
      return callback(null, results);
    });
  });
};

// Update Plan title
const updatePlan = (id, planData, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const sql = `UPDATE tbl_plan SET allowedCalls = ? WHERE id = ?`;

    connection.query(sql, [planData.allowedCalls, id], (queryErr, result) => {
      connection.release();
      if (queryErr) return callback(queryErr);
      return callback(null, result);
    });
  });
};

module.exports = {
  getAllPlans,
  getAllActivePlans,
  updatePlan,
};
