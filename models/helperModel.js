// models/helperModel.js
const db = require("../config/db"); // Update path if needed
const moment = require("moment-timezone");

// Get all active teams
const getAllActiveTeams = (callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    const sql = `
      SELECT * FROM tbl_team
      WHERE status = 'Active'
      ORDER BY fld_addedon DESC
    `;

    connection.query(sql, (queryErr, results) => {
      connection.release(); // Always release the connection
      if (queryErr) return callback(queryErr, null);
      return callback(null, results);
    });
  });
};

// Get all teams
const getAllTeams = (callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    const sql = `
      SELECT * FROM tbl_team
      ORDER BY fld_addedon DESC
    `;

    connection.query(sql, (queryErr, results) => {
      connection.release();
      if (queryErr) return callback(queryErr, null);
      return callback(null, results);
    });
  });
};

// Add a new team
const addTeam = (teamData, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const sql = `INSERT INTO tbl_team (fld_title, fld_addedon, status) VALUES (?, NOW(), 'Active')`;

    connection.query(sql, [teamData.team], (queryErr, result) => {
      connection.release();
      if (queryErr) return callback(queryErr);
      return callback(null, result);
    });
  });
};

// Update team title
const updateTeam = (id, teamData, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const sql = `UPDATE tbl_team SET fld_title = ? WHERE id = ?`;

    connection.query(sql, [teamData.team, id], (queryErr, result) => {
      connection.release();
      if (queryErr) return callback(queryErr);
      return callback(null, result);
    });
  });
};

