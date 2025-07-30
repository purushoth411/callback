const db = require("../config/db");
const instacrm_db = require("../config/instacrm_db");
const rc_db = require("../config/rc_db");
const moment = require('moment');


const getBookings = (userId, userType, assigned_team, filters, dashboard_status, callback) => {
  const currentDate = moment();
  const twoDaysBefore = currentDate.clone().subtract(2, 'days').format('YYYY-MM-DD');
  const twoDaysAfter = currentDate.clone().add(2, 'days').format('YYYY-MM-DD');

  let sql = `
    SELECT 
      b.*,
      b.id AS booking_id,
      consultant.fld_name AS consultant_name,
      consultant.fld_email AS consultant_email,
      crm.fld_name AS crm_name,
      crm.fld_email AS crm_email,
      user.fld_name AS client_name,
      user.fld_email AS client_email,
      user.fld_phone AS client_phone,
      user.fld_city,
      user.fld_country
    FROM tbl_booking b
    LEFT JOIN tbl_admin consultant ON b.fld_consultantid = consultant.id
    LEFT JOIN tbl_admin crm ON b.fld_addedby = crm.id
    LEFT JOIN tbl_user user ON b.fld_userid = user.id
    WHERE b.callDisabled IS NULL
  `;

  const params = [];

  const buildFilters = () => {
    if (Array.isArray(filters.consultationStatus) && filters.consultationStatus.length > 0) {
      const placeholders = filters.consultationStatus.map(() => "?").join(",");
      sql += ` AND b.fld_consultation_sts IN (${placeholders})`;
      params.push(...filters.consultationStatus);
    } else if (filters.consultationStatus) {
      sql += ` AND b.fld_consultation_sts = ?`;
      params.push(filters.consultationStatus);
    }

    if (filters.recordingStatus) {
      sql += ` AND b.callRecordingSts = ?`;
      params.push(filters.recordingStatus);
    }

    if (filters.sale_type) {
      sql += ` AND b.fld_sale_type = ?`;
      params.push(filters.sale_type);
    }

    if (filters.consultantId) {
      sql += ` AND b.fld_consultantid = ?`;
      params.push(filters.consultantId);
    }

    if (filters.crmId) {
      sql += ` AND b.fld_addedby = ?`;
      params.push(filters.crmId);
    }

    if (filters.search) {
      sql += ` AND (b.fld_name LIKE ? OR b.fld_email LIKE ?)`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.fromDate && filters.toDate) {
      const dateField = filters.filter_type === "Created" ? "b.fld_addedon" : "b.fld_booking_date";
      sql += ` AND DATE(${dateField}) BETWEEN ? AND ?`;
      params.push(filters.fromDate, filters.toDate);
    } else if (filters.fromDate) {
      const dateField = filters.filter_type === "Created" ? "b.fld_addedon" : "b.fld_booking_date";
      sql += ` AND DATE(${dateField}) >= ?`;
      params.push(filters.fromDate);
    } else if (filters.toDate) {
      const dateField = filters.filter_type === "Created" ? "b.fld_addedon" : "b.fld_booking_date";
      sql += ` AND DATE(${dateField}) <= ?`;
      params.push(filters.toDate);
    }

    if (dashboard_status) {
      sql += ` AND b.fld_call_request_sts = ?`;
      params.push(dashboard_status);
      sql += ` AND b.fld_consultation_sts = ?`;
      params.push(dashboard_status);
      sql += ` AND b.fld_booking_date BETWEEN ? AND ?`;
      params.push(twoDaysBefore, twoDaysAfter);
    }

    sql += `
      ORDER BY 
        CASE 
          WHEN DATE(b.fld_booking_date) = CURDATE() THEN 1 
          WHEN DATE(b.fld_booking_date) > CURDATE() THEN 2 
          ELSE 3 
        END ASC,
        CASE 
          WHEN DATE(b.fld_booking_date) < CURDATE() THEN b.fld_booking_date 
        END DESC,
        b.fld_booking_slot ASC
      LIMIT 500
    `;
  };

  const executeQuery = (conn) => {
    buildFilters();
    conn.query(sql, params, (err, results) => {
      conn.release(); // 🔓 always release the connection
      if (err) return callback(err);
      callback(null, results);
    });
  };

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    if (userType === "SUPERADMIN") {
      executeQuery(connection);
    } else if (userType === "SUBADMIN" && assigned_team) {
      const teamIds = assigned_team
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      if (teamIds.length > 0) {
        const placeholders = teamIds.map(() => "?").join(",");
        const teamQuery = `SELECT team_members FROM tbl_teams WHERE id IN (${placeholders})`;

        connection.query(teamQuery, teamIds, (err, rows) => {
          if (err) {
            connection.release();
            return callback(err);
          }

          let teamUserIds = [];
          rows.forEach((row) => {
            if (row.team_members) {
              teamUserIds.push(...row.team_members.split(",").map((id) => id.trim()));
            }
          });

          const uniqueUserIds = [...new Set([...teamUserIds, String(userId)])];
          if (uniqueUserIds.length === 0) {
            connection.release();
            return callback(null, []);
          }

          const uidPlaceholders = uniqueUserIds.map(() => "?").join(",");
          sql += ` AND (b.fld_consultantid IN (${uidPlaceholders}) OR b.fld_addedby IN (${uidPlaceholders}))`;
          params.push(...uniqueUserIds, ...uniqueUserIds);

          executeQuery(connection);
        });
      } else {
        sql += ` AND (b.fld_consultantid = ? OR b.fld_addedby = ?)`;
        params.push(userId, userId);
        executeQuery(connection);
      }
    } else if (userType === "CONSULTANT") {
      sql += ` AND b.fld_consultantid = ?`;
      params.push(userId);
      executeQuery(connection);
    } else if (userType === "EXECUTIVE") {
      sql += ` AND b.fld_addedby = ?`;
      params.push(userId);
      executeQuery(connection);
    } else {
      sql += ` AND 1 = 0`; // fallback - no access
      executeQuery(connection);
    }
  });
};



