const db = require('../config/db');
const crypto = require('crypto');

const getUserByUserName = (username, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    const sql = 'SELECT * FROM tbl_admin WHERE fld_username = ? LIMIT 1';
    connection.query(sql, [username], (err, results) => {
      connection.release(); // Always release the connection
      if (err) return callback(err, null);
      if (results.length === 0) return callback(null, null);
      return callback(null, results[0]);
    });
  });
};

const checkUsernameExists = (username, excludeUserId, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    let sql = "SELECT COUNT(*) AS count FROM tbl_admin WHERE fld_username = ?";
    const params = [username];

    if (excludeUserId) {
      sql += " AND id != ?";
      params.push(excludeUserId);
    }

    connection.query(sql, params, (err, results) => {
      connection.release();
      if (err) return callback(err);

      const exists = results[0].count > 0;
      return callback(null, exists);
    });
  });
};


const getAllUsers = (filters, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    let sql = "SELECT * FROM tbl_admin WHERE fld_admin_type != 'SUPERADMIN'";
    const params = [];

    if (filters.usertype.length > 0) {
      sql += " AND fld_admin_type IN (" + filters.usertype.map(() => "?").join(",") + ")";
      params.push(...filters.usertype.map(type => type.toUpperCase()));
    }

    if (filters.keyword && filters.keyword !== "") {
      sql += " AND (fld_name LIKE ? OR fld_email LIKE ?)";
      const search = `%${filters.keyword}%`;
      params.push(search, search);
    }

    if (filters.status && filters.status.trim() !== "") {
      sql += " AND status LIKE ?";
      params.push(`%${filters.status.trim()}%`);
    }

    connection.query(sql, params, (err, results) => {
      connection.release(); // Release connection after query
      if (err) return callback(err, null);
      return callback(null, results);
    });
  });
};



const getUserCount = (callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    const sql = `
      SELECT fld_admin_type, COUNT(*) as count 
      FROM tbl_admin 
      WHERE fld_admin_type IN ('EXECUTIVE', 'SUBADMIN', 'CONSULTANT', 'OPERATIONSADMIN')
      GROUP BY fld_admin_type
    `;

    connection.query(sql, (err, results) => {
      connection.release(); // Important!
      if (err) return callback(err, null);

      const counts = {};
      results.forEach(row => {
        counts[row.fld_admin_type] = row.count;
      });

      return callback(null, counts);
    });
  });
};


const addUser = (userData, callback) => {
  const {
    usertype,
    team_id,
    username,
    name,
    email,
    phone,
    password,
    consultant_type,
    subadmin_type,
    permissions,
  } = userData;

  let prefix = "";
  switch (usertype) {
    case "CONSULTANT": prefix = "CNSLT#"; break;
    case "EXECUTIVE": prefix = "EXEC#"; break;
    case "SUBADMIN": prefix = "SUBADM#"; break;
    case "OPERATIONSADMIN": prefix = "OPEADM#"; break;
  }

  const client_code = prefix + Math.floor(10000 + Math.random() * 90000);
  const hashedPassword = crypto.createHash("md5").update(password).digest("hex");
  const team_id_str = Array.isArray(team_id) ? team_id.join(",") : team_id;
  const permissions_str = JSON.stringify(permissions || []);
  const isConsultant = usertype === "CONSULTANT" ? "PRESENT" : null;
  const isService = usertype === "CONSULTANT" ? "No" : null;

  const insertUserSQL = `
    INSERT INTO tbl_admin 
    (fld_admin_type, fld_team_id, fld_client_code, fld_username, fld_name, fld_email, fld_phone, fld_password, fld_decrypt_password, fld_consultant_type, fld_subadmin_type, fld_permission, fld_addedon, fld_pass_last_upd_day, attendance, fld_sevice_provider)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?)
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    connection.query(
      insertUserSQL,
      [
        usertype,
        team_id_str,
        client_code,
        username,
        name,
        email,
        phone,
        hashedPassword,
        password,
        consultant_type || "",
        subadmin_type || "",
        permissions_str,
        isConsultant,
        isService,
      ],
      (err, result) => {
        if (err) {
          connection.release();
          return callback(err);
        }

        const insertId = result.insertId;

        // If usertype is CONSULTANT or SUBADMIN, insert additional data
        if (usertype === "CONSULTANT" || usertype === "SUBADMIN") {
          const settingSql = `
            INSERT INTO tbl_consultant_setting 
            (fld_consultantid, fld_selected_week_days, fld_mon_time_data, fld_tue_time_data, fld_wed_time_data, fld_thu_time_data, fld_fri_time_data, fld_addedon, fld_updatedon)
            VALUES (?, '2,3,4,5,6', '09:00||18:00', '09:00||18:00', '09:00||18:00', '09:00||18:00', '09:00||18:00', NOW(), NOW())
          `;

          connection.query(settingSql, [insertId], (err1) => {
            if (err1) {
              connection.release();
              return callback(err1);
            }

            const questionSql = `
              INSERT INTO tbl_consultant_question_data 
              (fld_consultantid, fld_addedon, fld_updatedon)
              VALUES (?, NOW(), NOW())
            `;

            connection.query(questionSql, [insertId], (err2) => {
              connection.release();
              if (err2) return callback(err2);
              return callback(null, { message: "User & Setting inserted successfully", insertId });
            });
          });
        } else {
          // No additional inserts needed
          connection.release();
          return callback(null, { message: "User inserted successfully", insertId });
        }
      }
    );
  });
};


const updateUser = (userData, callback) => {
  const {
    user_id,
    team_id,
    username,
    name,
    email,
    phone,
    consultant_type,
    subadmin_type,
    permissions,
  } = userData;

  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const sql = `
      UPDATE tbl_admin
      SET 
        fld_team_id = ?, 
        fld_username = ?, 
        fld_name = ?, 
        fld_email = ?, 
        fld_phone = ?, 
        fld_consultant_type = ?, 
        fld_subadmin_type = ?, 
        fld_permission = ?
      WHERE id = ?
    `;

    const params = [
      Array.isArray(team_id) ? team_id.join(",") : team_id,
      username,
      name,
      email,
      phone,
      consultant_type || "",
      subadmin_type || "",
      JSON.stringify(permissions || []),
      user_id,
    ];

    connection.query(sql, params, (err, result) => {
      connection.release();
      callback(err, result);
    });
  });
};

const updateUserStatus = (userId, status, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const sql = `UPDATE tbl_admin SET status = ? WHERE id = ?`;
    const params = [status, userId];

    connection.query(sql, params, (err, result) => {
      connection.release();
      callback(err, result);
    });
  });
};

const updateAttendance = (userId, attendance, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const sql = `UPDATE tbl_admin SET attendance = ? WHERE id = ?`;
    const params = [attendance, userId];

    connection.query(sql, params, (err, result) => {
      connection.release();
      callback(err, result);
    });
  });
};


// Delete user
const deleteUser = (id, callback) => {
  db.getConnection((err, connection) => {
    if (err) return callback(err);

    const sql = 'DELETE FROM tbl_admin WHERE id = ?';

    connection.query(sql, [id], (err, result) => {
      connection.release();
      callback(err, result);
    });
  });
};


module.exports = {
    getUserByUserName,
    getAllUsers,
    getUserCount,
    addUser,
    
    updateUser,
    updateUserStatus,
    deleteUser,
    checkUsernameExists,
    updateAttendance
};
