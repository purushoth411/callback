// models/followerModel.js
const db = require("../config/db"); // Update path if needed
const moment = require("moment-timezone");

const getbooking = (bookingid, callback) => {
    const sql = 'SELECT * FROM tbl_booking WHERE id = ? LIMIT 1';
    db.query(sql, [bookingid], (err, results) => {
        if (err) return callback(err, null);
        if (results.length === 0) return callback(null, null);
        return callback(null, results[0]);
    });
};

// Get all active followers
const getAllActiveFollowers = (callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    const sql = `
      SELECT tbl_follower.id as followerid, tbl_follower.addedon, tbl_follower.status as followstatus, tbl_booking.*, addedby.fld_name as admin_name, addedby.fld_email as admin_email, consultant.fld_name as consultant_name, tbl_user.fld_user_code as user_code, tbl_user.fld_name as user_name, tbl_user.fld_email as user_email, tbl_user.fld_decrypt_password as user_pass, tbl_user.fld_country_code as user_country_code, tbl_user.fld_phone as user_phone, tbl_user.fld_address, tbl_user.fld_city, tbl_user.fld_pincode, tbl_user.fld_country FROM tbl_follower JOIN tbl_booking ON tbl_booking.id = tbl_follower.bookingid LEFT JOIN tbl_admin as addedby ON tbl_booking.fld_addedby = addedby.id LEFT JOIN tbl_admin as consultant ON tbl_booking.fld_consultantid = consultant.id JOIN tbl_user ON tbl_booking.fld_userid = tbl_user.id ORDER BY tbl_follower.id DESC
      `;

    connection.query(sql, (queryErr, results) => {
      connection.release(); // Always release the connection
      if (queryErr) return callback(queryErr, null);
      return callback(null, results);
    });
  });
};

// Get all followers
const getAllFollowers = (usertype, userid, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    let sql = `
      SELECT 
        tbl_follower.id as followerid, 
        tbl_follower.bookingid,
        tbl_follower.follower_consultant_id,
        tbl_follower.consultantid,
        tbl_follower.addedon, 
        tbl_follower.status as followstatus, 
        tbl_booking.*, 
        addedby.fld_name as admin_name, 
        addedby.fld_email as admin_email, 
        consultant.fld_name as consultant_name, 
        tbl_user.fld_user_code as user_code, 
        tbl_user.fld_name as user_name, 
        tbl_user.fld_email as user_email, 
        tbl_user.fld_decrypt_password as user_pass, 
        tbl_user.fld_country_code as user_country_code, 
        tbl_user.fld_phone as user_phone, 
        tbl_user.fld_address, 
        tbl_user.fld_city, 
        tbl_user.fld_pincode, 
        tbl_user.fld_country 
      FROM tbl_follower 
      JOIN tbl_booking ON tbl_booking.id = tbl_follower.bookingid 
      LEFT JOIN tbl_admin as addedby ON tbl_booking.fld_addedby = addedby.id 
      LEFT JOIN tbl_admin as consultant ON tbl_booking.fld_consultantid = consultant.id 
      JOIN tbl_user ON tbl_booking.fld_userid = tbl_user.id
    `;

    const params = [];

    // If consultant, filter by their id
    if (usertype === "CONSULTANT") {
      sql += " WHERE tbl_follower.consultantid = ? OR tbl_follower.follower_consultant_id = ?";
      params.push(userid, userid);
    }

    sql += " ORDER BY tbl_follower.id DESC";

    connection.query(sql, params, (queryErr, results) => {
      connection.release();
      if (queryErr) return callback(queryErr, null);
      return callback(null, results);
    });
  });
};

const insertBookingHistory = (data, callback) => {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const placeholders = fields.map(() => '?').join(', ');

  const query = `
    INSERT INTO tbl_booking_overall_history (${fields.join(', ')}) 
    VALUES (${placeholders})
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, values, (error, result) => {
      connection.release();
      if (error) return callback(error);

      callback(null, result.insertId);
    });
  });
};

const followerclaimbooking = (followerId,bookingId,userId, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const sqlbooking = `UPDATE tbl_booking SET fld_consultantid = ? WHERE id = ?`;

    connection.query(sqlbooking, [userId, bookingId], (queryErr, result) => {
      if (queryErr) return callback(queryErr);

      const sqlfollower = `UPDATE tbl_follower SET status = ? WHERE id = ?`;
      connection.query(sqlfollower, ['Claimed', followerId], (queryErr1, result1) => {
      connection.release();
      if (queryErr1) return callback(queryErr1);
        return callback(null, result1);
      });
    });
  });
};

const getPendingFollowerCallsCount = (usertype, userid, callback) => {
  let sql = `
    SELECT COUNT(*) as pendingCount 
    FROM tbl_follower 
    WHERE status = 'Pending'
  `;
  let params = [];

  if (usertype === "CONSULTANT") {
    sql += " AND (tbl_follower.consultantid = ? OR tbl_follower.follower_consultant_id = ?)";
    params.push(userid, userid);
  }

  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    connection.query(sql, params, (queryErr, results) => {
      connection.release();
      if (queryErr) return callback(queryErr, null);

      return callback(null, results[0]);
    });
  });
};


module.exports = {
  getAllFollowers,
  getAllActiveFollowers,
  getbooking,
  insertBookingHistory,
  followerclaimbooking,
  getPendingFollowerCallsCount,
};
