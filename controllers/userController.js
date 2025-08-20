const userModel = require('../models/userModel');
const bookingModel = require('../models/bookingModel');
const helperModel = require('../models/helperModel');
const { getIO } = require("../socket");
const sendPostmarkMail = require('../sendPostmarkMail');

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
            return res.status(401).json({ status : false , message: 'Invalid Username' });
        }
        
         if (String(user.fld_decrypt_password) !== String(userpass)) {
      return res.status(400).json({ status: false, message: "Invalid Password" });
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

      bookingModel.getAdminById(result.insertId, (err, newUser) => {
        if (err) {
          console.error("Fetch New User Error:", err);
          return res.status(500).json({ status: false, message: "Database error" });
        }

        const io = getIO();
        io.emit("userAdded", newUser);

        return res.json({ status: true, message: "User added successfully", user: newUser });
      });
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
        bookingModel.getAdminById(user_id, (err, updatedUser) => {
        if (err) {
          console.error("Fetch updated User Error:", err);
          return res.status(500).json({ status: false, message: "Database error" });
        }

        const io = getIO();
        io.emit("userUpdated", updatedUser);

        return res.json({ status: true, message: "User updated successfully" });
      });
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

  userModel.updateUserStatus(userId, status, (err) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    bookingModel.getAdminById(userId, (err, userRow) => {
      if (err) {
        console.error("DB Fetch Error:", err);
        return res.status(500).json({ status: false, message: "Error fetching user" });
      }

      if (!userRow) {
        return res.status(404).json({ status: false, message: "User not found" });
      }

      // Fetch subject areas from tbl_domain_pref where consultantId matches fld_name
      helperModel.getSubjectAreasByConsultantName(userRow.fld_name, (err, domains) => {
        if (err) {
          console.error("Domain Fetch Error:", err);
          return res.status(500).json({ status: false, message: "Error fetching subject areas" });
        }

        const subjectAreas = domains.map(d => d.domain);
        const enrichedUser = { ...userRow, subject_area: subjectAreas };

        const io = getIO();
        io.emit('updatedUserStatus', enrichedUser);

        return res.json({
          status: true,
          message: "User status updated successfully",
          data: enrichedUser
        });
      });
    });
  });
};

const updateAttendance = (req, res) => {
  const userId = req.params.id;
  const { attendance } = req.body;

  if (!["PRESENT", "ABSENT"].includes(attendance)) {
    return res.status(400).json({ status: false, message: "Invalid attendance value" });
  }

  userModel.updateAttendance(userId, attendance, (err) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    bookingModel.getAdminById(userId, (err, userRow) => {
      if (err) {
        console.error("DB Fetch Error:", err);
        return res.status(500).json({ status: false, message: "Error fetching user" });
      }

      if (!userRow) {
        return res.status(404).json({ status: false, message: "User not found" });
      }

      // Fetch subject areas
      helperModel.getSubjectAreasByConsultantName(userRow.fld_name, (err, domains) => {
        if (err) {
          console.error("Domain Fetch Error:", err);
          return res.status(500).json({ status: false, message: "Error fetching subject areas" });
        }

        const subjectAreas = domains.map(d => d.domain);
        const enrichedUser = { ...userRow, subject_area: subjectAreas };

        const io = getIO();
        io.emit('updatedAttendance', enrichedUser);

        return res.json({
          status: true,
          message: "User attendance updated successfully",
          data: enrichedUser
        });
      });
    });
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

const sendOtpVerification = (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ status: false, message: "Username is required" });
  }

  userModel.getUserByUserName(username, (err, userRow) => {
    if (err) {
      console.error("DB Fetch Error:", err);
      return res.status(500).json({ status: false, message: "Error fetching user" });
    }

    if (!userRow) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const emailId = userRow.fld_email;
    const adminId = userRow.id;

    
    const otpCode = Math.floor(1000 + Math.random() * 9000);

   
    const subject = `OTP for Reset Password || ${process.env.WEBNAME}`;
    const body = `
      Dear ${username},<br/><br/>
      ${otpCode} is your OTP for Password Reset.<br/><br/>
      Thanks & regards,<br/>${process.env.WEBNAME}<br/>
    `;

  
      sendPostmarkMail(
        {
          from: process.env.FROM_EMAIL,
          to: emailId,
          bcc: "",
          subject,
          body,
        },
        (emailErr) => {
          if (emailErr) {
            console.error("Email Send Error:", emailErr);
            return res.status(500).json({ status: false, message: "Failed to send OTP" });
          }

         
          userModel.updateOtp(adminId, otpCode, (updateErr) => {
            if (updateErr) {
              console.error("DB Update Error:", updateErr);
              return res.status(500).json({ status: false, message: "Failed to save OTP" });
            }

            return res.json({
              status: true,
              message: "OTP sent successfully",
              adminId, 
            });
          });
        }
      );

  });
};

const verifyOtp = (req, res) => {
  const { username, otp } = req.body;

  if (!username || !otp) {
    return res.status(400).json({ status: false, message: "Username and OTP are required" });
  }

  userModel.getUserByUserName(username, (err, userRow) => {
    if (err) {
      console.error("DB Fetch Error:", err);
      return res.status(500).json({ status: false, message: "Error fetching user" });
    }

    if (!userRow) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

   
    if (String(userRow.fld_verify) !== String(otp)) {
      return res.status(400).json({ status: false, message: "Invalid OTP" });
    }

  
    return res.json({
      status: true,
      message: "OTP verified successfully",
      password: userRow.fld_decrypt_password, 
    });
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
    updateAttendance,
    sendOtpVerification,
    verifyOtp,
};
