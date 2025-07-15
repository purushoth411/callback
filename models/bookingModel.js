const db = require('../config/db');

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

  // ✅ Access Control Logic
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

module.exports ={
    getBookings,getBookingHistory
}