const getBookingHistory = (bookingId, callback) => {
  const sql = `
    SELECT 
      id,
      fld_booking_id,
      fld_comment,
      fld_rescheduled_date_time,
      fld_addedon,
      fld_notif_view_sts,
      fld_notif_for,
      fld_notif_for_id,
      view_sts,
      crmIdsNotifi
    FROM tbl_booking_overall_history
    WHERE fld_booking_id = ?
    ORDER BY fld_addedon DESC
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(sql, [bookingId], (queryErr, results) => {
      connection.release();
      if (queryErr) return callback(queryErr);
      return callback(null, results);
    });
  });
};


// Get Presales client details from InstaCRM
const getPresaleClientDetails = (client_id, callback) => {
  instacrm_db.getConnection((err, connection) => {
    if (err) return callback(err);

    const queryAssignSQL = `
      SELECT 
        aq.query_id,
        w.website AS insta_website,
        c.company_name
      FROM tbl_assign_query aq
      LEFT JOIN tbl_website w ON aq.website_id = w.id
      LEFT JOIN tbl_company c ON aq.company_id = c.id
      WHERE aq.id = ?
      LIMIT 1
    `;

    connection.query(queryAssignSQL, [client_id], (err, assignResult) => {
      if (err) {
        connection.release();
        return callback(err);
      }

      if (!assignResult || assignResult.length === 0) {
        connection.release();
        return callback(null, null);
      }

      const { query_id, insta_website, company_name } = assignResult[0];

      const queryDetailsSQL = `
        SELECT 
          name,
          email_id AS email,
          alt_email_id,
          phone
        FROM tbl_query 
        WHERE id = ? 
        LIMIT 1
      `;

      connection.query(queryDetailsSQL, [query_id], (err2, queryResult) => {
        connection.release();

        if (err2) return callback(err2);
        if (!queryResult || queryResult.length === 0) return callback(null, null);

        const queryData = queryResult[0];
        queryData.insta_website = insta_website || null;
        queryData.assigned_company = company_name || null;

        return callback(null, queryData);
      });
    });
  });
};


const getPostsaleClientDetails = (client_id, callback) => {
  rc_db.getConnection((err, connection) => {
    if (err) return callback(err);

    const studentSQL = `
      SELECT 
        st_id,
        st_name AS name,
        st_email AS email,
        contact_no AS phone,
        address1
      FROM tbl_scholar 
      WHERE student_code = ? 
      LIMIT 1
    `;

    connection.query(studentSQL, [client_id], (err, studentResult) => {
      if (err) {
        connection.release();
        return callback(err);
      }

      if (!studentResult || studentResult.length === 0) {
        connection.release();
        return callback(null, null);
      }

      const student = studentResult[0];
      const st_id = student.st_id;

      const projectSQL = `SELECT id, project_title FROM tbl_project WHERE student_id = ?`;

      connection.query(projectSQL, [st_id], (err2, projectResults) => {
        if (err2) {
          connection.release();
          return callback(err2);
        }

        const planSQL = `
          SELECT plan_type 
          FROM tbl_clients_plan_upgrade 
          WHERE client_id = ? AND status = 2 
          ORDER BY id DESC 
          LIMIT 1
        `;

        connection.query(planSQL, [st_id], (err3, planResult) => {
          connection.release();

          if (err3) return callback(err3);

          const plan_type = (planResult && planResult.length > 0) ? planResult[0].plan_type : null;

          const response = {
            name: student.name,
            email: student.email,
            phone: student.phone,
            projects: projectResults || [],
            plan_type: plan_type,
          };

          return callback(null, response);
        });
      });
    });
  });
};



const getProjectMilestones = (projectId, callback) => {
  const sql = `
    SELECT id, segment_title 
    FROM tbl_segment 
    WHERE project_id = ?
    ORDER BY segment_date ASC
  `;

  rc_db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(sql, [projectId], (queryErr, results) => {
      connection.release();
      if (queryErr) return callback(queryErr);
      return callback(null, results);
    });
  });
};


const checkCallrecording = (email, ref_id, callback) => {
  const sql = `
    SELECT * FROM tbl_booking 
    WHERE fld_email = ? 
      AND fld_client_id = ? 
      AND fld_call_request_sts = 'Completed' 
      AND callRecordingSts = 'Call Recording Pending' 
      AND fld_addedon > '2025-06-06 00:00:00'
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(sql, [email.trim(), ref_id.trim()], (queryErr, results) => {
      connection.release();
      if (queryErr) return callback(queryErr);
      return callback(null, results);
    });
  });
};


