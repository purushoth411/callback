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
  const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

  const team_id_str = Array.isArray(team_id) ? team_id.join(",") : team_id;
  const permissions_str = JSON.stringify(permissions || []);
  const isConsultant = usertype === "CONSULTANT" ? "PRESENT" : null;
  const isService = usertype === "CONSULTANT" ? "No" : null;

  const sql = `
    INSERT INTO tbl_admin 
    (fld_admin_type, fld_team_id, fld_client_code, fld_username, fld_name, fld_email, fld_phone, fld_password, fld_decrypt_password, fld_consultant_type, fld_subadmin_type, fld_permission, fld_addedon, fld_pass_last_upd_day, attendance, fld_sevice_provider)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?)
  `;

  db.getConnection((err, connection) => {
    if (err) return callback(err, null);

    connection.query(
      sql,
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
      (err, results) => {
        connection.release();
        return callback(err, results);
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
    deleteUser
};
