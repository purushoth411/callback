const db = require("../config/db");
const instacrm_db = require("../config/instacrm_db");
const rc_db = require("../config/rc_db");

const getBookings = (userId, userType, assigned_team, filters, callback) => {
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
    FROM 
      tbl_booking b
    LEFT JOIN tbl_admin consultant ON b.fld_consultantid = consultant.id
    LEFT JOIN tbl_admin crm ON b.fld_addedby = crm.id
    LEFT JOIN tbl_user user ON b.fld_userid = user.id
    WHERE b.callDisabled IS NULL
  `;

  const params = [];

  const buildRemainingFiltersAndExecute = () => {
    if (filters.status) {
      sql += ` AND b.status = ?`;
      params.push(filters.status);
    }

    if (filters.consultationStatus) {
      sql += ` AND b.fld_consultation_sts = ?`;
      params.push(filters.consultationStatus);
    }

    if (filters.fromDate && filters.toDate) {
      sql += ` AND DATE(b.fld_booking_date) BETWEEN ? AND ?`;
      params.push(filters.fromDate, filters.toDate);
    }

    if (filters.consultantId) {
      sql += ` AND b.fld_consultantid = ?`;
      params.push(filters.consultantId);
    }

    if (filters.search) {
      sql += ` AND (b.fld_name LIKE ? OR b.fld_email LIKE ?)`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
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

    db.query(sql, params, (err, results) => {
      if (err) return callback(err, null);
      return callback(null, results);
    });
  };

  if (userType === "SUPERADMIN") {
    buildRemainingFiltersAndExecute();
  } else if (userType === "SUBADMIN" && assigned_team) {
    const teamIds = assigned_team
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (teamIds.length > 0) {
      const teamQuery = `SELECT team_members FROM tbl_teams WHERE id IN (${teamIds
        .map(() => "?")
        .join(",")})`;

      db.query(teamQuery, teamIds, (err, teamResults) => {
        if (err) return callback(err, null);

        let teamUserIds = [];
        teamResults.forEach((row) => {
          if (row.team_members) {
            const members = row.team_members.split(",").map((id) => id.trim());
            teamUserIds.push(...members);
          }
        });

        const allUserIds = [...new Set([...teamUserIds, userId])];
        const placeholders = allUserIds.map(() => "?").join(",");

        sql += ` AND (b.fld_consultantid IN (${placeholders}) OR b.fld_addedby IN (${placeholders}))`;
        params.push(...allUserIds, ...allUserIds);

        buildRemainingFiltersAndExecute();
      });
    } else {
      sql += ` AND (b.fld_consultantid = ? OR b.fld_addedby = ?)`;
      params.push(userId, userId);
      buildRemainingFiltersAndExecute();
    }
  } else if (userType === "CONSULTANT") {
    sql += ` AND b.fld_consultantid = ?`;
    params.push(userId);
    buildRemainingFiltersAndExecute();
  } else if (userType === "EXECUTIVE") {
    sql += ` AND b.fld_addedby = ?`;
    params.push(userId);
    buildRemainingFiltersAndExecute();
  } else {
    sql += ` AND 1 = 0`; // fallback: no access
    buildRemainingFiltersAndExecute();
  }
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

  db.query(sql, [bookingId], (err, results) => {
    if (err) return callback(err, null);
    return callback(null, results);
  });
};

// Get Presales client details from InstaCRM
const getPresaleClientDetails = (client_id, callback) => {
  // Step 1: Get query_id, website, and company from tbl_assign_query by joining tbl_website and tbl_company
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

  instacrm_db.query(queryAssignSQL, [client_id], (err, assignResult) => {
    if (err) return callback(err);

    if (!assignResult || assignResult.length === 0) {
      return callback(null, null); // No assignment found
    }

    const { query_id, insta_website, company_name } = assignResult[0];

    // Step 2: Get query details from tbl_query
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

    instacrm_db.query(queryDetailsSQL, [query_id], (err2, queryResult) => {
      if (err2) return callback(err2);

      if (!queryResult || queryResult.length === 0) {
        return callback(null, null); // Query found, but no data
      }

      const queryData = queryResult[0];

      // Step 3: Attach website and company info from assignment join
      queryData.insta_website = insta_website || null;
      queryData.assigned_company = company_name || null;

      return callback(null, queryData);
    });
  });
};

const getPostsaleClientDetails = (client_id, callback) => {
  // First: Get student from tbl_scholar by student_code
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

  rc_db.query(studentSQL, [client_id], (err, studentResult) => {
    if (err) return callback(err);

    if (!studentResult || studentResult.length === 0) {
      return callback(null, null); // No matching student
    }

    const student = studentResult[0];
    const st_id = student.st_id;

    // Now: Fetch projects for this student
    const projectSQL = `
      SELECT 
        id, project_title 
      FROM tbl_project 
      WHERE student_id = ?
    `;

    rc_db.query(projectSQL, [st_id], (err2, projectResults) => {
      if (err2) return callback(err2);

      // Return both student and projects
      const response = {
        name: student.name,
        email: student.email,
        phone: student.phone,
        address: student.address1,
        projects: projectResults || [],
      };

      return callback(null, response);
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

  rc_db.query(sql, [projectId], (err, results) => {
    if (err) return callback(err);
    callback(null, results);
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

  db.query(sql, [email.trim(), ref_id.trim()], (err, results) => {
    if (err) {
      console.error("Query Error:", err);
      return callback(err, null);
    }

    return callback(null, results);
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



const insertBooking = (bookingData, callback) => {
  const fields = Object.keys(bookingData);
  const values = Object.values(bookingData);
  const placeholders = fields.map(() => '?').join(', ');
  const query = `INSERT INTO tbl_booking (${fields.join(', ')}) VALUES (${placeholders})`;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(query, values, (error, result) => {
      connection.release();
      if (error) return callback(error);
      callback(null, result.insertId);
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
    if (err) return callback(err);

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



const updateRcCallRequestSts = async (callRequestId, rcCallRequestId, status, callback = () => {}) => {
  if (!callRequestId || !rcCallRequestId || !status) {
    return callback(null, false);
  }

  let mainConn, rcConn;
  try {
    mainConn = await db.getConnection();
    rcConn = await rc_db.getConnection();

    await mainConn.query(
      `UPDATE tbl_rc_call_booking_request SET call_request_sts = ? WHERE id = ?`,
      [status, callRequestId]
    );

    await rcConn.query(
      `UPDATE tbl_call_booking_request SET status = ? WHERE id = ?`,
      [status, rcCallRequestId]
    );

    callback(null, true);
  } catch (err) {
    console.error("Error in updateRcCallRequestSts:", err);
    callback(err, null);
  } finally {
    if (mainConn) mainConn.release();
    if (rcConn) rcConn.release();
  }
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
  getAdmin,
  insertUser,
  updateRcCallRequestSts,
};