const checkConsultantClientWebsite = (
  consultantid,
  email,
  insta_website,
  callback
) => {
  const sql = `
    SELECT * FROM tbl_booking 
    WHERE fld_email = ? 
      AND fld_consultantid = ? 
      AND fld_sale_type = ? 
      AND fld_insta_website IS NOT NULL 
    ORDER BY id DESC 
    LIMIT 1
  `;

  db.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting DB connection:", err);
      return callback(err, null);
    }

    connection.query(
      sql,
      [email, consultantid, "Presales"],
      (queryErr, results) => {
        connection.release(); // release whether success or failure

        if (queryErr) {
          console.error("Query error:", queryErr);
          return callback(queryErr, null);
        }

        if (results.length > 0) {
          return callback(null, results[0]);
        } else {
          return callback(null, null);
        }
      }
    );
  });
};

const checkConsultantCompletedCall = (
  consultantId,
  clientEmail,
  saleType,
  loginCrmId,
  callback
) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const sql = `
      SELECT * FROM tbl_booking 
      WHERE fld_consultantid = ? 
        AND fld_email = ? 
        AND fld_consultation_sts = 'Completed' 
        AND fld_call_request_sts = 'Completed' 
        AND fld_sale_type = ? 
      ORDER BY id DESC LIMIT 1
    `;

    connection.query(
      sql,
      [consultantId, clientEmail, saleType],
      (err, results) => {
        if (err) {
          connection.release();
          return callback(err);
        }

        if (results.length === 0) {
          connection.release();
          return callback(null, "call not completed");
        }

        const result1 = results[0];
        const bookingId = result1.id;
        const teamId = result1.fld_teamid;

        const adminSql = `SELECT fld_team_id FROM tbl_admin WHERE id = ?`;

        connection.query(adminSql, [loginCrmId], (err, adminResults) => {
          if (err) {
            connection.release();
            return callback(err);
          }

          const loginTeamId = adminResults[0]?.fld_team_id;

          if (loginTeamId === teamId) {
            connection.release();
            return callback(null, "add call");
          }

          const historySql = `
          SELECT fld_call_completed_date FROM tbl_booking_sts_history 
          WHERE fld_booking_id = ? AND status = 'Completed' 
          ORDER BY id DESC LIMIT 1
        `;

          connection.query(historySql, [bookingId], (err, historyResults) => {
            if (err) {
              connection.release();
              return callback(err);
            }

            let callCompletedDate =
              historyResults.length > 0
                ? historyResults[0].fld_call_completed_date
                : null;

            if (!callCompletedDate) {
              const overallSql = `
              SELECT fld_addedon FROM tbl_booking_overall_history 
              WHERE fld_booking_id = ? AND fld_comment LIKE '%Call Completed by%' 
              ORDER BY id DESC LIMIT 1
            `;

              connection.query(
                overallSql,
                [bookingId],
                (err, overallResults) => {
                  connection.release();
                  if (err) return callback(err);

                  if (overallResults.length === 0) {
                    return callback(null, "call not completed");
                  }

                  const callDate = overallResults[0].fld_addedon;
                  const msg = `Call completed with client ${result1.fld_name} by consultant ${consultantId} on date ${callDate}`;
                  return callback(
                    null,
                    `${msg}||${result1.fld_consultantid}||${consultantId}`
                  );
                }
              );
            } else {
              connection.release();
              const msg = `Call completed with client ${result1.fld_name} by consultant ${consultantId} on date ${callCompletedDate}`;
              return callback(
                null,
                `${msg}||${result1.fld_consultantid}||${consultantId}`
              );
            }
          });
        });
      }
    );
  });
};

const checkPresalesCall = (email, consultantId, callback) => {
  db.getConnection((err, connection) => {
    if (err) {
      console.error("DB connection error:", err);
      return callback(err, null);
    }

    const query = `
      SELECT * FROM tbl_booking 
      WHERE fld_email = ? 
        AND fld_consultantid = ? 
        AND fld_sale_type = 'Presales' 
        AND fld_call_request_sts NOT IN ('Reject', 'Cancelled') 
        AND fld_consultation_sts != 'Reject'
      LIMIT 1
    `;

    const values = [email, consultantId];

    connection.query(query, values, (error, results) => {
      connection.release(); // Important to release connection

      if (error) {
        console.error("Query error:", error);
        return callback(error, null);
      }

      return callback(null, results);
    });
  });
};

