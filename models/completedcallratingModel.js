// models/completedcallratingModel.js
const db = require("../config/db"); // Update path if needed
const moment = require("moment-timezone");

// Get all active completedcallratings
const getAllActiveCompletedcallratings = (callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    const sql = `
      SELECT h.*, b.fld_name, b.fld_addedby, b.fld_consultantid, added_by_admin.fld_name AS added_by_name, consultant_admin.fld_name AS consultant_name FROM tbl_booking_sts_history h JOIN tbl_booking b ON h.fld_booking_id = b.id LEFT JOIN tbl_admin added_by_admin ON b.fld_addedby = added_by_admin.id LEFT JOIN tbl_admin consultant_admin ON b.fld_consultantid = consultant_admin.id WHERE h.status = 'Completed' AND h.fld_call_completed_date >= '2024-05-18' ORDER BY h.id DESC
      `;

    connection.query(sql, (queryErr, results) => {
      connection.release(); // Always release the connection
      if (queryErr) return callback(queryErr, null);
      return callback(null, results);
    });
  });
};

// Get all completedcallratings
const getAllCompletedcallratings = (callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    const sql = `SELECT h.*, b.fld_name, b.fld_addedby, b.fld_consultantid, added_by_admin.fld_name AS added_by_name, consultant_admin.fld_name AS consultant_name FROM tbl_booking_sts_history h JOIN tbl_booking b ON h.fld_booking_id = b.id LEFT JOIN tbl_admin added_by_admin ON b.fld_addedby = added_by_admin.id LEFT JOIN tbl_admin consultant_admin ON b.fld_consultantid = consultant_admin.id WHERE h.status = 'Completed' AND h.fld_call_completed_date >= '2024-05-18' ORDER BY h.id DESC`;

    connection.query(sql, (queryErr, results) => {
      connection.release();
      if (queryErr) return callback(queryErr, null);
      return callback(null, results);
    });
  });
};

module.exports = {
  getAllCompletedcallratings,
  getAllActiveCompletedcallratings
};