// Update team status
const updateTeamStatus = (teamId, status, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const sql = `UPDATE tbl_team SET status = ? WHERE id = ?`;

    connection.query(sql, [status, teamId], (queryErr, result) => {
      connection.release();
      if (queryErr) return callback(queryErr);
      return callback(null, result);
    });
  });
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

  db.getConnection((err, connection) => {
    if (err) {
      console.error("DB connection error (getAllDomains):", err);
      return callback(err, null);
    }

    connection.query(sql, [], (error, results) => {
      connection.release(); // Important to release the connection
      if (error) {
        console.error("Query error (getAllDomains):", error);
        return callback(error, null);
      }

      return callback(null, results);
    });
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

const getAllActiveBothConsultants = (callback) => {
  const query = `
    SELECT id, fld_name, fld_email, fld_phone, fld_username, fld_permission
    FROM tbl_admin 
    WHERE status = 'Active'
      AND attendance = 'PRESENT'
      AND (
        fld_admin_type = 'CONSULTANT' 
        OR fld_admin_type = 'SUBADMIN'
      )
  `;

  db.getConnection((err, connection) => {
    if (err) {
      console.error("DB connection error:", err);
      return callback(err, null);
    }

    connection.query(query, (error, results) => {
      connection.release();
      if (error) {
        console.error("Query error (consultants):", error);
        return callback(error, null);
      }
      return callback(null, results);
    });
  });
};


const getAdmin = (type, status, callback) => {
  let query = `
    SELECT * FROM tbl_admin
    WHERE status = ?
  `;
  let params = [status];

  if (type !== "BOTH") {
    query += ` AND fld_admin_type = ?`;
    params.push(type);
  } else {
    query += ` AND fld_admin_type IN ('CONSULTANT', 'SUBADMIN')`;
  }

  db.getConnection((err, connection) => {
    if (err) {
      console.error("DB connection error:", err);
      return callback(err, null);
    }

    connection.query(query, params, (error, results) => {
      connection.release();
      if (error) {
        console.error("Query error (getAdmin):", error);
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
  SELECT b.*, r.slot_time AS rc_slot_time, r.booking_date AS rc_booking_date, a.fld_name AS consultant_name
  FROM tbl_booking b
  LEFT JOIN tbl_rc_call_booking_request r ON r.id = b.fld_call_request_id
  LEFT JOIN tbl_admin a ON a.id = b.fld_consultantid
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

const getUsersByRole = (role, status, callback) => {
  db.getConnection((err, connection) => {
    if (err) {
      console.error("Connection error:", err);
      return callback(err);
    }

    let query = "SELECT id, fld_name FROM tbl_admin WHERE fld_admin_type = ?";
    const params = [role];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    connection.query(query, params, (err, results) => {
      connection.release();

      if (err) {
        console.error("Query error:", err);
        return callback(err);
      }

      callback(null, results);
    });
  });
};

const fetchTimezones = (viewtype = "", callback) => {
  try {
    const tzList = moment.tz.names();
    let formattedList = {};
    let index = 1;

    tzList.forEach((tz) => {
      const now = moment().tz(tz);

      if (viewtype === "show_custom_booking") {
        formattedList[index] = tz;
      } else {
        const abbr = now.zoneAbbr(); // e.g., IST
        const offset = now.format("Z"); // e.g., +05:30
        const time = now.format("hh:mm A"); // e.g., 02:25 PM
        formattedList[index] = `${tz}  ${abbr} ${offset}  ${time}`;
      }

      index++;
    });

    callback(null, formattedList);
  } catch (error) {
    callback(error, null);
  }
};

const getBookingData = (params, callback) => {
  try {
    db.getConnection((err, connection) => {
      if (err) return callback(err, null);

      const {
        bookingId = "",
        consultantId = "",
        userId = "",
        selectedDate = "",
        status = "",
        orderBy = "DESC",
        addedBy = "",
        checkType = "",
        selectedSlot = "",
        callExternalAssign = "",
        showAcceptedCall = "",
        verifyOtpUrl = "",
        hideSubOption = "",
        clientId = "",
        disabledBookingId = "",
      } = params;

      let sql = `
        SELECT 
          b.*, 
          a.fld_client_code AS admin_code, a.fld_name AS admin_name, a.fld_email AS admin_email, a.fld_profile_image, 
          a.fld_client_code AS consultant_code, 
          u.fld_user_code AS user_code, u.fld_name AS user_name, u.fld_email AS user_email, 
          u.fld_decrypt_password AS user_pass, u.fld_country_code AS user_country_code, u.fld_phone AS user_phone, 
          u.fld_address, u.fld_city, u.fld_pincode, u.fld_country
        FROM tbl_booking b
        LEFT JOIN tbl_admin a ON b.fld_consultantid = a.id
        LEFT JOIN tbl_user u ON b.fld_userid = u.id
        WHERE b.callDisabled IS NULL
      `;

      const values = [];

      if (bookingId) {
        sql += " AND b.id = ?";
        values.push(bookingId);
      }

      if (consultantId && checkType !== "CHECK_BOTH") {
        sql += " AND b.fld_consultantid = ?";
        values.push(consultantId);
      }

      if (checkType === "CHECK_BOTH") {
        sql +=
          " AND (b.fld_consultantid = ? OR b.fld_secondary_consultant_id = ? OR b.fld_third_consultantid = ?)";
        values.push(consultantId, consultantId, consultantId);
      }

      if (addedBy) {
        sql += " AND b.fld_addedby = ?";
        values.push(addedBy);
      }

      if (userId) {
        sql += " AND b.fld_userid = ?";
        values.push(userId);
      }

      if (clientId) {
        sql += " AND b.fld_client_id = ? AND b.id != ?";
        values.push(clientId, disabledBookingId || 0);
      }

      if (status == "Reject") {
        sql +=
          " AND b.fld_consultation_sts != 'Reject' AND b.fld_consultation_sts != 'Rescheduled'";
      }

      if (showAcceptedCall === "Yes") {
        sql += " AND b.fld_consultation_sts = 'Accept'";
      }

      if (verifyOtpUrl) {
        sql += " AND b.fld_verify_otp_url = ?";
        values.push(verifyOtpUrl);
      }

      if (status === "Completed") {
        sql += " AND b.fld_consultation_sts = 'Completed'";
      }

      if (selectedDate) {
        sql += " AND b.fld_booking_date = ?";
        values.push(selectedDate);
      }

      if (selectedSlot) {
        sql += " AND b.fld_booking_slot = ?";
        values.push(selectedSlot);
      }

      if (callExternalAssign) {
        sql += " AND b.fld_call_external_assign = ?";
        values.push(callExternalAssign);
      }

      if (hideSubOption) {
        sql +=
          " AND (b.fld_consultant_another_option = 'CONSULTANT' OR b.fld_consultant_another_option IS NULL)";
      }

      sql += ` ORDER BY b.id ${orderBy}`;

      connection.query(sql, values, (err, results) => {
        connection.release();
        if (err) return callback(err, null);
        return callback(null, bookingId ? results[0] : results);
      });
    });
  } catch (error) {
    return callback(error, null);
  }
};

const getRcCallBookingRequest = (params, callback) => {
  try {
    db.getConnection((err, connection) => {
      if (err) return callback(err, null);

      const {
        id = "",
        crmId = "",
        consultantId = "",
        selectedDate = "",
        selectedSlot = "",
        status = "",
      } = params;

      let sql = `
        SELECT 
          r.*, 
          b.id AS bookingid, 
          crm.fld_name 
        FROM tbl_rc_call_booking_request r 
        LEFT JOIN tbl_booking b ON r.id = b.fld_call_request_id 
        LEFT JOIN tbl_admin crm ON r.crmid = crm.id 
        WHERE r.reqFrom = 'RC'
      `;

      const values = [];

      if (crmId) {
        sql += " AND r.crmid = ?";
        values.push(crmId);
      }

      if (id) {
        sql += " AND r.id = ?";
        values.push(id);
      }

      if (selectedDate) {
        sql += " AND r.booking_date = ?";
        values.push(selectedDate);
      }

      if (selectedSlot) {
        sql += " AND r.slot_time = ?";
        values.push(selectedSlot);
      }

      if (consultantId) {
        sql += " AND r.consultantid = ?";
        values.push(consultantId);
      }

      if (status) {
        sql += " AND r.call_request_sts = ?";
        values.push(status);
      }

      sql += " ORDER BY r.id DESC";

      connection.query(sql, values, (err, results) => {
        connection.release();
        if (err) return callback(err, null);
        return callback(null, id ? results[0] : results);
      });
    });
  } catch (error) {
    return callback(error, null);
  }
};

const getAdminById = (adminId, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(
      "SELECT * FROM tbl_admin WHERE id = ?",
      [adminId],
      (error, results) => {
        connection.release();
        callback(error, results[0]);
      }
    );
  });
};

const getMessagesByBookingId = (bookingId, callback) => {
  db.getConnection((err, connection) => {
    if (err) {
      console.error("Connection error:", err);
      return callback(err, null);
    }

    const query = `
        SELECT tbl_booking_chat.* , tbl_admin.fld_name as sender_name 
        FROM tbl_booking_chat
        LEFT JOIN tbl_admin ON tbl_booking_chat.fld_sender_id = tbl_admin.id
        WHERE tbl_booking_chat.fld_bookingid = ?
        ORDER BY tbl_booking_chat.fld_addedon ASC
      `;

    connection.query(query, [bookingId], (queryErr, results) => {
      connection.release(); 

      if (queryErr) {
        console.error("Query error:", queryErr);
        return callback(queryErr, null);
      }

      return callback(null, results);
    });
  });
};

const getMessageCount = (bookingid, callback) => {
  try {
    db.getConnection((err, connection) => {
      if (err) return callback(err);

      const query = `SELECT COUNT(*) AS count FROM tbl_booking_chat WHERE fld_bookingid = ?`;
      connection.query(query, [bookingid], (err, results) => {
        connection.release();
        callback(err, results);
      });
    });
  } catch (error) {
    callback(error);
  }
};

const insertChatMessage = (data, callback) => {
  try {
    db.getConnection((err, connection) => {
      if (err) return callback(err);

      const query = `INSERT INTO tbl_booking_chat SET ?`;
      connection.query(query, data, (err, results) => {
        connection.release();
        callback(err, results);
      });
    });
  } catch (error) {
    callback(error);
  }
};

const getFollowerData = (filters, callback) => {
  db.getConnection((err, connection) => {
    if (err) {
      console.error("Connection error:", err);
      return callback(err);
    }

    let query = "SELECT * FROM tbl_follower WHERE 1=1";
    const params = [];

    if (filters.id) {
      query += " AND id = ?";
      params.push(filters.id);
    }
    if (filters.follower_consultant_id) {
      query += " AND follower_consultant_id = ?";
      params.push(filters.follower_consultant_id);
    }
    if (filters.bookingid) {
      query += " AND bookingid = ?";
      params.push(filters.bookingid);
    }
    if (filters.consultantid) {
      query += " AND consultantid = ?";
      params.push(filters.consultantid);
    }
    if (filters.status) {
      query += " AND status = ?";
      params.push(filters.status);
    }

    connection.query(query, params, (err, results) => {
      connection.release();

      if (err) {
        return callback(err);
      }

      
      if (filters.id) {
        return callback(null, results[0] || null);
      } else {
        return callback(null, results);
      }
    });
  });
};

const checkFollowerExists = (bookingId, followerId, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);
    const sql = `SELECT id FROM tbl_follower WHERE bookingid = ? AND follower_consultant_id = ?`;
    connection.query(sql, [bookingId, followerId], (err, results) => {
      connection.release();
      if (err) return callback(err);
      callback(null, results.length > 0);
    });
  });
};

const insertFollower = (data, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);
    const sql = `
      INSERT INTO tbl_follower (bookingid, follower_consultant_id, consultantid, addedon)
      VALUES (?, ?, ?, ?)
    `;
    const values = [data.bookingid, data.follower_consultant_id, data.consultantid, data.addedon];
    connection.query(sql, values, (err, result) => {
      connection.release();
      if (err) return callback(err);
      callback(null, result.insertId);
    });
  });
};

 const getNotifications = (user, callback) => {
      
let sql;
let params = [];
      if (user.fld_admin_type.toUpperCase() === 'SUPERADMIN') {
        sql = `
          SELECT id, fld_bookingid, fld_sender_id, fld_receiver_id, fld_message, fld_postedby, fld_view_status,
                 fld_read_status, fld_read_time, fld_addedon
          FROM tbl_booking_chat
          WHERE  fld_read_status = 'UNREAD'
          ORDER BY fld_addedon DESC
          
          LIMIT 50
        `;
      } else {
        sql = `
          SELECT id, fld_bookingid, fld_sender_id, fld_receiver_id, fld_message, fld_postedby, fld_view_status,
                 fld_read_status, fld_read_time, fld_addedon
          FROM tbl_booking_chat
          WHERE fld_receiver_id = ? AND fld_read_status = 'UNREAD'
          ORDER BY fld_addedon DESC
          LIMIT 50
        `;
        params = [user.id];
      }

      db.getConnection((err, connection) => {
        if (err) return callback(err);

        connection.query(sql, params, (queryErr, results) => {
          connection.release();
          if (queryErr) return callback(queryErr);

          callback(null, results);
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
  getUsersByRole,
  fetchTimezones,
  getBookingData,
  getRcCallBookingRequest,

  getAdmin,
  getAdminById,
  getMessagesByBookingId,
  getMessageCount,
  insertChatMessage,
  getFollowerData,
  getAllActiveBothConsultants,
  insertFollower,
  checkFollowerExists,
  getNotifications
};