const getClientCallsRequestPlanLimitOver = (email, status, milestoneId, callback) => {
  if (!email) return callback(null, { totalrow: 0 });

  const query = `
    SELECT COUNT(*) as totalrow 
    FROM tbl_booking 
    WHERE fld_email = ? AND callDisabled = ? AND fld_rc_milestoneid = ?
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, [email, status, milestoneId], (error, results) => {
      connection.release();
      if (error) return callback(error);
      callback(null, results[0]);
    });
  });
};

const getMeetingId = (callback) => {
  const query = `
    SELECT fld_bookingcode 
    FROM tbl_booking 
    WHERE fld_bookingcode != '' 
    ORDER BY id DESC 
    LIMIT 1
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, (error, results) => {
      connection.release();
      if (error) return callback(error);

      let orderNo = 1;
      if (results.length > 0) {
        const lastCode = results[0].fld_bookingcode;
        const parts = lastCode.split('#');
        if (parts.length > 1) orderNo = parseInt(parts[1]) + 1;
      }

      const rand = Math.floor(Math.random() * (999 - 111 + 1)) + 111;
      const padded = orderNo.toString().padStart(3, '0');
      const newCode = `PGDN-MEETID${rand}#${padded}`;

      callback(null, newCode);
    });
  });
};



const insertBooking = (
  bookingData,
  crmId,
  email,
  sale_type = '',
  consultantId = '',
  forcePresalesAdd = '',
  clientId = '',
  callback
) => {
  const dbFields = [];
  const dbValues = [];

  let baseQuery = `SELECT * FROM tbl_booking WHERE fld_email = ?`;
  dbValues.push(email);

  if (sale_type === 'Presales') {
    baseQuery += ` AND fld_client_id = ?`;
    dbValues.push(clientId);

    if (parseInt(consultantId) > 0) {
      baseQuery += ` AND fld_consultantid = ?`;
      dbValues.push(consultantId);
    }

    baseQuery += `
      AND fld_sale_type = 'Presales'
      AND fld_call_request_sts NOT IN ('Client did not join', 'Completed', 'Reject', 'Cancelled')
      AND fld_consultation_sts NOT IN ('Reject', 'Client did not join')
    `;
  } else {
    baseQuery += `
      AND fld_addedby = ?
      AND fld_call_request_sts NOT IN ('Client did not join', 'Completed', 'Reject', 'Cancelled')
      AND fld_consultation_sts NOT IN ('Reject', 'Client did not join')
    `;
    dbValues.push(crmId);
  }

  baseQuery += ` AND callDisabled IS NULL`;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(baseQuery, dbValues, (selectErr, results) => {
      if (selectErr) {
        connection.release();
        return callback(selectErr);
      }

      const allowInsert =
        (results.length === 0 && email !== "") ||
        (forcePresalesAdd === 'Yes' && sale_type === 'Presales');

      if (allowInsert) {
        const fields = Object.keys(bookingData);
        const values = Object.values(bookingData);
        const placeholders = fields.map(() => '?').join(', ');
        const insertQuery = `INSERT INTO tbl_booking (${fields.join(', ')}) VALUES (${placeholders})`;

        connection.query(insertQuery, values, (insertErr, result) => {
          connection.release();
          if (insertErr) return callback(insertErr);
          return callback(null, result.insertId);
        });
      } else {
        connection.release();
        return callback(null, false); // same as `return false` in PHP
      }
    });
  });
};

const updateBooking = (bookingId, updateData, callback) => {
  const fields = Object.keys(updateData);
  const values = Object.values(updateData);
  const setClause = fields.map(field => `${field} = ?`).join(', ');
  const query = `UPDATE tbl_booking SET ${setClause} WHERE id = ?`;
  values.push(bookingId);

  db.getConnection((err, connection) => {
    if (err){
      console.error("Update Booking Error for ID", id, err); // DEBUG LOG
      console.log("Data tried to update:", data);  
return callback(err);
    } 

    connection.query(query, values, (error, result) => {
      connection.release();
      if (error) return callback(error);
      callback(null, result.affectedRows > 0);
    });
  });
};

const getConsultantId = (bookingId, callback) => {
  let query = `
    SELECT 
      tb.*, 
      trcbr.slot_time as rc_slot_time, 
      trcbr.booking_date as rc_booking_date 
    FROM tbl_booking tb 
    LEFT JOIN tbl_rc_call_booking_request trcbr 
      ON trcbr.id = tb.fld_call_request_id 
    WHERE tb.callDisabled IS NULL
  `;

  const params = [];

  if (bookingId) {
    query += ' AND tb.id = ?';
    params.push(bookingId);
  }

  query += ' ORDER BY tb.id DESC';

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, params, (error, results) => {
      connection.release();
      if (error) return callback(error);

      callback(null, bookingId ? results[0] : results);
    });
  });
};


const insertAddCallRequest = (data, callback) => {
  const query = `
    INSERT INTO tbl_approve_addcall_request 
    (bookingId, planId, requestMessage, userId, addedon) 
    VALUES (?, ?, ?, ?, ?)
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, [
      data.bookingId,
      data.planId,
      data.requestMessage,
      data.userId,
      data.addedon
    ], (error, result) => {
      connection.release();
      if (error) return callback(error);

      callback(null, result.insertId);
    });
  });
};


const insertExternalCall = (data, callback) => {
  const query = `
    INSERT INTO tbl_external_calls 
    (fld_booking_id, fld_call_added_by, fld_consultation_sts, fld_call_request_sts, fld_added_on) 
    VALUES (?, ?, ?, ?, ?)
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, [
      data.fld_booking_id,
      data.fld_call_added_by,
      data.fld_consultation_sts,
      data.fld_call_request_sts,
      data.fld_added_on
    ], (error, result) => {
      connection.release();
      if (error) return callback(error);

      callback(null, result.insertId);
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

const insertBookingStatusHistory = (data, callback) => {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const placeholders = fields.map(() => '?').join(', ');
  const query = `INSERT INTO tbl_booking_sts_history (${fields.join(', ')}) VALUES (${placeholders})`;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, values, (error, result) => {
      connection.release();
      if (error) return callback(error);

      callback(null, result.insertId);
    });
  });
};


