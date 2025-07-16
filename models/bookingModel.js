const db = require('../config/db');
const instacrm_db = require('../config/instacrm_db');
const rc_db = require('../config/rc_db');

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

  
  if (userType === 'SUPERADMIN') {
    buildRemainingFiltersAndExecute();
  } else if (userType === 'SUBADMIN' && assigned_team) {
    const teamIds = assigned_team.split(',').map(id => id.trim()).filter(Boolean);

    if (teamIds.length > 0) {
      const teamQuery = `SELECT team_members FROM tbl_teams WHERE id IN (${teamIds.map(() => '?').join(',')})`;

      db.query(teamQuery, teamIds, (err, teamResults) => {
        if (err) return callback(err, null);

        let teamUserIds = [];
        teamResults.forEach(row => {
          if (row.team_members) {
            const members = row.team_members.split(',').map(id => id.trim());
            teamUserIds.push(...members);
          }
        });

        const allUserIds = [...new Set([...teamUserIds, userId])];
        const placeholders = allUserIds.map(() => '?').join(',');

        sql += ` AND (b.fld_consultantid IN (${placeholders}) OR b.fld_addedby IN (${placeholders}))`;
        params.push(...allUserIds, ...allUserIds);

        buildRemainingFiltersAndExecute();
      });
    } else {
      sql += ` AND (b.fld_consultantid = ? OR b.fld_addedby = ?)`;
      params.push(userId, userId);
      buildRemainingFiltersAndExecute();
    }
  } else if (userType === 'CONSULTANT') {
    sql += ` AND b.fld_consultantid = ?`;
    params.push(userId);
    buildRemainingFiltersAndExecute();
  } else if (userType === 'EXECUTIVE') {
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
  // First: Get query_id from tbl_assign_query using given client_id
  const queryAssignSQL = "SELECT query_id FROM tbl_assign_query WHERE id = ? LIMIT 1";

  instacrm_db.query(queryAssignSQL, [client_id], (err, assignResult) => {
    if (err) return callback(err);

    if (!assignResult || assignResult.length === 0) {
      return callback(null, null); // no result found
    }

    const query_id = assignResult[0].query_id;

    // Second: Fetch client details from tbl_query using query_id
    const queryDetailsSQL = `
      SELECT 
        name,
        email_id AS email,
        alt_email_id,
        phone,
        alt_contact_no,
        date,
        location,
        state_id,
        city,
        complete_address,
        designation,
        company_name,
        website,
        other_website,
        area_of_study,
        requirement,
        other_requirement,
        priority,
        word_count,
        deadline,
        academic_level,
        approx_value,
        follow_up_date,
        no_day,
        subject,
        contact_by,
        remarks,
        flag_mark,
        status,
        created_on,
        query_type,
        entrytype,
        sourceoflead,
        deleted_at,
        created_at,
        updated_at,
        claimed_by,
        if_auto_claim,
        send_whatsapp,
        requirement_line,
        line_format,
        paragraph_format,
        latest_requirement
      FROM tbl_query 
      WHERE id = ? 
      LIMIT 1
    `;

    instacrm_db.query(queryDetailsSQL, [query_id], (err2, queryResult) => {
      if (err2) return callback(err2);

      if (!queryResult || queryResult.length === 0) {
        return callback(null, null); // query ID found but no data in tbl_query
      }

      return callback(null, queryResult[0]);
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
        projects: projectResults || []
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


module.exports ={
    getBookings,getBookingHistory,getPresaleClientDetails,getPostsaleClientDetails,getProjectMilestones}