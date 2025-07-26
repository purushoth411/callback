// models/dashboardModel.js
const db = require("../config/db"); // Update path if needed

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







module.exports = {
    getAllActiveTeams,
    getTotalData
}