const getAdmin = (adminId, adminType, callback) => {
  let query = 'SELECT * FROM tbl_admin WHERE id = ?';
  const params = [adminId];

  if (adminType) {
    query += ' AND fld_admin_type = ?';
    params.push(adminType);
  }

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, params, (error, results) => {
      connection.release();
      if (error) return callback(error);

      callback(null, results[0]);
    });
  });
};

const getAdminById = (adminId, callback) => {
  if (!adminId) return callback(new Error("Admin ID is required"));

  const query = 'SELECT * FROM tbl_admin WHERE id = ?';

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, [adminId], (error, results) => {
      connection.release();
      if (error) return callback(error);

      if (results.length > 0) {
        callback(null, results[0]);
      } else {
        callback(null, null); // No admin found
      }
    });
  });
};




const insertUser = (data, email, name, verifyCode, callback) => {
  if (!email) {
    return callback(null, false);
  }

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    // Check if user already exists
    const checkQuery = 'SELECT id FROM tbl_user WHERE fld_email = ?';
    connection.query(checkQuery, [email], (checkErr, checkResults) => {
      if (checkErr) {
        connection.release();
        return callback(checkErr);
      }

      if (checkResults.length === 0) {
        // Insert new user
        const insertQuery = 'INSERT INTO tbl_user SET ?';
        connection.query(insertQuery, data, (insertErr, insertResult) => {
          connection.release();
          if (insertErr) return callback(insertErr);

          return callback(null, insertResult.insertId);
        });
      } else {
        // Return existing user ID
        connection.release();
        return callback(null, checkResults[0].id);
      }
    });
  });
};



const updateRcCallRequestSts = (callRequestId, rcCallRequestId, status, callback = () => {}) => {
  if (!callRequestId || !rcCallRequestId || !status) {
    return callback(null, false);
  }

  db.getConnection((mainErr, mainConn) => {
    if (mainErr) {
      console.error("Main DB connection error:", mainErr);
      return callback(mainErr, null);
    }

    rc_db.getConnection((rcErr, rcConn) => {
      if (rcErr) {
        console.error("RC DB connection error:", rcErr);
        mainConn.release();
        return callback(rcErr, null);
      }

      mainConn.query(
        `UPDATE tbl_rc_call_booking_request SET call_request_sts = ? WHERE id = ?`,
        [status, callRequestId],
        (mainQueryErr) => {
          if (mainQueryErr) {
            console.error("Main DB update error:", mainQueryErr);
            mainConn.release();
            rcConn.release();
            return callback(mainQueryErr, null);
          }

          rcConn.query(
            `UPDATE tbl_call_booking_request SET status = ? WHERE id = ?`,
            [status, rcCallRequestId],
            (rcQueryErr) => {
              mainConn.release();
              rcConn.release();

              if (rcQueryErr) {
                console.error("RC DB update error:", rcQueryErr);
                return callback(rcQueryErr, null);
              }

              return callback(null, true);
            }
          );
        }
      );
    });
  });
};


const getPostsaleCompletedCalls = (email, milestone_id, callback) => {
  const query = `
    SELECT COUNT(*) AS totalrow 
    FROM tbl_booking 
    WHERE fld_email = ? 
      AND fld_call_request_sts = 'Completed'
      AND fld_rc_milestoneid = ?
  `;

  db.getConnection((err, connection) => {
    if (err) {
      console.error("DB connection error:", err);
      return callback(err, null);
    }

    connection.query(query, [email, milestone_id], (error, results) => {
      connection.release();
      if (error) {
        console.error("Query error (completed calls):", error);
        return callback(error, null);
      }

      return callback(null, results[0]);
    });
  });
};

const getBookingById = (bookingId, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    const query = `
      SELECT 
        b.*,
        a1.fld_client_code AS crm_client_code,
        a1.fld_name AS crm_name,
        a1.fld_email AS crm_email,
        a2.fld_client_code AS consultant_client_code,
        a2.fld_name AS consultant_name,
        a2.fld_email AS consultant_email,
        a3.fld_client_code AS sec_consultant_client_code,
        a3.fld_name AS sec_consultant_name,
        a3.fld_email AS sec_consultant_email,
        u.fld_name AS user_name,
        u.fld_email AS user_email,
        u.fld_phone AS user_phone
      FROM tbl_booking b
      LEFT JOIN tbl_admin a1 ON b.fld_addedby = a1.id
      LEFT JOIN tbl_admin a2 ON b.fld_consultantid = a2.id
      LEFT JOIN tbl_admin a3 ON b.fld_secondary_consultant_id = a3.id
      LEFT JOIN tbl_user u ON b.fld_userid = u.id
      WHERE b.id = ?
    `;

    connection.query(query, [bookingId], (err, results) => {
      connection.release();
      callback(err, results);
    });
  });
};

