const db = require("../config/db"); 
const moment = require('moment-timezone');


function getCurrentDate(format = "YYYY-MM-DD") {
  return moment().tz("Asia/Kolkata").format(format);
}

function getDateBefore(days = 0, format = "YYYY-MM-DD") {
  return moment().tz("Asia/Kolkata").subtract(days, "days").format(format);
}
const getAbsentConsultantsCallScheduledBookings = (callback) => {
  db.getConnection((err, connection) => {
    if (err) {
      return callback(err, null);
    }

    const today = getCurrentDate("YYYY-MM-DD");
    const nowTime = getCurrentDate("HH:mm:ss"); // current time in 24hr

    const sql = `
      SELECT 
        b.*, 
        a.fld_client_code AS admin_code, 
        a.fld_name AS admin_name, 
        a.fld_email AS admin_email, 
        a.fld_profile_image AS profile_image, 
        a.fld_client_code AS consultant_code, 
        a.attendance AS consultant_attendance,  
        u.fld_user_code AS user_code, 
        u.fld_name AS user_name, 
        u.fld_email AS user_email, 
        u.fld_decrypt_password AS user_pass, 
        u.fld_country_code AS user_country_code, 
        u.fld_phone AS user_phone, 
        u.fld_address, 
        u.fld_city, 
        u.fld_pincode, 
        u.fld_country
      FROM tbl_booking b
      LEFT JOIN tbl_admin a ON b.fld_consultantid = a.id
      JOIN tbl_user u ON b.fld_userid = u.id
      WHERE b.fld_call_request_sts = 'Call Scheduled'
        AND b.fld_booking_date = ?
        AND b.fld_booking_time > ?
        AND b.callDisabled IS NULL
        AND a.attendance = 'ABSENT'
    `;

    connection.query(sql, [today, nowTime], (error, results) => {
      connection.release();
      if (error) {
        return callback(error, null);
      }
      return callback(null, results);
    });
  });
};

//get acll within 30 mins
const getUpcomingBookings = (callback) => {
  db.getConnection((err, connection) => {
    if (err) {
      return callback(err, null);
    }

    const currentDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
    const startTime = moment().tz("Asia/Kolkata").format("hh:mm A"); // 03:00 PM
    const endTime = moment().tz("Asia/Kolkata").add(30, "minutes").format("hh:mm A"); // 03:30 PM

    const sql = `
      SELECT *
      FROM tbl_booking
      WHERE fld_booking_date = ?
      AND STR_TO_DATE(fld_booking_slot, '%h:%i %p')
          BETWEEN STR_TO_DATE(?, '%h:%i %p') AND STR_TO_DATE(?, '%h:%i %p')
      AND fld_consultation_sts = 'Pending'
      AND (fld_call_request_sts = 'Call Scheduled' OR fld_call_request_sts = 'Call Rescheduled')
      AND fld_call_related_to != 'direct_call'
    `;

    connection.query(sql, [currentDate, startTime, endTime], (error, results) => {
      connection.release();
      if (error) {
        return callback(error, null);
      }
      return callback(null, results);
    });
  });
};




module.exports = {
    getAbsentConsultantsCallScheduledBookings,
    getUpcomingBookings,
  
    
}