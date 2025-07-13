const userModel = require('../models/userModel');

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
    permissions: JSON.stringify(permissions || {}),
  }, (err, result) => {
    if (err) {
      console.error("Error:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    return res.json({ status: true, message: "User added successfully" });
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



// Update user
const updateUser = (req, res) => {
    const { id } = req.params;
    const { name, email, password, user_type } = req.body;
    if (!name || !email || !password || !user_type) {
        return res.status(400).json({ status: false, message: 'All fields are required' });
    }

    userModel.updateUser(id, req.body, (err, result) => {
        if (err) {
            return res.status(500).json({ status: false, message: 'Failed to update user: ' + err });
        }
        return res.json({ status: true, message: 'User updated successfully' });
    });
};

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
    deleteUser
};