const getBookingRowById = (bookingId, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    const query = `SELECT * FROM tbl_booking WHERE id = ?`;

    connection.query(query, [bookingId], (err, results) => {
      connection.release();
      if (err) return callback(err, null);
      callback(null, results[0] || null); 
    });
  });
};




const deleteBookingById = (bookingId, callback) => {
  db.getConnection((err, connection) => {
    if (err) {
      console.error('DB connection error:', err);
      return callback(err, null);
    }

    const query = "DELETE FROM tbl_booking WHERE id = ?";
    connection.query(query, [bookingId], (error, result) => {
      connection.release(); // always release connection after use

      if (error) {
        console.error('Delete query error:', error);
        return callback(error, null);
      }

      callback(null, result);
    });
  });
};

const getAllCrmIds = (callback) => {
  const query = `
    SELECT GROUP_CONCAT(id) AS crmids 
    FROM tbl_admin 
    WHERE fld_admin_type = 'EXECUTIVE' AND status = 'Active'
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, (error, results) => {
      connection.release();

      if (error) return callback(error);

      const crmIds = results[0]?.crmids || '';
      callback(null, crmIds);
    });
  });
};

const getBookingData = (params, callback) => {
  const {
    bookingId = '',
    consultantId = '',
    bookingDate = '',
    bookingSlot = ''
  } = params;

  let conditions = [`tbl_booking.callDisabled IS NULL`];
  let values = [];

  if (bookingId) {
    conditions.push(`tbl_booking.id = ?`);
    values.push(bookingId);
  }
  if (consultantId) {
    conditions.push(`tbl_booking.fld_consultantid = ?`);
    values.push(consultantId);
  }
  if (bookingDate) {
    conditions.push(`tbl_booking.fld_booking_date = ?`);
    values.push(bookingDate);
  }
  if (bookingSlot) {
    conditions.push(`tbl_booking.fld_booking_slot = ?`);
    values.push(bookingSlot);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      tbl_booking.*, 
      tbl_admin.fld_client_code AS admin_code,
      tbl_admin.fld_name AS admin_name,
      tbl_admin.fld_email AS admin_email,
      tbl_admin.fld_profile_image AS profile_image,
      tbl_admin.fld_client_code AS consultant_code,
      tbl_user.fld_user_code AS user_code,
      tbl_user.fld_name AS user_name,
      tbl_user.fld_email AS user_email,
      tbl_user.fld_decrypt_password AS user_pass,
      tbl_user.fld_country_code AS user_country_code,
      tbl_user.fld_phone AS user_phone,
      tbl_user.fld_address,
      tbl_user.fld_city,
      tbl_user.fld_pincode,
      tbl_user.fld_country
    FROM tbl_booking
    LEFT JOIN tbl_admin ON tbl_booking.fld_consultantid = tbl_admin.id
    LEFT JOIN tbl_user ON tbl_booking.fld_userid = tbl_user.id
    ${whereClause}
    ORDER BY tbl_booking.id DESC
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    try {
      connection.query(query, values, (error, results) => {
        connection.release();
        if (error) return callback(error);

        if (bookingId) {
          callback(null, results[0] || null);
        } else {
          callback(null, results || []);
        }
      });
    } catch (error) {
      connection.release();
      callback(error);
    }
  });
};

const getOtherBookingData = (params, callback) => {
  const {
    bookingId = '',
    consultantId = '',
    bookingDate = '',
    bookingSlot = ''
  } = params;

  let conditions = [`tbl_booking.callDisabled IS NULL`];
  let values = [];

  if (bookingId) {
    conditions.push(`tbl_booking.id != ?`);
    values.push(bookingId);
  }
  if (consultantId) {
    conditions.push(`tbl_booking.fld_consultantid = ?`);
    values.push(consultantId);
  }
  if (bookingDate) {
    conditions.push(`tbl_booking.fld_booking_date = ?`);
    values.push(bookingDate);
  }
  if (bookingSlot) {
    conditions.push(`tbl_booking.fld_booking_slot = ?`);
    values.push(bookingSlot);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      tbl_booking.*, 
      tbl_admin.fld_client_code AS admin_code,
      tbl_admin.fld_name AS admin_name,
      tbl_admin.fld_email AS admin_email,
      tbl_admin.fld_profile_image AS profile_image,
      tbl_admin.fld_client_code AS consultant_code,
      tbl_user.fld_user_code AS user_code,
      tbl_user.fld_name AS user_name,
      tbl_user.fld_email AS user_email,
      tbl_user.fld_decrypt_password AS user_pass,
      tbl_user.fld_country_code AS user_country_code,
      tbl_user.fld_phone AS user_phone,
      tbl_user.fld_address,
      tbl_user.fld_city,
      tbl_user.fld_pincode,
      tbl_user.fld_country
    FROM tbl_booking
    LEFT JOIN tbl_admin ON tbl_booking.fld_consultantid = tbl_admin.id
    LEFT JOIN tbl_user ON tbl_booking.fld_userid = tbl_user.id
    ${whereClause}
    ORDER BY tbl_booking.id DESC
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    try {
      connection.query(query, values, (error, results) => {
        connection.release();
        if (error) return callback(error);

       
          callback(null, results || []);
       
      });
    } catch (error) {
      connection.release();
      callback(error);
    }
  });
};

const submitReassignComment = (bookingid, reassign_comment, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    // Step 1: Update booking table
    const updateQuery = `
      UPDATE tbl_booking 
      SET fld_reassign_comment = ?, fld_call_request_sts = 'Reassign Request'
      WHERE id = ?
    `;

    connection.query(updateQuery, [reassign_comment, bookingid], (err, result) => {
      if (err) {
        connection.release();
        return callback(err);
      }

      // Step 2: Insert comment history
      const comment = `Call reassign request submitted on ${new Date().toLocaleString()}`;
      const insertHistoryQuery = `
        INSERT INTO tbl_booking_comments (fld_booking_id, fld_comment, fld_notif_for, fld_notif_for_id, fld_addedon)
        VALUES (?, ?, 'SUPERADMIN', 1, CURDATE())
      `;

      connection.query(insertHistoryQuery, [bookingid, comment], (err, result2) => {
        if (err) {
          connection.release();
          return callback(err);
        }

        // Step 3: Get related call request IDs
        const selectBookingQuery = `
          SELECT fld_call_request_id, fld_rc_call_request_id 
          FROM tbl_booking 
          WHERE id = ?
        `;

        connection.query(selectBookingQuery, [bookingid], (err, rows) => {
          if (err) {
            connection.release();
            return callback(err);
          }

          const { fld_call_request_id, fld_rc_call_request_id } = rows[0] || {};

          // Step 4: Update RC call request status if both IDs present
          if (fld_call_request_id > 0 && fld_rc_call_request_id > 0) {
            const updateRCQuery = `
              UPDATE tbl_rc_call_booking_request 
              SET call_status = 'Reassign Request' 
              WHERE id = ? AND call_id = ?
            `;

            connection.query(updateRCQuery, [fld_rc_call_request_id, fld_call_request_id], (err, finalRes) => {
              connection.release();
              if (err) return callback(err);
              return callback(null, "Reassign request updated successfully");
            });
          } else {
            connection.release();
            return callback(null, "Reassign comment added (no RC update required)");
          }
        });
      });
    });
  });
};

const getExternalCallInfo = (id = 0, bookingId = 0, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    try {
      let query = `SELECT * FROM tbl_external_calls WHERE 1=1`;
      const params = [];

      if (id > 0) {
        query += ` AND id = ?`;
        params.push(id);
      }

      if (bookingId > 0) {
        query += ` AND fld_booking_id = ?`;
        params.push(bookingId);
      }

      query += ` ORDER BY id DESC LIMIT 1`;

      connection.query(query, params, (error, results) => {
        connection.release();

        if (error) return callback(error);
        if (results.length > 0) {
          callback(null, results[0]);
        } else {
          callback(null, null); // No record found
        }
      });
    } catch (error) {
      connection.release();
      callback(error);
    }
  });
};

const updateExternalCallsStatus = (bookingId, updateData, callback) => {
  if (!bookingId || typeof updateData !== 'object' || Object.keys(updateData).length === 0) {
    return callback(new Error("Invalid bookingId or updateData"));
  }

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    try {
      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = fields.map(field => `${field} = ?`).join(', ');

      const query = `UPDATE tbl_external_calls SET ${setClause} WHERE fld_booking_id = ?`;
      values.push(bookingId);

      connection.query(query, values, (error, results) => {
        connection.release();
        if (error) return callback(error);
        callback(null, results);
      });
    } catch (error) {
      connection.release();
      callback(error);
    }
  });
};



const getFullBookingData = (bookingId, callback) => {
  if (!bookingId) {
    return callback(new Error("Invalid bookingId"), null);
  }

  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    try {
      const query = `
        SELECT 
          b.*,
          u.fld_name AS user_name,
          u.fld_email AS user_email,
          u.fld_phone AS user_phone,
          a.fld_name AS admin_name
        FROM tbl_booking b
        LEFT JOIN tbl_users u ON b.fld_userid = u.id
        LEFT JOIN tbl_admin a ON b.fld_consultantid = a.id
        WHERE b.id = ?
      `;

      connection.query(query, [bookingId], (error, results) => {
        connection.release();
        if (error) return callback(error, null);
        callback(null, results[0] || null);
      });
    } catch (error) {
      connection.release();
      callback(error, null);
    }
  });
};

const getExternalCallCountByBookingId = (bookingId, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    try {
      const query = `SELECT COUNT(*) AS totalrow FROM tbl_external_calls WHERE fld_booking_id = ?`;

      connection.query(query, [bookingId], (error, results) => {
        connection.release();

        if (error) return callback(error);
        const count = results[0]?.totalrow || 0;
        callback(null, count);
      });
    } catch (error) {
      connection.release();
      callback(error);
    }
  });
};

const getBookingStatusHistory = (bookingId,status, callback) => {
  const sql = `
    SELECT * FROM tbl_booking_sts_history WHERE fld_booking_id = ? AND status = ? ORDER BY id DESC
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(sql, [bookingId,status], (queryErr, results) => {
      connection.release();
      if (queryErr) return callback(queryErr);
      return callback(null, results);
    });
  });
};

