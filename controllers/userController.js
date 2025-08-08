const userModel = require('../models/userModel');
const { getIO } = require("../socket");

const loginUser = (req, res) => {
    const { username, userpass } = req.body;

    if (!username || !userpass)
        return res.status(400).json({ message: 'Username and Password are required' });

    userModel.getUserByUserName(username, (err, user) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({ status : false , message: 'Server error' });
        }

        if (!user) {
            return res.status(401).json({ status : false , message: 'Invalid username or password' });
        }
        // remove password from the response
        const { userpass: _, ...userData } = user;
        return res.json({ status : true , message: 'Login successful', user: userData });
    });
};






const getAllUsers = (req, res) => {
  const filters = req.body.filters || {};
  

  userModel.getAllUsers(filters, (err, users) => {
    if (err) {
      return res.status(500).json({ status: false, message: "Error: " + err });
    }

    return res.json({ status: true, message: "Success", data: users });
  });
};

const getActiveUsers = (req, res) => {
  const userType = req.query.type ? req.query.type.toUpperCase() : null;
  const status =req.query.status ? req.query.status : null;

  const filters = {
    usertype: userType ? [userType] : [],
    keyword: "",
    status:status,
  };

  userModel.getAllUsers(filters, (err, users) => {
    if (err) {
      return res.status(500).json({ status: false, message: "Error: " + err });
    }

    return res.json({ status: true, message: "Success", data: users });
  });
};

const getUserCount = (req, res) => {
  userModel.getUserCount((err, counts) => {
    if (err) {
      return res.status(500).json({ status: false, message: 'Error: ' + err });
    }
    return res.json({ status: true, data: counts });
  });
};

const addUser = (req, res) => {
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
  } = req.body;

  if (!username || !name || !email || !phone || !password) {
    return res.status(400).json({ status: false, message: "Missing required fields" });
  }

  userModel.checkUsernameExists(username, null, (err, exists) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    if (exists) {
      return res.status(409).json({ status: false, message: "Username already exists" });
    }

    userModel.addUser({
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
    }, (err, result) => {
      if (err) {
        console.error("Add User Error:", err);
        return res.status(500).json({ status: false, message: "Database error" });
      }

      return res.json({ status: true, message: "User added successfully" });
    });
  });
};



const updateUser = (req, res) => {
  const user_id = req.params.id;
  const {
    team_id,
    username,
    name,
    email,
    phone,
    consultant_type,
    subadmin_type,
    permissions,
  } = req.body;

  if (!username || !name || !email || !phone) {
    return res.status(400).json({ status: false, message: "Missing required fields" });
  }

  userModel.checkUsernameExists(username, user_id, (err, exists) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    if (exists) {
      return res.status(409).json({ status: false, message: "Username already exists" });
    }

    userModel.updateUser(
      {
        user_id,
        team_id,
        username,
        name,
        email,
        phone,
        consultant_type,
        subadmin_type,
        permissions: JSON.stringify(permissions || {}),
      },
      (err, result) => {
        if (err) {
          console.error("Update Error:", err);
          return res.status(500).json({ status: false, message: "Database error" });
        }

        return res.json({ status: true, message: "User updated successfully" });
      }
    );
  });
};


const updateUserStatus = (req, res) => {
  const userId = req.params.id;
  const { status } = req.body;

  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    return res.status(400).json({ status: false, message: "Invalid status value" });
  }

  userModel.updateUserStatus(userId, status, (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    return res.json({ status: true, message: "User status updated successfully" });
  });
};

const updateAttendance = (req, res) => {
  const userId = req.params.id;
  const { attendance } = req.body;

  if (!["PRESENT", "ABSENT"].includes(attendance)) {
    return res.status(400).json({ status: false, message: "Invalid status value" });
  }

  userModel.updateAttendance(userId, attendance, (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }
        const io = getIO();
        io.emit('updatedAttendance', { userId, attendance });
    return res.json({ status: true, message: "User attendance updated successfully" });
  });
};

const getAllUsersIncludingAdmin = (req, res) =>{
    userModel.getAllUsersIncludingAdmin((err, users) => {
        if(err){
           return res.status(500).json({status : false, message : "an error occured" + err})
        }

        return res.json({status: true, message : "Success" , data: users})
    })
}





// Delete user
const deleteUser = (req, res) => {
    const { id } = req.params;
    userModel.deleteUser(id, (err, result) => {
        if (err) {
            return res.status(500).json({ status: false, message: 'Failed to delete user: ' + err });
        }
        return res.json({ status: true, message: 'User deleted successfully' });
    });
};
module.exports = {
    loginUser,
    getAllUsers,
    getUserCount,
    addUser,
    
    updateUser,
    updateUserStatus,
    deleteUser,
    updateAttendance
};
