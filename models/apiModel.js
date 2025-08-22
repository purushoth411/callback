const db = require("../config/db");

// Get call drive links
const getCallDriveLink = (email,website, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const sqlUser = `SELECT id FROM tbl_user WHERE fld_email = ? ORDER BY id DESC LIMIT 1`;

    connection.query(sqlUser, [email], (error, userResult) => {
      if (error) {
        connection.release();
        return callback(error);
      }

      if (userResult.length === 0) {
        connection.release();
        return callback(null, { status: false, error: "User not found" });
      }

      const userId = userResult[0].id;
      const sqlBookings = `
        SELECT fld_call_complete_recording
        FROM tbl_booking
        WHERE fld_userid = ?
        AND fld_insta_website = ?
        ORDER BY id DESC
      `;

      connection.query(sqlBookings, [userId, website], (err2, results) => {
        connection.release();
        if (err2) return callback(err2);
        return callback(null, { status: true, data: results });
      });
    });
  });
};

// Mark all consultants absent
const markAsAbsentAll = (callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const sql = `UPDATE tbl_admin SET attendance='ABSENT' WHERE fld_admin_type='CONSULTANT'`;

    connection.query(sql, (error, results) => {
      connection.release();
      if (error) return callback(error);
      return callback(null, results.affectedRows > 0 
        ? "All consultants marked as ABSENT." 
        : "No consultant records were updated.");
    });
  });
};

// Mark consultant as PRESENT
const markAsPresent = (email, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const checkSql = `SELECT * FROM tbl_admin WHERE fld_email=? AND fld_admin_type='CONSULTANT'`;
    connection.query(checkSql, [email], (error, result) => {
      if (error) {
        connection.release();
        return callback(error);
      }

      if (result.length === 0) {
        connection.release();
        return callback(null, { status: false, message: "Email not found or not a consultant" });
      }

      const updateSql = `UPDATE tbl_admin SET attendance='PRESENT' WHERE fld_email=?`;
      connection.query(updateSql, [email], (err2, updateResult) => {
        connection.release();
        if (err2) return callback(err2);

        if (updateResult.affectedRows > 0) {
          return callback(null, { status: true, message: "Consultant marked as PRESENT" });
        } else {
          return callback(null, { status: false, message: "Already marked or update failed" });
        }
      });
    });
  });
};

// Mark consultant as ABSENT
const markAsAbsent = (email, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const checkSql = `SELECT * FROM tbl_admin WHERE fld_email=? AND fld_admin_type='CONSULTANT'`;
    connection.query(checkSql, [email], (error, result) => {
      if (error) {
        connection.release();
        return callback(error);
      }

      if (result.length === 0) {
        connection.release();
        return callback(null, { status: false, message: "Email not found or not a consultant" });
      }

      const updateSql = `UPDATE tbl_admin SET attendance='ABSENT' WHERE fld_email=?`;
      connection.query(updateSql, [email], (err2, updateResult) => {
        connection.release();
        if (err2) return callback(err2);

        if (updateResult.affectedRows > 0) {
          return callback(null, { status: true, message: "Consultant marked as ABSENT" });
        } else {
          return callback(null, { status: false, message: "Already marked or update failed" });
        }
      });
    });
  });
};

// Get post sale info
const getPostSaleInfo = (assignedId, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const sql = `
      SELECT * FROM tbl_booking
      WHERE fld_rc_milestoneid = ?
        AND fld_call_request_sts = 'Completed'
        AND fld_sale_type = 'Postsales'
    `;

    connection.query(sql, [assignedId], (error, results) => {
      connection.release();
      if (error) return callback(error);
      return callback(null, results);
    });
  });
};

const viewBooking = (email, callback) => {
  const sql = `
    SELECT 
      tbl_booking_overall_history.fld_comment AS status_comment,
      tbl_booking_sts_history.fld_comment AS call_comments,
      tbl_booking_sts_history.fld_booking_call_file AS booking_call_file,
      tbl_booking.fld_bookingcode AS bookingcode,
      tbl_booking_overall_history.fld_addedon AS addedon,
      tbl_booking.fld_sale_type AS sale_type
    FROM tbl_booking_overall_history
    JOIN tbl_booking 
      ON tbl_booking.id = tbl_booking_overall_history.fld_booking_id
    JOIN tbl_booking_sts_history 
      ON tbl_booking.id = tbl_booking_sts_history.fld_booking_id
    WHERE tbl_booking.fld_email = ?
    ORDER BY tbl_booking_overall_history.id DESC
  `;

  db.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting DB connection:", err);
      return callback(err, null);
    }

    connection.query(sql, [email], (error, results) => {
      connection.release(); // Always release after query

      if (error) {
        console.error("Error executing query:", error);
        return callback(error, null);
      }

      if (results.length > 0) {
        callback(null, results);
      } else {
        callback(null, []);
      }
    });
  });
};

module.exports = {
  getCallDriveLink,
  markAsAbsentAll,
  markAsPresent,
  markAsAbsent,
  getPostSaleInfo,
  viewBooking,
};