const getAllClientBookings = (clientId, callback) => {
  const query = `
    SELECT 
      tbl_booking.*, 
      tbl_admin.fld_client_code AS admin_code,
      tbl_admin.fld_name AS admin_name,
      tbl_admin.fld_email AS admin_email,
      tbl_admin.fld_profile_image AS profile_image,
      tbl_admin.fld_client_code AS consultant_code,
      tbl_user.fld_user_code AS user_code,
      tbl_user.fld_name AS user_name,
      tbl_user.fld_email AS user_email,
      tbl_user.fld_decrypt_password AS user_pass,
      tbl_user.fld_country_code AS user_country_code,
      tbl_user.fld_phone AS user_phone,
      tbl_user.fld_address,
      tbl_user.fld_city,
      tbl_user.fld_pincode,
      tbl_user.fld_country
    FROM tbl_booking
    LEFT JOIN tbl_admin ON tbl_booking.fld_consultantid = tbl_admin.id
    LEFT JOIN tbl_user ON tbl_booking.fld_userid = tbl_user.id
    WHERE tbl_booking.fld_client_id = ?
    ORDER BY tbl_booking.id DESC
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, [clientId], (error, results) => {
      connection.release();
      if (error) return callback(error);
      callback(null, results || []);
    });
  });
};

const getLatestCompletedBooking = (consultantId, email, callback) => {
  const sql = `
    SELECT * FROM tbl_booking 
    WHERE fld_consultantid = ? 
    AND fld_email = ? 
    AND fld_consultation_sts = 'Completed' 
    AND fld_call_request_sts = 'Completed' 
    AND fld_sale_type = 'Presales' 
    ORDER BY id DESC LIMIT 1
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(sql, [consultantId, email], (queryErr, results) => {
      connection.release();
      if (queryErr) return callback(queryErr);
      callback(null, results);
    });
  });
};

