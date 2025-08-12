// models/approveaddcallrequestModel.js
const db = require("../config/db"); // Update path if needed
const moment = require("moment-timezone");

// Get all active approveaddcallrequests
const getAllActiveApproveaddcallrequests = (callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    const sql = `
      SELECT tbl_approve_addcall_request.*, tbl_booking.fld_name as client_name, tbl_booking.fld_client_id as client_code, tbl_plan.plan as planName, addedby.id as crm_id, addedby.fld_name as crm_name, tbl_admin.fld_name as admin_name, tbl_admin.fld_email as admin_email FROM tbl_approve_addcall_request JOIN tbl_booking ON tbl_approve_addcall_request.bookingId = tbl_booking.id JOIN tbl_plan ON tbl_approve_addcall_request.planId = tbl_plan.id LEFT JOIN tbl_admin ON tbl_booking.fld_consultantid = tbl_admin.id LEFT JOIN tbl_admin as addedby ON tbl_booking.fld_addedby = addedby.id ORDER BY tbl_approve_addcall_request.id DESC
      `;

    connection.query(sql, (queryErr, results) => {
      connection.release(); // Always release the connection
      if (queryErr) return callback(queryErr, null);
      return callback(null, results);
    });
  });
};

// Get all approveaddcallrequests
const getAllApproveaddcallrequests = (callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    const sql = `SELECT tbl_approve_addcall_request.*, tbl_booking.fld_name as client_name, tbl_booking.fld_client_id as client_code, tbl_plan.plan as planName, addedby.id as crm_id, addedby.fld_name as crm_name, tbl_admin.fld_name as admin_name, tbl_admin.fld_email as admin_email FROM tbl_approve_addcall_request JOIN tbl_booking ON tbl_approve_addcall_request.bookingId = tbl_booking.id JOIN tbl_plan ON tbl_approve_addcall_request.planId = tbl_plan.id LEFT JOIN tbl_admin ON tbl_booking.fld_consultantid = tbl_admin.id LEFT JOIN tbl_admin as addedby ON tbl_booking.fld_addedby = addedby.id ORDER BY tbl_approve_addcall_request.id DESC`;

    connection.query(sql, (queryErr, results) => {
      connection.release();
      if (queryErr) return callback(queryErr, null);
      return callback(null, results);
    });
  });
};

// Update approveaddcallrequest status
const updateApproveaddcallrequeststatus = (approveaddcallrequestId, status, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const sql = `UPDATE tbl_approve_addcall_request SET status = ? WHERE id = ?`;

    connection.query(sql, [status, approveaddcallrequestId], (queryErr, result) => {
      connection.release();
      if (queryErr) return callback(queryErr);
      return callback(null, result);
    });
  });
};

module.exports = {
  getAllApproveaddcallrequests,
  getAllActiveApproveaddcallrequests,
  updateApproveaddcallrequeststatus
};
