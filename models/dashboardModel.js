// models/dashboardModel.js
const db = require("../config/db"); // Update path if needed
const moment = require('moment');


const getAllActiveTeams = (callback) => {
  const sql = `
    SELECT * FROM tbl_team
    WHERE status = 'Active'
    ORDER BY fld_addedon DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return callback(err, null);
    return callback(null, results);
  });
};

const getTotalData = async ({
  filter_type = '',
  consultantid = '',
  crm_id = '',
  sale_type = '',
  converted_sts = '',
  session_user_type = '',
  session_user_id = '',
  team_id = ''
}) => {
  let query = `SELECT id FROM tbl_booking`;
  let conditions = [];
  let params = [];

  const consultantIdInt = consultantid && !isNaN(consultantid) ? parseInt(consultantid, 10) : null;
  const crmIdInt = crm_id && !isNaN(crm_id) ? parseInt(crm_id, 10) : null;
  const sessionUserIdInt = session_user_id && !isNaN(session_user_id) ? parseInt(session_user_id, 10) : null;

  const hasConsultant = consultantIdInt !== null;
  const hasCrm = crmIdInt !== null;

  if (hasConsultant && hasCrm) {
    conditions.push(`(fld_consultantid = ? OR fld_secondary_consultant_id = ? OR fld_third_consultantid = ?) AND fld_addedby = ?`);
    params.push(consultantIdInt, consultantIdInt, consultantIdInt, crmIdInt);
  } else if (hasConsultant) {
    conditions.push(`(fld_consultantid = ? OR fld_secondary_consultant_id = ? OR fld_third_consultantid = ?)`);
    params.push(consultantIdInt, consultantIdInt, consultantIdInt);
  } else if (hasCrm) {
    conditions.push(`fld_addedby = ?`);
    params.push(crmIdInt);
  } else {
    if (session_user_type === 'EXECUTIVE' && sessionUserIdInt !== null) {
      conditions.push(`fld_addedby = ?`);
      params.push(sessionUserIdInt);
    } else if (session_user_type === 'CONSULTANT' && sessionUserIdInt !== null) {
      conditions.push(`(fld_consultantid = ? OR fld_secondary_consultant_id = ? OR fld_third_consultantid = ?)`);
      params.push(sessionUserIdInt, sessionUserIdInt, sessionUserIdInt);
    } else if (session_user_type === 'SUBADMIN' && sessionUserIdInt !== null) {
      if (team_id) {
        conditions.push(`(fld_consultantid = ? OR FIND_IN_SET(?, fld_teamid))`);
        params.push(sessionUserIdInt, team_id);
      } else {
        conditions.push(`fld_consultantid = ?`);
        params.push(sessionUserIdInt);
      }
    }
  }

  if (sale_type) {
    conditions.push(`fld_sale_type = ?`);
    params.push(sale_type);
  }

  if (converted_sts === 'Converted') {
    conditions.push(`LOWER(TRIM(fld_converted_sts)) = 'yes'`);
  }

   if (filter_type) {
    let startDate = null;
    let endDate = null;

    switch (filter_type) {
      case 'Today':
        startDate = moment().startOf('day').format('YYYY-MM-DD HH:mm:ss');
        endDate = moment().endOf('day').format('YYYY-MM-DD HH:mm:ss');
        break;

      case 'Week':
        startDate = moment().startOf('week').format('YYYY-MM-DD HH:mm:ss');
        endDate = moment().endOf('week').format('YYYY-MM-DD HH:mm:ss');
        break;

      case 'Month':
        startDate = moment().startOf('month').format('YYYY-MM-DD HH:mm:ss');
        endDate = moment().endOf('day').format('YYYY-MM-DD HH:mm:ss');
        break;

      case 'Last':
        startDate = moment().subtract(1, 'months').startOf('month').format('YYYY-MM-DD HH:mm:ss');
        endDate = moment().subtract(1, 'months').endOf('month').format('YYYY-MM-DD HH:mm:ss');
        break;
    }

    if (startDate && endDate) {
      conditions.push(`fld_addedon BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    }
  }


  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }

  console.log('Final Query:', query);
  console.log('Params:', params);

  return new Promise((resolve, reject) => {
    db.getConnection((err, connection) => {
      if (err) {
        console.error('DB connection error:', err);
        return reject(err);
      }

      connection.query(query, params, (error, results) => {
        connection.release(); // ✅ release connection always

        if (error) {
          console.error('DB Query Error:', error);
          return reject(error);
        }

        resolve(results.length || 0);
      });
    });
  });
};

const getParticularStatusCallsOfCrm = (crm_id, status, callback) => {
  const currentDate = moment();
  const twoDaysBefore = currentDate.clone().subtract(2, 'days').format('YYYY-MM-DD');
  const twoDaysAfter = currentDate.clone().add(2, 'days').format('YYYY-MM-DD');

  let sql = `
    SELECT * FROM tbl_booking
    WHERE fld_call_request_sts = ?
      AND fld_consultation_sts = ?
      AND fld_booking_date BETWEEN ? AND ?
      AND callDisabled IS NULL
  `;

  const params = [status, status, twoDaysBefore, twoDaysAfter];

  if (crm_id) {
    sql += ` AND fld_addedby = ?`;
    params.push(crm_id);
  }

  db.query(sql, params, (err, results) => {
    if (err) return callback(err, null);
    return callback(null, results);
  });
};


const getConsultantSettingData = (consultantid = "", callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    let sql = `SELECT * FROM tbl_consultant_setting`;
    const params = [];

    if (consultantid && Number(consultantid) > 0) {
      sql += ` WHERE fld_consultantid = ?`;
      params.push(consultantid);
    }

    sql += ` ORDER BY id DESC LIMIT 1`;

    connection.query(sql, params, (error, results) => {
      connection.release();
      if (error) return callback(error, null);
      return callback(null, results[0] || null);
    });
  });
};

const updateConsultantSettings = (consultantid, data, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const fields = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ');

    const values = Object.values(data);
    values.push(consultantid); // For WHERE clause

    const sql = `
      UPDATE tbl_consultant_setting
      SET ${fields}
      WHERE fld_consultantid = ?
    `;

    connection.query(sql, values, (error, result) => {
      connection.release();
      if (error) return callback(error);
      return callback(null, result);
    });
  });
};


module.exports = {
  getAllActiveTeams,
  getTotalData,
  getParticularStatusCallsOfCrm,
  getConsultantSettingData,
  updateConsultantSettings
}