const getLatestCompletedBookingStatusHistory = (bookingId, status, callback) => {
  const sql = `
    SELECT *
    FROM tbl_booking_sts_history
    WHERE fld_booking_id = ?
      AND status = ?
    ORDER BY id DESC
    LIMIT 1
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(sql, [bookingId, status], (queryErr, results) => {
      connection.release();
      if (queryErr) return callback(queryErr);
      return callback(null, results);
    });
  });
};

const getLatestCompletedBookingHistory = (bookingId, callback) => {
  const sql = `
    SELECT 
      id,
      fld_booking_id,
      fld_comment,
      fld_rescheduled_date_time,
      fld_addedon,
      fld_notif_view_sts,
      fld_notif_for,
      fld_notif_for_id,
      view_sts,
      crmIdsNotifi,
      fld_consultantid
    FROM tbl_booking_overall_history
    WHERE fld_booking_id = ?
      AND fld_comment LIKE '%Call Completed by%'
    ORDER BY id DESC
    LIMIT 1
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(sql, [bookingId], (queryErr, results) => {
      connection.release();
      if (queryErr) return callback(queryErr);
      return callback(null, results);
    });
  });
};

const checkConflictingBookings = (consultantId, bookingDate, bookingslot, slotVariants, callback) => {
  const sql = `
    SELECT * FROM tbl_booking
    WHERE fld_consultantid = ?
      AND fld_booking_date = ?
      AND (
        fld_booking_slot IN (?, ?, ?)
        OR FIND_IN_SET(?, fld_slots_booked)
      )
  `;

  const params = [consultantId, bookingDate, ...slotVariants, bookingslot];

  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    connection.query(sql, params, (queryErr, results) => {
      connection.release();
      if (queryErr) return callback(queryErr, null);
      callback(null, results);
    });
  });
};



module.exports = {
  getBookings,
  getBookingHistory,
  getPresaleClientDetails,
  getPostsaleClientDetails,
  getProjectMilestones,
  checkCallrecording,
  checkConsultantClientWebsite,
  checkConsultantCompletedCall,
  checkPresalesCall,
  getClientCallsRequestPlanLimitOver,
  getMeetingId,
  insertBooking,
  updateBooking,
  getConsultantId,
  insertAddCallRequest,
  insertExternalCall,
  insertBookingHistory,
  insertBookingStatusHistory,
  getAdmin,
  getAdminById,
  insertUser,
  updateRcCallRequestSts,
  getPostsaleCompletedCalls,
  getBookingById,
  getBookingRowById,
  deleteBookingById,
  getAllCrmIds,
  getBookingData,
  getExternalCallInfo,
  getOtherBookingData,
  updateExternalCallsStatus,
  getFullBookingData,
  getExternalCallCountByBookingId,
  getBookingStatusHistory,
  getAllClientBookings,
  getLatestCompletedBooking,
  getLatestCompletedBookingStatusHistory,
  getLatestCompletedBookingHistory,
  checkConflictingBookings,
};
