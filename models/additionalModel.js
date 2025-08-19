// models/dashboardModel.js
const db = require("../config/db"); // Update path if needed
// const rc_db = require("../config/rc_db"); // Update path if needed
const moment = require('moment-timezone');


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


// const getWritersByProjectSegment = ({ project_id, milestone_id }, callback) => {
//   rc_db.getConnection((err, connection) => {
//     if (err) return callback(err);

//     const sql = `
//       SELECT * 
//       FROM tbl_assign_segment 
//       WHERE project_id = ? AND segment_id = ?
//       LIMIT 1
//     `;

//     connection.query(sql, [project_id, milestone_id], (error, results) => {
//       if (error) {
//         connection.release();
//         return callback(error);
//       }

//       if (!results.length) {
//         connection.release();
//         return callback(null, null);
//       }

//       const row = results[0];
//       const { writer_id, main_writer_id } = row;

//       if (writer_id == main_writer_id) {
//         // Fetch only one email
//         const emailSql = `SELECT wr_email AS main_writer_email FROM tbl_writer WHERE wr_id = ? LIMIT 1`;

//         connection.query(emailSql, [main_writer_id], (emailErr, emailResults) => {
//           connection.release();
//           if (emailErr) return callback(emailErr);
//           return callback(null, {
//             main_writer_email: emailResults[0]?.main_writer_email || null
//           });
//         });

//       } else {
//         // Fetch both emails
//         const emailSql = `
//           SELECT 
//             (SELECT wr_email FROM tbl_writer WHERE wr_id = ?) AS main_writer_email,
//             (SELECT wr_email FROM tbl_writer WHERE wr_id = ?) AS sub_writer_email
//         `;

//         connection.query(emailSql, [main_writer_id, writer_id], (emailErr, emailResults) => {
//           connection.release();
//           if (emailErr) return callback(emailErr);
//           return callback(null, emailResults[0] || null);
//         });
//       }
//     });
//   });
// };

const viewExternalCalls = async ({ session_user_id, session_user_type, bookingid }) => {
  return new Promise((resolve, reject) => {
    db.getConnection((err, connection) => {
      if (err) return reject(err);

      let sql = `
        SELECT 
          tbl_external_calls.*, 
          tbl_booking.fld_call_related_to,
          tbl_booking.fld_sale_type,
          tbl_booking.fld_booking_date,
          tbl_booking.fld_booking_slot,
          tbl_booking.id as bookingid,
          tbl_booking.fld_client_id,
          consultant_admin.fld_name AS consultant_name,
          tbl_user.fld_email AS user_email,
          tbl_user.fld_name AS user_name,
          crm_admin.fld_name AS crm_name
        FROM tbl_external_calls
        INNER JOIN tbl_booking ON tbl_external_calls.fld_booking_id = tbl_booking.id
        LEFT JOIN tbl_admin AS consultant_admin ON tbl_booking.fld_consultantid = consultant_admin.id
        LEFT JOIN tbl_user ON tbl_booking.fld_userid = tbl_user.id
        LEFT JOIN tbl_admin AS crm_admin ON tbl_external_calls.fld_call_added_by = crm_admin.id
      `;

      let conditions = [];
      let values = [];

      if (bookingid) {
        conditions.push('tbl_external_calls.id = ?');
        values.push(bookingid);
      }

      if (session_user_type === 'CONSULTANT') {
        conditions.push('tbl_external_calls.fld_consultant_id = ?');
        values.push(session_user_id);
      } else if (session_user_type === 'EXECUTIVE') {
        conditions.push('tbl_external_calls.fld_call_added_by = ?');
        values.push(session_user_id);
      } else if (session_user_type === 'SUBADMIN') {
        conditions.push('tbl_booking.fld_call_related_to = ?');
        values.push('I_am_not_sure');
      }

      sql += conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
      sql += ' ORDER BY tbl_external_calls.id DESC';

      connection.query(sql, values, (error, results) => {
        connection.release();
        if (error) return reject(error);
        if (bookingid) {
          return resolve(results[0] || null);
        } else {
          return resolve(results || []);
        }
      });
    });
  });
};




module.exports = {
    getRcCallBookingRequest,
   // getWritersByProjectSegment,
    viewExternalCalls
}