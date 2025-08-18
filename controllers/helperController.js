// controllers/helperController.js
const helperModel = require("../models/helperModel");
const bookingModel = require("../models/bookingModel");
const db = require("../config/db");
const moment = require("moment");
const { getIO, getConnectedUsers } = require("../socket");
const sendPostmarkMail = require("../sendPostmarkMail");

const getAllActiveTeams = (req, res) => {
  helperModel.getAllActiveTeams((err, teams) => {
    if (err) {
      console.error("Error fetching teams:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }

    return res.json({
      status: true,
      message: "Success",
      data: teams.length > 0 ? teams : [],
    });
  });
};

const getAllTeams = (req, res) => {
  helperModel.getAllTeams((err, teams) => {
    if (err) {
      console.error("Error fetching teams:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }

    return res.json({
      status: true,
      message: "Success",
      data: teams.length > 0 ? teams : [],
    });
  });
};

const addTeam = (req, res) => {
  const teamData = req.body;
  if (!teamData.team) {
    return res
      .status(400)
      .json({ status: false, message: "Team name is required" });
  }

  helperModel.addTeam(teamData, (err, insertId) => {
    if (err) {
      console.error("Add team error:", err);
      return res
        .status(500)
        .json({ status: false, message: "Database error while adding team" });
    }

    helperModel.getTeamById(insertId, (err, newTeam) => {
      if (err) {
        console.error("Fetch new team error:", err);
        return res.json({
          status: true,
          message: "Team added, but failed to fetch data",
        });
      }

      const io = getIO();
      io.emit("teamAdded", newTeam);

      return res.json({
        status: true,
        message: "Team added successfully",
        team: newTeam,
      });
    });
  });
};

const updateTeam = (req, res) => {
  const id = req.params.id;
  const teamData = req.body;
  if (!teamData.team) {
    return res
      .status(400)
      .json({ status: false, message: "Team name is required" });
  }

  helperModel.updateTeam(id, teamData, (err, result) => {
    if (err) {
      console.error("Update team error:", err);
      return res
        .status(500)
        .json({ status: false, message: "Database error while updating team" });
    }
    helperModel.getTeamById(id, (err, updatedTeam) => {
      if (err) {
        console.error("Fetch new team error:", err);
        return res.json({
          status: true,
          message: "Team updated, but failed to fetch data",
        });
      }

      const io = getIO();
      io.emit("teamUpdated", updatedTeam);

      return res.json({
        status: true,
        message: "Team updated successfully",
        team: updatedTeam,
      });
    });
    // return res.json({ status: true, message: "Team updated successfully" });
  });
};

const updateTeamStatus = (req, res) => {
  const teamId = req.params.id;
  const { status } = req.body;

  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    return res
      .status(400)
      .json({ status: false, message: "Invalid status value" });
  }

  helperModel.updateTeamStatus(teamId, status, (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    helperModel.getTeamById(teamId, (err, updatedTeam) => {
      if (err) {
        console.error("Fetch new team error:", err);
        return res.json({
          status: true,
          message: "Team status updated, but failed to fetch data",
        });
      }

      const io = getIO();
      io.emit("teamStatusUpdated", updatedTeam);

      return res.json({
        status: true,
        message: "Team Status updated successfully",
        team: updatedTeam,
      });
    });
  });
};

const getAllDomains = (req, res) => {
  helperModel.getAllDomains((err, results) => {
    if (err) {
      console.error("Error fetching domains:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    return res.json({ status: true, data: results });
  });
};

const getAllSubjectAreas = (req, res) => {
  try {
    helperModel.getAllSubjectAreas((err, results) => {
      if (err) {
        console.error("Error fetching subject areas:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }

      return res.json({ status: true, data: results });
    });
  } catch (err) {
    console.error("Error in getting Subject Areas:", err);
    return res
      .status(404)
      .json({ status: false, message: `Server error occurred in controller` });
  }
};

const getAllActiveConsultants = (req, res) => {
  try {
    helperModel.getAllActiveConsultants((err, results) => {
      if (err) {
        console.error("Error fetching consultants:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }

      return res.json({ results });
    });
  } catch (err) {
    console.error("Error in getting consultants:", err);
    return res
      .status(404)
      .json({ status: false, message: `Server error occurred in controller` });
  }
};

const getAdmin = (req, res) => {
  try {
    const { type, status } = req.body;

    helperModel.getAdmin(type, status, (err, results) => {
      if (err) {
        console.error("Error fetching admin list:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }

      return res.json({ status: true, results });
    });
  } catch (err) {
    console.error("Error in getAdmin controller:", err);
    return res
      .status(500)
      .json({ status: false, message: "Server error occurred in controller" });
  }
};

const getPlanDetails = (req, res) => {
  try {
    helperModel.getPlanDetails((err, results) => {
      if (err) {
        console.error("Error fetching plans:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }

      return res.json({ results });
    });
  } catch (err) {
    console.error("Error in getting plans:", err);
    return res
      .status(404)
      .json({ status: false, message: `Server error occurred in controller` });
  }
};

// controllers/helperController.js
const getConsultantsBySubjectArea = (req, res) => {
  const { subject_area } = req.body;

  if (!subject_area) {
    return res.status(400).json({ message: "Subject area is required" });
  }

  db.getConnection((err, connection) => {
    if (err) {
      console.error("DB connection error:", err);
      return res.status(500).json({ message: "Database connection error" });
    }

    // Step 1: Get consultantId from tbl_domain_pref
    const query1 = `
      SELECT cosultantId 
      FROM tbl_domain_pref 
      WHERE domain = ? AND status = 'Active' 
      LIMIT 1
    `;

    connection.query(query1, [subject_area.trim()], (error1, domainRows) => {
      if (error1) {
        connection.release();
        console.error("Query error:", error1);
        return res.status(500).json({ message: "Query error" });
      }

      if (!domainRows.length || !domainRows[0].cosultantId) {
        connection.release();
        return res
          .status(404)
          .json({ message: "No consultants found for this subject area" });
      }

      // Step 2: Extract and process names
      const rawNames = domainRows[0].cosultantId;
      const nameArray = rawNames
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

      if (nameArray.length === 0) {
        connection.release();
        return res.status(404).json({ message: "No valid consultants listed" });
      }

      // Step 3: Query consultants
      const placeholders = nameArray.map(() => "?").join(",");
      const query2 = `
        SELECT id, fld_name, fld_email, fld_permission ,fld_username
        FROM tbl_admin 
        WHERE fld_name IN (${placeholders}) 
        AND fld_admin_type = 'CONSULTANT' 
        AND attendance = 'PRESENT'
        AND status = 'Active'
      `;

      connection.query(query2, nameArray, (error2, consultants) => {
        connection.release();

        if (error2) {
          console.error("Consultant query error:", error2);
          return res.status(500).json({ message: "Consultant fetch error" });
        }

        // Step 4: Sort consultants as per original order
        const sortedConsultants = nameArray
          .map((name) => consultants.find((con) => con.fld_name === name))
          .filter(Boolean);

        const formatted = sortedConsultants.map((con) => ({
          id: con.id,
          fld_name: con.fld_name,
          fld_email: con.fld_email,
          fld_permission: con.fld_permission,
          fld_username: con.fld_username,
        }));

        return res.json(formatted);
      });
    });
  });
};

const fetchBookingDetailsWithRc = (req, res) => {
  const id = req.query.id;
  helperModel.getBookingDetailsWithRc(id, (err, bookingRow) => {
    if (err) {
      console.error("Error fetching booking details:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    if (!bookingRow) {
      return res
        .status(404)
        .json({ status: false, message: "Booking not found" });
    }

    const consultantId = bookingRow.fld_consultantid;

    helperModel.getConsultantSettingData(consultantId, (err2, settingRow) => {
      if (err2) {
        console.error("Error fetching consultant setting:", err2);
        return res.status(500).json({
          status: false,
          message: "Error fetching consultant settings",
        });
      }

      return res.json({
        status: true,
        bookingDetails: bookingRow,
        consultantSettings: settingRow || {},
      });
    });
  });
};

const getUsersByRole = (req, res) => {
  try {
    const { role, status } = req.body;

    helperModel.getUsersByRole(role, status, (err, results) => {
      if (err) {
        console.error("Error in getUsersByRole:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }

      return res.json({ status: true, users: results });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

const getTimezones = (req, res) => {
  const viewtype = req.query.viewtype || "";

  try {
    helperModel.fetchTimezones(viewtype, (err, timezones) => {
      if (err) {
        console.error("Error fetching timezones:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }

      return res.status(200).json({ status: true, data: timezones });
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};

const getBookingData = (req, res) => {
  try {
    const params = req.body;

    helperModel.getBookingData(params, (err, result) => {
      if (err) {
        console.error("DB error:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }
      return res.status(200).json({ status: true, data: result });
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};

const getRcCallBookingRequest = (req, res) => {
  try {
    const params = req.body;

    helperModel.getRcCallBookingRequest(params, (err, result) => {
      if (err) {
        console.error("DB error:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }
      return res.status(200).json({ status: true, data: result });
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};

const getMessageData = (req, res) => {
  try {
    const { bookingId } = req.query;

    if (!bookingId) {
      return res
        .status(400)
        .json({ status: false, message: "Missing bookingId" });
    }

    helperModel.getMessagesByBookingId(bookingId, (err, messages) => {
      if (err) {
        console.error("Error fetching messages:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }

      return res.status(200).json({ status: true, messages });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res
      .status(500)
      .json({ status: false, message: "Unexpected server error" });
  }
};

const chatSubmit = (req, res) => {
  const { comment, bookingid, sender_id, admin_type } = req.body;

  if (!comment || !bookingid || !sender_id || !admin_type) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  helperModel.getMessageCount(bookingid, (countErr, countResult) => {
    if (countErr)
      return res.status(500).json({ success: false, message: "DB error" });

    if (countResult[0].count >= 5) {
      return res.status(200).json({ success: false, message: "limit_exceed" });
    }

    bookingModel.getBookingById(bookingid, (bookErr, bookRows) => {
      if (bookErr || bookRows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Booking not found" });
      }

      const booking = bookRows[0];
      let receiver_id;
      if (admin_type === "CONSULTANT" || admin_type === "SUBADMIN") {
        receiver_id = booking.fld_addedby;
      } else if (admin_type === "EXECUTIVE") {
        receiver_id = booking.fld_consultantid;
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Invalid admin type" });
      }

      const insertData = {
        fld_bookingid: bookingid,
        fld_message: comment,
        fld_postedby: admin_type,
        fld_view_status: "NO",
        fld_sender_id: sender_id,
        fld_receiver_id: receiver_id,
        fld_addedon: moment().format("YYYY-MM-DD HH:mm:ss"),
      };

      helperModel.insertChatMessage(insertData, (insertErr, result) => {
        if (insertErr) {
          return res
            .status(500)
            .json({ success: false, message: "Insert failed" });
        }

        const io = getIO();
        const connectedUsers = getConnectedUsers();

        const receiverSocketId = connectedUsers[receiver_id];
        const adminSocketId = connectedUsers[1]; // assuming admin's user ID is 1

        const payload = {
          id: result.insertId, // New chat message ID
          ...insertData, // All other message fields
        };

        // Emit to admin
        if (adminSocketId) {
          io.to(adminSocketId).emit("notification", payload);
        }

        // Emit to receiver
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("notification", payload);
        }

        return res.status(200).json({
          success: true,
          message: "Message sent",
          chatId: result.insertId,
        });
      });
    });
  });
};

const fetchFollowerData = (req, res) => {
  const { id, follower_consultant_id, bookingid, consultantid, status } =
    req.body;

  const filters = {
    id,
    follower_consultant_id,
    bookingid,
    consultantid,
    status,
  };
  try {
    helperModel.getFollowerData(filters, (err, result) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({
          status: false,
          message: "Server Error",
          data: null,
        });
      }

      return res.status(200).json({
        status: true,
        message: "Follower data fetched successfully",
        data: result,
      });
    });
  } catch (error) {
    console.error("Error in follower fetch:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

const getSaturdayPosition = (dateString) => {
  const date = moment(dateString);
  if (date.isoWeekday() !== 6) return false; // Not Saturday

  const day = date.date();
  let count = 0;

  for (let i = 1; i <= day; i++) {
    if (moment(date).date(i).isoWeekday() === 6) {
      count++;
    }
  }

  return count >= 1 && count <= 4 ? count : false;
};

const getEndTime = (startTime, hours, minutes) => {
  const start = moment(startTime, "h:mm A");
  const end = start.clone().add(hours, "hours").add(minutes, "minutes");
  return end.format("h:mm A");
};

const getFollowerConsultant = (req, res) => {
  const { bookingid, user } = req.body;

  if (!bookingid || !user) {
    return res
      .status(400)
      .json({ status: false, message: "Missing required params" });
  }

  bookingModel.getBookingRowById(bookingid, (err, bookingData) => {
    if (err || !bookingData) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid Booking ID", data: null });
    }

    const bookingDateStr = bookingData.fld_booking_date;
    const bookingSlot = bookingData.fld_booking_slot;
    const bookingMoment = moment(bookingDateStr, "YYYY-MM-DD");
    const bookindateSaturday = getSaturdayPosition(bookingDateStr);

    helperModel.getAllActiveBothConsultants((err, consultants) => {
      if (err) {
        return res
          .status(500)
          .json({ status: false, message: "Error fetching consultants" });
      }

      const availableConsultants = [];
      const currentAdminId = user?.id || 1;

      let index = 0;

      const processConsultant = () => {
        if (index >= consultants.length) {
          return res.status(200).json({
            status: true,
            message: "Fetched follower consultants",
            data: availableConsultants,
          });
        }

        const consultant = consultants[index++];
        if (consultant.id == currentAdminId) {
          return processConsultant(); // skip self
        }

        const params = {
          consultantId: consultant.id,
          selectedDate: bookingDateStr,
          status: "Reject",
          checkType: "CHECK_BOTH",
          hideSubOption: "Yes",
        };

        helperModel.getBookingData(params, (err, bookingList) => {
          const arrBookedSlots = [];

          (bookingList || []).forEach((b) => {
            const startTime = b.fld_booking_slot;
            const hoursMatch = b.fld_no_of_hours_for_call?.match(
              /(\d+(?:\.\d+)?)\s*Hour/
            );
            const totalHours = parseFloat(hoursMatch?.[1] || 0);

            const fullHours = Math.floor(totalHours);
            const extraMinutes = Math.round((totalHours - fullHours) * 60);
            const endTime = getEndTime(startTime, fullHours, extraMinutes);

            let current = moment(startTime, "h:mm A");
            const finalEnd = moment(endTime, "h:mm A");

            while (current.isBefore(finalEnd)) {
              arrBookedSlots.push(current.format("h:mm A"));
              current.add(30, "minutes");
            }

            arrBookedSlots.push(finalEnd.format("h:mm A"));
          });

          helperModel.getConsultantSettingData(
            consultant.id,
            (err, settingData) => {
              const weekdayShort = bookingMoment.format("ddd").toLowerCase(); // mon, tue...
              const timeBlock = settingData?.[`fld_${weekdayShort}_time_block`];

              if (timeBlock) {
                const timeBlocks = timeBlock.split(" - ");
                timeBlocks.forEach((t) =>
                  arrBookedSlots.push(moment(t, "h:mm A").format("h:mm A"))
                );
              }

              const isSlotTaken = arrBookedSlots.includes(
                moment(bookingSlot, "HH:mm:ss").format("h:mm A")
              );
              const isDateExcluded = settingData?.fld_days_exclusion
                ?.split("|~|")
                .includes(bookingDateStr);
              const isSaturdayOff = settingData?.fld_saturday_off
                ?.split(",")
                .includes(String(bookindateSaturday));

              if (!isSlotTaken && !isDateExcluded && !isSaturdayOff) {
                availableConsultants.push({
                  id: consultant.id,
                  name: consultant.fld_name,
                });
              }

              processConsultant(); // move to next consultant
            }
          );
        });
      };

      processConsultant();
    });
  });
};

const addFollower = (req, res) => {
  const { bookingid, user, followerConsultantId, followerConsultantName } =
    req.body;

  if (
    !bookingid ||
    !followerConsultantId ||
    !followerConsultantName ||
    !user?.id ||
    !user?.fld_name
  ) {
    return res
      .status(400)
      .json({ status: false, message: "Missing required data" });
  }

  bookingModel.getBookingRowById(bookingid, (err, bookingRow) => {
    if (err || !bookingRow) {
      return res
        .status(404)
        .json({ status: false, message: "Booking not found" });
    }

    helperModel.checkFollowerExists(
      bookingid,
      followerConsultantId,
      (err, exists) => {
        if (err) {
          return res.status(500).json({
            status: false,
            message: "Error checking existing follower",
          });
        }

        if (exists) {
          return res
            .status(409)
            .json({ status: false, message: "Follower already added" });
        }

        const addedon = moment().format("YYYY-MM-DD HH:mm:ss");
        const followerData = {
          bookingid: bookingid,
          follower_consultant_id: followerConsultantId,
          consultantid: user.id, // logged-in consultant ID
          addedon: addedon,
        };

        helperModel.insertFollower(followerData, (err, insertId) => {
          if (err || !insertId) {
            return res
              .status(500)
              .json({ status: false, message: "Failed to insert follower" });
          }

          const commentDate = moment().format("D MMM YYYY");
          const commentTime = moment().format("h:mm a");
          const comment = `${user.fld_admin_type} ${user.fld_name} added ${followerConsultantName} as a follower on ${commentDate} at ${commentTime}`;

          const historyData = {
            fld_booking_id: bookingid,
            fld_comment: comment,
            fld_notif_view_sts: "READ",
            fld_addedon: moment().format("YYYY-MM-DD"),
          };

          bookingModel.insertBookingHistory(historyData, (err, historyId) => {
            if (err || !historyId) {
              return res
                .status(500)
                .json({ status: false, message: "Failed to insert history" });
            }
            emitBookingUpdate(bookingid);
            return res.status(200).json({
              status: true,
              message: "Follower added successfully",
              followerId: insertId,
              historyId: historyId,
            });
          });
        });
      }
    );
  });
};

const updateExternalBookingInfo = (req, res) => {
  const {
    bookingid,
    external_booking_time,
    external_booking_date,
    call_joining_link,
    user,
  } = req.body;

  if (!user || user.fld_admin_type !== "EXECUTIVE") {
    return res.status(401).json({ status: false, msg: "Unauthorized access" });
  }

  // Validate required fields
  if (!bookingid || !external_booking_time || !external_booking_date) {
    return res
      .status(400)
      .json({ status: false, msg: "Missing required data" });
  }

  try {
    const formattedDate = moment(external_booking_date, [
      "YYYY-MM-DD",
      "DD-MM-YYYY",
    ]).format("YYYY-MM-DD");
    const formattedTime = moment(external_booking_time, "HH:mm").format(
      "h:mm A"
    );

    const updateData = {
      fld_booking_date: formattedDate,
      fld_booking_slot: formattedTime,
      fld_call_joining_link: (call_joining_link || "").trim(),
    };

    bookingModel.updateBooking(bookingid, updateData, (err1, result1) => {
      if (err1) {
        console.error("Error updating booking:", err1);
        return res
          .status(500)
          .json({ status: false, msg: "Error updating booking!" });
      }

      const adminName = user.fld_name || "Unknown Admin";
      const commentDate = moment().format("D MMM YYYY");
      const commentTime = moment().format("h:mm a");
      const comment = `External Call Booking Info Updated by CRM ${adminName} on ${commentDate} at ${commentTime}`;

      const historyData = {
        fld_booking_id: bookingid,
        fld_comment: comment,
        fld_notif_for: "SUBADMIN",
        fld_addedon: moment().format("YYYY-MM-DD"),
      };

      bookingModel.insertBookingHistory(historyData, (err2, historyId) => {
        if (err2) {
          console.error("Error inserting history:", err2);
          return res
            .status(500)
            .json({ status: false, msg: "Error logging history!" });
        }

        emitBookingUpdate(bookingid);

        return res
          .status(200)
          .json({ status: true, msg: "Booking Info. Updated Successfully" });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ status: false, msg: "Something went wrong" });
  }
};

const getNotifications = (req, res) => {
  try {
    const user = req.body;
    if (!user || !user.id || !user.fld_admin_type) {
      return res.status(400).json({
        status: false,
        message: "User ID and admin type are required",
      });
    }

    helperModel.getNotifications(user, (err, results) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({
          status: false,
          message: "Failed to fetch notifications",
          error: err.message || err,
        });
      }

      return res.json({
        status: true,
        message: "Notifications fetched successfully",
        data: results,
      });
    });
  } catch (error) {
    // This catches synchronous errors in controller code itself
    console.error("Controller error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message || error,
    });
  }
};

const markAsRead = (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Notification ID is required" });
  }

  try {
    helperModel.markAsRead(id, (err) => {
      if (err) {
        console.error("Error in markAsRead:", err);
        return res
          .status(500)
          .json({ error: "Failed to mark notification as read" });
      }

      return res.status(200).json({ message: "Notification marked as read" });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

function emitBookingUpdate(bookingId) {
  bookingModel.getBookingById(bookingId, (err, bookingRows) => {
    if (!err && bookingRows && bookingRows.length > 0) {
      const updatedBooking = bookingRows[0];
      const io = getIO();
      io.emit("bookingUpdated", updatedBooking);
      if (updatedBooking.fld_call_request_id && updatedBooking.fld_rc_call_request_id) {
                    emitRcBookingUpdate(updatedBooking.fld_call_request_id);
                  }
    }
  });
}

function emitRcBookingUpdate(callRequestId) {
  bookingModel.getRcCallBookingRequestById(
    callRequestId,
    (err, rcBookingRow) => {
      if (!err && rcBookingRow) {
        const io = getIO();
        io.emit("rcBookingUpdated", rcBookingRow);
      }
    }
  );
}

function emitBookingConfirmation(consultantId,date,slot) {

   
      const io = getIO();
      io.emit("bookingConfirmed", consultantId,date,slot);
 
}
const verifyOtpUrl = (req, res) => {
  const { bookingId, verifyOtpUrl } = req.body;

  if (!bookingId || !verifyOtpUrl) {
    return res.status(400).json({ status: false, message: "Invalid request" });
  }

  bookingModel.getBookingByOtpUrl(bookingId, verifyOtpUrl, (err, results) => {
    if (err) {
      return res.status(500).json({ status: false, message: "Database error" });
    }

    if (!results || results.length == 0) {
      return res.json({ status: false, url_status: "Expired" });
    }

    const bookingInfo = results[0];
    const name = bookingInfo.fld_name;
    const email = bookingInfo.fld_email;
    const verifyEmailOtp = Math.floor(1000 + Math.random() * 9000);

    const status = bookingInfo.fld_call_confirmation_status;

    if (!status || status === "Call Confirmation Pending at Client End") {
      const updateData = {
        fld_otp: verifyEmailOtp,
        fld_call_confirmation_status: "Call Confirmation Pending at Client End",
        fld_otp_addedon: moment().format("YYYY-MM-DD"),
      };

      bookingModel.updateBooking(bookingId, updateData, () => {
        const subject = `Web Code Verification Code for 2 Factor Authentication ${process.env.WEBNAME}`;
        const body = `
            Hi ${name}, <br/><br/>
            Your Web Code to verify 2 factor authentication is ${verifyEmailOtp}. <br/><br/>
            Thanks & Regards,<br/> ${process.env.WEBNAME}
          `;

        sendPostmarkMail(
          {
            from: process.env.FROM_EMAIL,
            to: email,
            subject,
            body,
          },
          () => {}
        );
      });
    }

    return res.json({
      status: true,
      booking: bookingInfo,
      verifyemailotp: verifyEmailOtp,
      url_status: "Valid",
    });
  });
};

const validateOtp = (req, res) => {
  const { str2, booking_id } = req.body;

  if (!str2 || !booking_id) {
    return res.status(400).json({ status: false, message: "error" });
  }
  bookingModel.getBookingById(booking_id, (err, bookingRows) => {
    // Proper DB error handling
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }

    // No booking found
    if (!bookingRows || bookingRows.length === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Booking not found" });
    }

    const bookingInfo = bookingRows[0];

    if (!bookingInfo) {
      return res
        .status(404)
        .json({ status: false, message: "Booking not found" });
    }

    // If both OTP and verify URL are empty
    if (!bookingInfo.fld_verify_otp_url && !bookingInfo.fld_otp) {
      return res.json({ status: false, message: "other_confirmed" });
    }

    // OTP matches
    if (String(bookingInfo.fld_otp).trim() === String(str2).trim()) {
      const updateData = {
        fld_call_confirmation_status: "Call Confirmed by Client",
        fld_otp: "",
        fld_verify_otp_url: null,
        fld_consultation_sts: "Accept",
        fld_call_request_sts: "Accept",
        fld_status_options:
          "I have gone through all the details,I have received the meeting link",
      };

      bookingModel.updateBooking(booking_id, updateData, (err) => {
        if (err) {
          console.error("Update booking error:", err);
          return res
            .status(500)
            .json({ status: false, message: "Server error" });
        }
        emitBookingUpdate(bookingId);
        emitBookingConfirmation(bookingInfo.fld_consultantid,bookingInfo.fld_booking_date,bookingInfo.fld_booking_slot);
        // Insert booking history
        const currentDate = moment().format("D MMM YYYY");
        const currentTime = moment().format("h:mm a");
        const comment = `Call validated by client on ${currentDate} at ${currentTime}`;

        bookingModel.insertBookingHistory(
          {
            fld_booking_id: booking_id,
            fld_comment: comment,
            fld_notif_for: "EXECUTIVE",
            fld_notif_for_id: bookingInfo.fld_addedby,
            fld_addedon: new Date(),
          },
          (err) => {
            if (err) {
              console.error("Insert history error:", err);
              return res
                .status(500)
                .json({ status: false, message: "Server error" });
            }

            // If call related to a consultant
            if (
              bookingInfo.fld_call_related_to !== "I_am_not_sure" &&
              bookingInfo.fld_consultantid > 0
            ) {
              const proceedAfterRCUpdate = () => {
                bookingModel.getOtherBookingData(
                  {
                    consultantId: bookingInfo.fld_consultantid,
                    bookingDate: bookingInfo.fld_booking_date,
                    bookingSlot: bookingInfo.fld_booking_slot,
                    saleType: bookingInfo.fld_sale_type,
                  },
                  (err, otherBookings) => {
                    if (err) {
                      console.error("Get other bookings error:", err);
                      return res
                        .status(500)
                        .json({ status: false, message: "Server error" });
                    }

                    const currentDateRes = moment().format("D MMM YYYY");
                    const currentTimeRes = moment().format("h:mm a");

                    let processed = 0;
                    if (!otherBookings.length) {
                      sendConfirmedMail();
                      return;
                    }

                    otherBookings.forEach((row) => {
                      if (
                        row.id !== booking_id &&
                        row.fld_consultant_another_option !== "TEAM" &&
                        row.fld_call_confirmation_status !==
                          "Call Confirmed by Client" &&
                        row.fld_call_request_sts !== "Cancelled" &&
                        row.fld_call_request_sts !== "Reject"
                      ) {
                        bookingModel.updateBooking(
                          row.id,
                          {
                            fld_call_confirmation_status: "",
                            fld_booking_date: null,
                            fld_booking_slot: null,
                            fld_call_request_sts: "Rescheduled",
                            fld_consultation_sts: "Rescheduled",
                            fld_verify_otp_url: null,
                            fld_otp: "",
                          },
                          (err) => {
                            if (err) console.error("Error rescheduling:", err);

                            if (
                              row.fld_call_request_id > 0 &&
                              row.fld_rc_call_request_id > 0
                            ) {
                              bookingModel.updateRcCallRequestSts(
                                row.fld_call_request_id,
                                row.fld_rc_call_request_id,
                                "Rescheduled",
                                () => {}
                              );
                            }

                            emitBookingUpdate(row.id);

                            bookingModel.insertBookingHistory(
                              {
                                fld_booking_id: row.id,
                                fld_comment: `Call cancelled and to be rescheduled as client did not confirm on ${currentDateRes} at ${currentTimeRes}`,
                                fld_notif_for: "EXECUTIVE",
                                fld_notif_for_id: row.fld_addedby,
                                fld_addedon: moment().toDate(),
                              },
                              () => {}
                            );

                            bookingModel.getAdminById(
                              row.fld_addedby,
                              (err, crmDetails) => {
                                if (
                                  !err &&
                                  crmDetails 
                                 
                                ) {
                                  sendPostmarkMail({
                                    to: crmDetails.fld_email,
                                    subject: `Call Rescheduled – Reference ID: ${row.fld_client_id}`,
                                    body: `
                              Hi ${crmDetails.fld_name},<br><br>
                              This is to inform you that the scheduled call with the client has been <strong>cancelled and to be rescheduled</strong> as the client did not confirm.<br><br>
                              <strong>Details:</strong><br>
                              Reference ID: ${row.fld_client_id}<br>
                              Client Name: ${row.fld_name}<br><br>
                              Regards,<br>${process.env.WEBNAME}<br>
                            `,
                                  });

                                }
                                processed++;
                                if (processed === otherBookings.length) {
                                  sendConfirmedMail();
                                }
                              }
                            );
                          }
                        );
                      } else {
                        processed++;
                        if (processed === otherBookings.length) {
                          sendConfirmedMail();
                        }
                      }
                    });
                  }
                );
              };

              // If RC Call Request needs updating
              if (
                bookingInfo.fld_call_request_id > 0 &&
                bookingInfo.fld_rc_call_request_id > 0
              ) {
                bookingModel.updateRcCallRequestSts(
                  bookingInfo.fld_call_request_id,
                  bookingInfo.fld_rc_call_request_id,
                  "Accept",
                  proceedAfterRCUpdate
                );
              } else {
                proceedAfterRCUpdate();
              }

              const sendConfirmedMail = () => {
                bookingModel.getAdminById(
                  bookingInfo.fld_addedby,
                  (err, crmDetails) => {
                    if (
                      !err &&
                      crmDetails 
                      
                    ) {
                      sendPostmarkMail({
                        to: crmDetails.fld_email,
                        subject: `Call confirmed by client ${bookingInfo.fld_name} - Booking Id ${bookingInfo.fld_bookingcode} || ${process.env.WEBNAME}`,
                        body: `
                          Hi ${crmDetails.fld_name},<br/><br/>
                          The client ${bookingInfo.fld_name} with booking id ${bookingInfo.fld_bookingcode} has confirmed the call and will be available.<br/><br/>
                          Thanks & regards,<br/>${process.env.WEBNAME}<br/>
                        `,
                      });
                    }
                    res.json({ status: true, bookingId: booking_id });
                  }
                );
              };
            } else {
              return res.json({ status: true, bookingId: booking_id });
            }
          }
        );
      });
    } else {
      return res.json({ status: false, message: "fail" });
    }
  });
};

module.exports = {
  getAllActiveTeams,
  getAllTeams,
  addTeam,
  updateTeam,
  updateTeamStatus,
  getAllDomains,
  getAllSubjectAreas,
  getAllActiveConsultants,
  getConsultantsBySubjectArea,
  getPlanDetails,
  fetchBookingDetailsWithRc,
  getUsersByRole,
  getTimezones,
  getBookingData,
  getRcCallBookingRequest,

  getAdmin,
  getMessageData,
  chatSubmit,
  fetchFollowerData,
  getFollowerConsultant,
  addFollower,
  updateExternalBookingInfo,
  getNotifications,
  markAsRead,
  verifyOtpUrl,
  validateOtp,
};
