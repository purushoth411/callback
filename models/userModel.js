const db = require('../config/db');
const bcrypt = require("bcrypt");

const getUserByUserName = (username, callback) => {
    const sql = 'SELECT * FROM tbl_admin WHERE fld_username = ? LIMIT 1';
    db.query(sql, [username], (err, results) => {
        if (err) return callback(err, null);
        if (results.length === 0) return callback(null, null);
        return callback(null, results[0]);
    });
};




const getAllUsers = (filters, callback) => {
  let sql = "SELECT * FROM tbl_admin WHERE fld_admin_type != 'SUPERADMIN'";
  const params = [];

  // Filter by usertype if provided
  if (filters.usertype.length > 0) {
    sql += " AND fld_admin_type IN (" + filters.usertype.map(() => "?").join(",") + ")";
    params.push(...filters.usertype.map(type => type.toUpperCase()));
  }

  // Filter by keyword
  if (filters.keyword && filters.keyword !== "") {
    sql += " AND (fld_name LIKE ? OR fld_email LIKE ?)";
    const search = `%${filters.keyword}%`;
    params.push(search, search);
  }

   if (filters.status && filters.status.trim() !== "") {
    sql += " AND status LIKE ?";
    params.push(`%${filters.status.trim()}%`);
  }

  db.query(sql, params, (err, results) => {
    if (err) return callback(err, null);
    return callback(null, results);
  });
};


  const getAllActiveUsers = (filters, callback) => {
    let sql = "SELECT * FROM tbl_admin WHERE fld_admin_type != 'SUPERADMIN'";
    const params = [];

    // Filter by usertype if provided
    if (filters.usertype.length > 0) {
      sql += " AND fld_admin_type IN (" + filters.usertype.map(() => "?").join(",") + ")";
      params.push(...filters.usertype.map(type => type.toUpperCase()));
    }

    // Filter by keyword
    if (filters.keyword && filters.keyword !== "") {
      sql += " AND (fld_name LIKE ? OR fld_email LIKE ?)";
      const search = `%${filters.keyword}%`;
      params.push(search, search);
    }

    if (filters.status && filters.status !== "") {
      sql += " AND (status LIKE ? OR status LIKE ?)";
      const search = `%${filters.status}%`;
      params.push(search, search);
    }

    db.query(sql, params, (err, results) => {
      if (err) return callback(err, null);
      return callback(null, results);
    });
  };


const getUserCount = (callback) => {
  const sql = `
    SELECT fld_admin_type, COUNT(*) as count 
    FROM tbl_admin 
    WHERE fld_admin_type IN ('EXECUTIVE', 'SUBADMIN', 'CONSULTANT', 'OPERATIONSADMIN')
    GROUP BY fld_admin_type
  `;

  db.query(sql, (err, results) => {
    if (err) return callback(err, null);

    // Convert array to object: { EXECUTIVE: 5, SUBADMIN: 3, ... }
    const counts = {};
    results.forEach(row => {
      counts[row.fld_admin_type] = row.count;
    });

    return callback(null, counts);
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

  // Generate client code
  let prefix = "";
  switch (usertype) {
    case "CONSULTANT":
      prefix = "CNSLT#";
      break;
    case "EXECUTIVE":
      prefix = "EXEC#";
      break;
    case "SUBADMIN":
      prefix = "SUBADM#";
      break;
    case "OPERATIONSADMIN":
      prefix = "OPEADM#";
      break;
  }
  const client_code = prefix + Math.floor(10000 + Math.random() * 90000);

  // Encrypt password
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) return callback(err);

    const sql = `
      INSERT INTO tbl_admin 
      (fld_admin_type, fld_team_id, fld_client_code, fld_username, fld_name, fld_email, fld_phone, fld_password, fld_decrypt_password, fld_consultant_type, fld_subadmin_type, fld_permission, fld_addedon, fld_pass_last_upd_day, attendance, fld_sevice_provider)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?)
    `;

    const isConsultant = usertype === "CONSULTANT" ? "PRESENT" : null;
    const isService = usertype === "CONSULTANT" ? "No" : null;

    db.query(
      sql,
      [
        usertype,
        team_id || "",
        client_code,
        username,
        name,
        email,
        phone,
        hashedPassword,
        password,
        consultant_type || "",
        subadmin_type || "",
        permissions || "[]",
        isConsultant,
        isService,
      ],
      callback
    );
  });
};


const getAllUsersIncludingAdmin = (callback) =>{
    const sql = 'SELECT * from tbl_admin';
    db.query(sql, (err, results) => {
        if(err) return callback(err, null);
        return callback(null, results);
    })
}



// Update user
const updateUser = (id, userData, callback) => {
    const sql = 'UPDATE tbl_admin SET fld_first_name = ?, fld_email = ?, fld_decrypt_password = ?, fld_admin_type = ? WHERE id = ?';
    const { name, email, password, user_type } = userData;
    db.query(sql, [name, email, password, user_type, id], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

// Delete user
const deleteUser = (id, callback) => {
    const sql = 'DELETE FROM tbl_admin WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

module.exports = {
    getUserByUserName,
    getAllUsers,
    getUserCount,
    addUser,
    
    updateUser,
    deleteUser
};
