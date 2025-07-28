// models/dashboardModel.js
const db = require("../config/db"); // Update path if needed
const moment = require('moment');

const getRcCallBookingRequest = (params, callback) => {
  const {
    id,
    crmid,
    consultantid,
    selectedDate,
    selectedslot,
    status
  } = params;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    let sql = `
      SELECT 
        tbl_rc_call_booking_request.*, 
        tbl_booking.id AS bookingid, 
        crm.fld_name
      FROM tbl_rc_call_booking_request
      LEFT JOIN tbl_booking ON tbl_rc_call_booking_request.id = tbl_booking.fld_call_request_id
      LEFT JOIN tbl_admin AS crm ON tbl_rc_call_booking_request.crmid = crm.id
      WHERE tbl_rc_call_booking_request.reqFrom = 'RC'
    `;

    const conditions = [];
    const values = [];

    if (crmid && Number(crmid) > 0) {
      conditions.push('tbl_rc_call_booking_request.crmid = ?');
      values.push(crmid);
    }

    if (id && Number(id) > 0) {
      conditions.push('tbl_rc_call_booking_request.id = ?');
      values.push(id);
    }

    if (selectedDate) {
      conditions.push('tbl_rc_call_booking_request.booking_date = ?');
      values.push(selectedDate);
    }

    if (selectedslot) {
      conditions.push('tbl_rc_call_booking_request.slot_time = ?');
      values.push(selectedslot);
    }

    if (consultantid) {
      conditions.push('tbl_rc_call_booking_request.consultantid = ?');
      values.push(consultantid);
    }

    if (status) {
      conditions.push('tbl_rc_call_booking_request.call_request_sts = ?');
      values.push(status);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY tbl_rc_call_booking_request.id DESC';

    connection.query(sql, values, (error, results) => {
      connection.release();
      if (error) return callback(error);
      if (id && Number(id) > 0) {
        return callback(null, results[0] || null);
      } else {
        return callback(null, results);
      }
    });
  });
};

module.exports = {
    getRcCallBookingRequest
}