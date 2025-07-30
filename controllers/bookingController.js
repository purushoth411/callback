const bookingModel = require("../models/bookingModel");
const helperModel = require("../models/helperModel");
const sendPostmarkMail = require("../sendPostmarkMail");
const crypto = require("crypto");
const logger = require("../logger");
const moment = require("moment-timezone");
const FormData = require("form-data");

const axios = require("axios");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const fetchBookings = (req, res) => {
  const userId = req.user?.id || req.body.userId; // Assuming JWT middleware or fallback
  const userType = req.user?.type || req.body.userType;
  const assigned_team = req.user?.assigned_team || req.body.assigned_team;
  const filters = req.body.filters || {};
  const dashboard_status = req.body.dashboard_status || null;

  // Validate required fields
  if (!userId || !userType) {
    return res.status(400).json({
      status: false,
      message: "Missing userId or userType",
    });
  }

  bookingModel.getBookings(
    userId,
    userType,
    assigned_team,
    filters,
    dashboard_status,
    (err, bookings) => {
      if (err) {
        console.error("Booking Fetch Error:", err);
        return res.status(500).json({
          status: false,
          message: "Error fetching bookings",
          error: err.message,
        });
      }

      res.status(200).json({
        status: true,
        message: "Bookings fetched successfully",
        data: bookings,
      });
    }
  );
};

const getBookingHistory = (req, res) => {
  const bookingId = req.params.id;

  if (!bookingId) {
    return res
      .status(400)
      .json({ status: false, message: "Missing booking ID" });
  }

  bookingModel.getBookingHistory(bookingId, (err, results) => {
    if (err) {
      console.error("Error fetching booking history:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    return res.status(200).json({ status: true, data: results });
  });
};

const getPresaleClientDetails = (req, res) => {
  const client_id = req.params.client_id;

  if (!client_id) {
    return res
      .status(400)
      .json({ status: false, message: "Missing Client ID" });
  }
  bookingModel.getPresaleClientDetails(client_id, (err, result) => {
    if (err) {
      console.error("Error fetching client details history:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    return res.status(200).json({ status: true, data: result });
  });
};

const getPostsaleClientDetails = (req, res) => {
  const client_id = req.params.client_id;

  if (!client_id) {
    return res
      .status(400)
      .json({ status: false, message: "Missing Client ID" });
  }
  bookingModel.getPostsaleClientDetails(client_id, (err, result) => {
    if (err) {
      console.error("Error fetching client details history:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    return res.status(200).json({ status: true, data: result });
  });
};

const getProjectMilestones = (req, res) => {
  const projectId = req.params.projectId;

  if (!projectId) {
    return res
      .status(400)
      .json({ status: false, message: "Missing project ID" });
  }

  bookingModel.getProjectMilestones(projectId, (err, result) => {
    if (err) {
      console.error("Error fetching milestones:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    return res.status(200).json({ status: true, data: result });
  });
};

const checkCallrecording = (req, res) => {
  const { email, ref_id } = req.body;

  if (!email || !ref_id) {
    return res
      .status(400)
      .json({ status: false, message: "Missing required parameters" });
  }

  try {
    bookingModel.checkCallrecording(email, ref_id, (err, result) => {
      if (err) {
        console.error("Model Error:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }

      if (result.length > 0) {
        return res.status(200).json({
          status: false,
          message: "Previous call recording not uploaded for this client!",
        });
      } else {
        return res.status(200).json({ status: true });
      }
    });
  } catch (error) {
    console.error("Controller Error:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

const checkConsultantWebsiteCondition = async (req, res) => {
  try {
    const { consultantid, email, insta_website } = req.body;

    if (consultantid > 0 && email && insta_website) {
      bookingModel.checkConsultantClientWebsite(
        consultantid,
        email,
        insta_website,

        (err, result) => {
          if (err) {
            console.error("Database error:", err);
            return res
              .status(500)
              .json({ status: "fail", error: "Database error" });
          }

          if (!result) {
            return res.json({ status: "failresult" });
          }

          let webStatus = "SAME";
          if (
            result.fld_insta_website &&
            insta_website != result.fld_insta_website
          ) {
            webStatus = "DIFFERENT";
          }

          const bookDateTime = new Date(
            `${result.fld_booking_date} ${result.fld_booking_slot}`
          );
          const bookingTime = bookDateTime.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          });

          return res.json({
            status: "success",
            webStatus: webStatus,
            bookingTime: bookingTime,
            websiteName: result.fld_insta_website,
          });
        }
      );
    } else {
      return res.json({ status: "failfinal" });
    }
  } catch (error) {
    console.error("Server error:", error);
    return res
      .status(500)
      .json({ status: "fail", error: "Internal server error" });
  }
};

const checkConsultantTeamCondition = async (req, res) => {
  try {
    const { primaryconsultantid, clientemail, saletype, login_crm_id } =
      req.body;

    if (saletype !== "Presales") return res.send("call not completed");

    bookingModel.checkConsultantCompletedCall(
      primaryconsultantid,
      clientemail,
      saletype,
      login_crm_id,
      (err, result) => {
        if (err) return res.status(500).send("server error");

        return res.send(result); // result could be 'add call', 'call not completed', or the formatted message
      }
    );
  } catch (error) {
    console.error("Error in checkConsultantTeamCondition:", error);
    return res.status(500).send("server error");
  }
};

const checkPresalesCall = (req, res) => {
  const { clientemail, saletype, primaryconsultantid } = req.body;

  try {
    bookingModel.checkPresalesCall(
      clientemail,
      primaryconsultantid,
      (err, result) => {
        if (err) {
          console.error("Error in model:", err);
          return res
            .status(500)
            .json({ status: false, message: "Something went wrong" });
        }

        if (result && result.length > 0) {
          const booking = result[0];
          return res.json({
            status: true,
            message: "Previous call is still pending",
            consultant_name: booking.fld_consultant_name || "",
            booking_time: booking.fld_booking_time || "",
          });
        } else {
          return res.json({
            status: false,
            message: "No previous pending presales call.",
          });
        }
      }
    );
  } catch (ex) {
    console.error("Unexpected error:", ex);
    return res
      .status(500)
      .json({ status: false, message: "Something went wrong" });
  }
};

const insertCallRequest = (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      booking_date,
      que_counter,
      question_data,
      consultant_id,
      crm_id,
      sale_type,
      project_milestone,
      project_milestone_name,
      projectid,
      force_presales_add,
      completedCalls,
      allowedCalls,
      requestMessage,
      client_plan_id,
      client_id,
      call_related_to,
      rc_call_request_id,
      call_request_id,
      subject_area,
      company_name,
      asana_link,
      internal_comments,
      call_regarding,
      topic_of_research,
      insta_website,
      secondary_consultant_id,
      consultant_another_option,
      add_call_by,
      user,
    } = req.body;

    const formatted_booking_date = booking_date
      ? new Date(booking_date).toISOString().split("T")[0]
      : null;
    let question_data_string =
      Array.isArray(question_data) && question_data.length > 0
        ? question_data.join("~~")
        : "";

    let str_answer_data = "";
    for (let i = 1; i <= que_counter; i++) {
      let ans = req.body[`question_no_${i}`];
      if (Array.isArray(ans)) ans = ans.join(",");
      if (ans) str_answer_data += ans + "|~|";
    }
    str_answer_data = str_answer_data.replace(/\|~\|$/, "");

    // STEP 1: Check call request limit
    bookingModel.getClientCallsRequestPlanLimitOver(
      email,
      "Yes",
      project_milestone,
      (err, limitResult) => {
        if (err)
          return res
            .status(500)
            .json({ status: false, message: "DB Error", error: err.message });

        if (limitResult && limitResult.totalrow > 0) {
          return res
            .status(400)
            .json({ status: true, message: "Add Call Request Already Sent!" });
        }

        // STEP 2: Generate credentials
        const password = generateRandomPassword();
        const usercode = generateUserCode();
        const verifycode =
          Math.floor(Math.random() * (99999 - 11111 + 1)) + 11111;

        const hashedPassword = crypto
          .createHash("md5")
          .update(password)
          .digest("hex");

        const userData = {
          fld_password: hashedPassword,
          fld_decrypt_password: password,
          fld_user_code: usercode,
          fld_name: name.trim(),
          fld_email: email.trim(),
          fld_phone: phone.trim(),
          fld_verify: verifycode,
          fld_addedon: new Date(),
        };

        // STEP 3: Insert User
        bookingModel.insertUser(
          userData,
          email,
          name,
          verifycode,
          (err, insertId) => {
            if (err)
              return res.status(500).json({
                status: false,
                message: "Insert user error",
                error: err.message,
              });
            if (!insertId)
              return res
                .status(400)
                .json({ status: false, message: "User insert failed" });

            // STEP 4: Get Meeting ID
            bookingModel.getMeetingId((err, meetingId) => {
              if (err)
                return res
                  .status(500)
                  .json({ status: false, message: "Meeting ID error" });

              // STEP 5: Get Admin Info
              const adminId =
                req.user?.fld_admin_type === "SUPERADMIN" ? crm_id : crm_id;
              bookingModel.getAdmin(adminId, "EXECUTIVE", (err, adminInfo) => {
                if (err) {
                  console.error("Error fetching admin info:", err);
                  return res
                    .status(500)
                    .json({ status: false, message: "Admin info error" });
                }

                const teamId = adminInfo?.fld_team_id;

                // STEP 6: Create Booking Object
                const bookingData = {
                  fld_userid: insertId,
                  fld_teamid: teamId,
                  fld_consultantid: consultant_id,
                  fld_secondary_consultant_id: secondary_consultant_id,

                  fld_name: name.trim(),
                  fld_email: email.trim(),
                  fld_phone: phone.trim(),
                  fld_sale_type: sale_type,
                  fld_bookingcode: meetingId,
                  fld_booking_date: formatted_booking_date,
                  fld_que_counter: que_counter,
                  fld_question_data: question_data_string,
                  fld_answer_data: str_answer_data,
                  fld_addedon: new Date(),
                  fld_call_request_sts: "Consultant Assigned",
                  fld_consultant_assigned_by_admin: "Yes",
                  fld_consultant_approve_sts: "Yes",
                  fld_addedby: adminId,
                  fld_call_related_to: call_related_to,
                  fld_subject_area: subject_area,
                  fld_company_name: company_name,
                  fld_asana_link: asana_link,
                  fld_internal_comments: internal_comments,
                  fld_insta_website: insta_website,
                  fld_call_regarding: call_regarding,
                  fld_topic_of_research: topic_of_research,
                  fld_consultant_another_option: consultant_another_option,
                  fld_add_call_by: add_call_by,
                  fld_rc_projectid: projectid,
                  fld_rc_milestone_name: project_milestone_name,
                  fld_rc_milestoneid: project_milestone,
                  fld_client_id: client_id,
                };

                if (
                  allowedCalls <= completedCalls &&
                  sale_type === "Postsales" &&
                  allowedCalls !== "Unlimited"
                ) {
                  bookingData.callDisabled = "Yes";
                }

                const force_presales_add_final =
                  sale_type === "Postsales" ? "" : force_presales_add;

                // STEP 7: Insert Booking
                bookingModel.insertBooking(
                  bookingData,
                  adminId,
                  email,
                  sale_type,
                  consultant_id,
                  force_presales_add_final,
                  client_id,
                  (err, bookingId) => {
                    if (err)
                      return res.status(500).json({
                        status: false,
                        message: "Insert booking error",
                      });

                    if (!bookingId) {
                      return res.status(400).json({
                        status: false,
                        message: "Booking already exists",
                      });
                    }

                    // STEP 8: If request call needed
                    if (
                      allowedCalls <= completedCalls &&
                      sale_type === "Postsales" &&
                      allowedCalls !== "Unlimited"
                    ) {
                      logger.info(`This is a Request Call `);

                      const addCallRequestData = {
                        bookingId: bookingId,
                        planId: client_plan_id,
                        requestMessage: requestMessage,
                        userId: crm_id,
                        addedon: new Date(),
                      };

                      bookingModel.insertAddCallRequest(
                        addCallRequestData,
                        (err) => {
                          if (err)
                            return res.status(500).json({
                              status: false,
                              message: "Add call request insert failed",
                            });
                        }
                      );
                    }

                    // STEP 9: Update RC call request status
                    if (call_request_id && rc_call_request_id) {
                      bookingModel.updateRcCallRequestSts(
                        call_request_id,
                        rc_call_request_id,
                        "Consultant Assigned",
                        () => {}
                      );
                    }

                    if (call_related_to === "I_am_not_sure") {
                      logger.info(`I am not sure `);
                      const extCallData = {
                        fld_booking_id: bookingId,
                        fld_call_added_by: adminId,
                        fld_consultation_sts: "Pending",
                        fld_call_request_sts: "Pending",
                        fld_added_on: new Date(),
                      };

                      bookingModel.insertExternalCall(extCallData, (err) => {
                        if (err) {
                          console.error(
                            "External call insert failed:",
                            err.message
                          );
                        }
                      });

                      const extComment = `External Call Assigned by CRM ${
                        user?.fld_name || "CRM"
                      } on ${getFormattedDate()} at ${getFormattedTime()}`;

                      const extHistory = {
                        fld_booking_id: bookingId,
                        fld_comment: extComment,
                        fld_notif_for: "SUBADMIN",
                        fld_addedon: new Date(),
                      };

                      bookingModel.insertBookingHistory(extHistory, (err) => {
                        if (err)
                          console.error(
                            "Error inserting external call history"
                          );
                      });

                      // Also mark booking as external assigned
                      bookingModel.updateBooking(
                        bookingId,
                        { fld_call_external_assign: "Yes" },
                        () => {}
                      );
                    }

                    // STEP 11: Booking history for consultants
                    if (consultant_id) {
                      const comment1 = `Call assigned for consultant ${consultant_id} by ${adminId} on ${getFormattedDate()} at ${getFormattedTime()}`;

                      const history1 = {
                        fld_booking_id: bookingId,
                        fld_comment: comment1,
                        fld_notif_for: "EXECUTIVE",
                        fld_notif_for_id: user?.fld_admin_id || adminId,
                        fld_addedon: new Date(),
                      };

                      bookingModel.insertBookingHistory(history1, (err) => {
                        if (err)
                          console.error(
                            "Primary consultant history insert failed:",
                            err.message
                          );
                      });
                    }

                    if (
                      secondary_consultant_id &&
                      secondary_consultant_id !== 0
                    ) {
                      const comment2 = `Call assigned for consultant ${secondary_consultant_id} by ${adminId} on ${getFormattedDate()} at ${getFormattedTime()}`;

                      const history2 = {
                        fld_booking_id: bookingId,
                        fld_comment: comment2,
                        fld_notif_for: "EXECUTIVE",
                        fld_notif_for_id: user?.fld_admin_id || adminId,
                        fld_addedon: new Date(),
                      };

                      bookingModel.insertBookingHistory(history2, (err) => {
                        if (err)
                          console.error(
                            "Secondary consultant history insert failed:",
                            err.message
                          );
                      });
                    }

                    return res.status(200).json({
                      status: true,
                      message: "Call Request Added Successfully",
                      bookingId: bookingId,
                      redirectTo:
                        call_related_to === "I_am_not_sure"
                          ? "/admin/viewexternalcall"
                          : "/admin/viewbooking",
                    });
                  }
                );
              });
            });
          }
        );
      }
    );
  } catch (error) {
    console.error("Error in insertCallRequest:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

function generateRandomPassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = Math.floor(Math.random() * (999 - 111 + 1)) + 111;
  return (
    chars.charAt(Math.floor(Math.random() * chars.length)) +
    nums +
    chars.charAt(Math.floor(Math.random() * chars.length)) +
    chars.charAt(Math.floor(Math.random() * chars.length)) +
    Math.floor(Math.random() * (999 - 111 + 1)) +
    111
  );
}

function generateUserCode() {
  return "USER" + Date.now();
}

function getFormattedDate() {
  const d = new Date();
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getFormattedTime() {
  const d = new Date();
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const checkPostsaleCompletedCalls = (req, res) => {
  try {
    const { email, milestone_id } = req.body;

    if (!email || !milestone_id) {
      return res.status(400).json({
        status: false,
        message: "Email and milestone ID are required",
      });
    }

    bookingModel.getPostsaleCompletedCalls(
      email,
      milestone_id,
      (err, result) => {
        if (err) {
          console.error("Error fetching completed calls:", err);
          return res
            .status(500)
            .json({ status: false, message: "Database error" });
        }

        return res.json({ status: true, result }); // result.totalrow is your count
      }
    );
  } catch (error) {
    console.error("Error in controller (checkPostsaleCompletedCalls):", error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};

const saveCallScheduling = (req, res) => {
  const {
    bookingId,
    consultantId,
    bookingDate,
    slot,
    timezone,
    callLink,
    secondaryConsultantId,
  } = req.body;

  if (!bookingId || !consultantId || !bookingDate || !slot) {
    return res.json({ status: false, message: "Missing required data." });
  }

  const booking_date = moment(bookingDate).format("YYYY-MM-DD");
  const booking_slot = slot;
  const slcttimezone = timezone;
  const call_joining_link = callLink;

  const bookingData = {
    fld_booking_date: booking_date,
    fld_booking_slot: booking_slot,
    fld_timezone: slcttimezone,
    fld_call_joining_link: call_joining_link,
    fld_call_request_sts: "Call Scheduled",
    fld_addedon: moment().format("YYYY-MM-DD HH:mm:ss"),
  };

  // Step 1: Update Booking
  bookingModel.updateBooking(bookingId, bookingData, (err) => {
    if (err)
      return res.json({ status: false, message: "Failed to update booking." });

    // Step 2: Get Consultant Info
    helperModel.getAdminById(consultantId, (err, admin) => {
      if (err || !admin)
        return res.json({ status: false, message: "Consultant not found." });

      const comment = `Call scheduled by ${admin.fld_name} on ${moment().format(
        "DD MMM YYYY"
      )} at ${moment().format("hh:mm a")}`;

      const historyData = {
        fld_booking_id: bookingId,
        fld_comment: comment,
        fld_notif_for: admin.fld_admin_type,
        fld_notif_for_id: consultantId,
        fld_addedon: moment().format("YYYY-MM-DD"),
      };

      // Step 3: Insert Primary Consultant History
      bookingModel.insertBookingHistory(historyData, (err) => {
        if (err)
          return res.json({
            status: false,
            message: "Failed to insert history log.",
          });

        // Step 4: Secondary Consultant (if passed)
        if (secondaryConsultantId) {
          helperModel.getAdminById(secondaryConsultantId, (err, secAdmin) => {
            if (err || !secAdmin) {
              return res.json({
                status: true,
                message:
                  "Call scheduled, but failed to load secondary consultant.",
              });
            }

            const secComment = `Call scheduled by ${
              admin.fld_name
            } for secondary consultant on ${moment().format(
              "DD MMM YYYY"
            )} at ${moment().format("hh:mm a")}`;

            const secHistory = {
              fld_booking_id: bookingId,
              fld_comment: secComment,
              fld_notif_for: secAdmin.fld_admin_type,
              fld_notif_for_id: consultantId, // still notifying primary consultant?
              fld_addedon: moment().format("YYYY-MM-DD"),
            };

            bookingModel.insertBookingHistory(secHistory, (err) => {
              if (err) {
                return res.json({
                  status: true,
                  message:
                    "Call scheduled, but failed to log secondary consultant history.",
                });
              }

              return res.json({
                status: true,
                message: "Call scheduled successfully.",
              });
            });
          });
        } else {
          return res.json({
            status: true,
            message: "Call scheduled successfully.",
          });
        }
      });
    });
  });
};

const fetchBookingById = (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res
        .status(400)
        .json({ status: false, message: "Booking ID required" });
    }

    bookingModel.getBookingById(bookingId, (err, result) => {
      if (err) {
        console.error("DB Error:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ status: false, message: "Booking not found" });
      }

      res.status(200).json({ status: true, data: result[0] });
    });
  } catch (error) {
    console.error("Catch Error:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const deleteBookingById = (req, res) => {
  const { bookingId } = req.body;

  if (!bookingId) {
    return res.json({ status: false, message: "Booking ID is required" });
  }

  bookingModel.deleteBookingById(bookingId, (err, result) => {
    if (err) {
      console.error("Delete booking error:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }

    if (result.affectedRows > 0) {
      return res.json({
        status: true,
        message: "Booking deleted successfully",
      });
    } else {
      return res.json({
        status: false,
        message: "Booking not found or already deleted",
      });
    }
  });
};

const setAsConverted = (req, res) => {
  const { bookingId, rcCode, projectId, user } = req.body;

  if (!bookingId || !rcCode || !projectId) {
    return res.json({ status: false, message: "Missing required data." });
  }

  const bookingData = {
    fld_converted_sts: "Yes",
  };

  // Step 1: Update Booking
  bookingModel.updateBooking(bookingId, bookingData, (err) => {
    if (err)
      return res.json({ status: false, message: "Failed to update booking." });

    // Step 2: Get Admin Info
    helperModel.getAdminById(user.id, (err, admin) => {
      if (err || !admin)
        return res.json({ status: false, message: "Admin not found." });

      const currentDate = moment().format("DD MMM YYYY");
      const currentTime = moment().format("hh:mm a");

      const comment = `Call status set as converted by ${admin.fld_name} on ${currentDate} at ${currentTime}. RC Code - ${rcCode}, Project Id - ${projectId}`;

      // Step 3: Insert Booking Overall History
      const historyData = {
        fld_booking_id: bookingId,
        fld_comment: comment,
        fld_addedon: moment().format("YYYY-MM-DD"),
      };

      bookingModel.insertBookingHistory(historyData, (err) => {
        if (err)
          return res.json({
            status: false,
            message: "Failed to insert history log.",
          });

        // Step 4: Insert Booking Status History
        const statusHistoryData = {
          fld_booking_id: bookingId,
          status: "Converted",
          fld_comment: comment,
        };

        bookingModel.insertBookingStatusHistory(statusHistoryData, (err) => {
          if (err)
            return res.json({
              status: false,
              message: "Failed to insert status history.",
            });

          return res.json({
            status: true,
            message: "Marked as converted successfully.",
          });
        });
      });
    });
  });
};

const updateStatusByCrm = (req, res) => {
  const { bookingid, statusByCrm } = req.body;

  if (!bookingid || !statusByCrm) {
    return res
      .status(400)
      .json({ status: false, message: "Invalid request data" });
  }

  bookingModel.getBookingRowById(bookingid, (err, bookingInfo) => {
    if (err)
      return res.status(500).json({ status: false, message: "Database error" });
    if (!bookingInfo)
      return res
        .status(404)
        .json({ status: false, message: "Booking not found" });

    let dataToUpdate = { statusByCrm };

    if (statusByCrm === "Postponed") {
      dataToUpdate = {
        fld_call_request_sts: "Postponed",
        fld_call_confirmation_status: "",
        fld_booking_date: null,
        fld_booking_slot: null,
        fld_consultation_sts: "Pending",
      };
    }

    bookingModel.updateBooking(bookingid, dataToUpdate, (err, updated) => {
      if (err)
        return res
          .status(500)
          .json({ status: false, message: "Error updating booking" });

      let strmsg = "";
      if (statusByCrm === "Completed") strmsg = "Marked As Completed";
      else if (statusByCrm === "Not Join")
        strmsg = "Marked As Client Did Not Join";
      else if (statusByCrm === "Postponed") strmsg = "Postponed";

      const currentDate = moment().format("D MMM YYYY");
      const currentTime = moment().format("hh:mm a");
      const adminName = "Admin";
      const comment = `Call ${strmsg} by ${adminName} on ${currentDate} at ${currentTime}`;

      bookingModel.getAllCrmIds((err, crmids) => {
        if (err)
          return res
            .status(500)
            .json({ status: false, message: "Error getting CRM users" });

        const historyData = {
          fld_booking_id: bookingid,
          fld_comment: comment,
          fld_notif_for: "EXECUTIVE",
          crmIdsNotifi: crmids,
          fld_addedon: moment().format("YYYY-MM-DD"),
        };

        bookingModel.insertBookingHistory(historyData, (err, historyId) => {
          if (err)
            return res.status(500).json({
              status: false,
              message: "Error inserting booking history",
            });

          return res.json({
            status: true,
            message: "Status updated successfully",
          });
        });
      });
    });
  });
};

const getBookingData = (req, res) => {
  const { bookingId, consultantId, bookingDate, bookingSlot } = req.query;

  try {
    bookingModel.getBookingData(
      { consultantId, bookingDate, bookingSlot },
      (err, data) => {
        if (err) {
          console.error("Error in getBookingData:", err);
          return res
            .status(500)
            .json({ status: false, message: "Server error" });
        }

        res.json({ status: true, data });
      }
    );
  } catch (error) {
    console.error("Exception in getBookingData:", error);
    res.status(500).json({ status: false, message: "Unexpected error" });
  }
};

const getBookingDataNew = (req, res) => {
  const { bookingId } = req.query;

  try {
    if (!bookingId) {
      return res
        .status(400)
        .json({ status: false, message: "bookingId is required" });
    }

    // Step 1: Get the main booking by ID
    bookingModel.getBookingRowById(bookingId, (err, mainBooking) => {
      if (err) {
        console.error("Error in getBookingById:", err);
        return res.status(500).json({ status: false, message: "Server error" });
      }

      if (!mainBooking) {
        return res
          .status(404)
          .json({ status: false, message: "Booking not found" });
      }

      const { fld_consultantid, fld_booking_date, fld_booking_slot } =
        mainBooking;

      // Step 2: Fetch other bookings for same consultant/date/slot excluding current booking
      bookingModel.getOtherBookingData(
        {
          bookingId,
          consultantId: fld_consultantid,
          bookingDate: fld_booking_date,
          bookingSlot: fld_booking_slot,
        },
        (err, otherBookings) => {
          if (err) {
            console.error("Error in getOtherBookingData:", err);
            return res
              .status(500)
              .json({ status: false, message: "Server error" });
          }

          return res.json({
            status: true,
            mainBooking,
            otherBookings,
          });
        }
      );
    });
  } catch (error) {
    console.error("Exception in getBookingDataNew:", error);
    res.status(500).json({ status: false, message: "Unexpected error" });
  }
};

const markAsConfirmByClient = (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) {
    return res
      .status(400)
      .json({ status: false, message: "Missing bookingId" });
  }

  bookingModel.getBookingRowById(bookingId, (err, booking) => {
    if (err || !booking) {
      return res.status(500).json({
        status: false,
        message: "Booking not found or error occurred",
      });
    }

    const updateData = {
      fld_call_confirmation_status: "Call Confirmed by Client",
      fld_otp: "",
      fld_verify_otp_url: null,
      fld_consultation_sts: "Accept",
      fld_call_request_sts: "Accept",
      fld_status_options:
        "I have gone through all the details,I have received the meeting link",
    };

    bookingModel.updateBooking(bookingId, updateData, (updateErr) => {
      if (updateErr) {
        return res
          .status(500)
          .json({ status: false, message: "Failed to update booking" });
      }

      const comment = `Call Mark as Confirmed by Client done by subadmin on ${moment().format(
        "DD-MM-YYYY"
      )} at ${moment().format("hh:mm A")}`;
      const historyData = {
        fld_booking_id: bookingId,
        fld_comment: comment,
        fld_notif_for: "EXECUTIVE",
        fld_notif_for_id: booking.fld_addedby,
        fld_addedon: new Date(),
      };

      bookingModel.insertBookingHistory(historyData, (historyErr) => {
        if (historyErr) {
          return res
            .status(500)
            .json({ status: false, message: "Failed to insert history" });
        }

        // Update RC call request if both IDs are present
        if (booking.fld_call_request_id && booking.fld_rc_call_request_id) {
          bookingModel.updateRcCallRequestSts(
            booking.fld_call_request_id,
            booking.fld_rc_call_request_id,
            "Accept",
            (rcErr) => {
              if (rcErr) {
                return res.status(500).json({
                  status: false,
                  message: "Failed to update RC call request",
                });
              }
              sendConfirmationEmail(booking, res);
            }
          );
        } else {
          sendConfirmationEmail(booking, res);
        }
      });
    });
  });
};

function sendConfirmationEmail(booking, res) {
  helperModel.getAdminById(booking.fld_addedby, (err, crm) => {
    if (err || !crm) {
      return res.status(200).json({
        status: true,
        message: "Call confirmed, CRM not found for email",
        reschedulePending: true,
      });
    }

    const subject = `Call confirmed by client ${booking.fld_name} - Booking Id ${booking.fld_bookingcode} || ${process.env.WEBNAME}`;
    const body = `Hi ${crm.fld_name}, <br/><br/>The client ${booking.fld_name} with booking id ${booking.fld_bookingcode} has confirmed the call and will be available.<br/><br/>Thanks & regards,<br/>${process.env.WEBNAME}<br/>`;

    const from = process.env.MAIL_FROM || "donotreply@rapidcollaborate.com";
    const to = "web@thesisindia.net";
    const bcc = "";
    sendPostmarkMail({ from, to, subject, body, bcc }, (err) => {
      if (err) {
        return res
          .status(500)
          .json({ status: false, message: "Email sending failed" });
      }

      return res.status(200).json({
        status: true,
        message: "Call confirmed successfully",
        reschedulePending: true,
      });
    });
  });
}

const rescheduleOtherBookings = (req, res) => {
  const { bookingId } = req.body;

  if (!bookingId) {
    return res
      .status(400)
      .json({ status: false, message: "Missing bookingId" });
  }

  bookingModel.getBookingRowById(bookingId, (err, booking) => {
    if (err || !booking) {
      return res.status(500).json({
        status: false,
        message: "Booking not found or error occurred",
      });
    }

    // Fetch all bookings for same consultant/date/slot
    bookingModel.getOtherBookingData(
      {
        bookingId,
        consultantId: booking.fld_consultantid,
        bookingDate: booking.fld_booking_date,
        bookingSlot: booking.fld_booking_slot,
      },
      (err, allBookings) => {
        if (err) {
          return res
            .status(500)
            .json({ status: false, message: "Failed to fetch bookings" });
        }

        const otherBookings = allBookings.filter(
          (row) =>
            row.id != bookingId &&
            row.fld_call_confirmation_status !== "Call Confirmed by Client"
        );
        console.log("Other Bookings" + otherBookings);

        if (otherBookings.length === 0) {
          return res.status(200).json({
            status: true,
            message: "No other bookings to reschedule",
          });
        }

        let remaining = otherBookings.length;
        const currentDate = moment().format("DD-MM-YYYY");
        const currentTime = moment().format("hh:mm A");

        otherBookings.forEach((row) => {
          const updateData = {
            fld_call_confirmation_status: "",
            fld_booking_date: null,
            fld_booking_slot: null,
            fld_call_request_sts: "Rescheduled",
            fld_consultation_sts: "Rescheduled",
            fld_verify_otp_url: null,
            fld_otp: "",
          };

          bookingModel.updateBooking(row.id, updateData, (updateErr) => {
            if (updateErr) {
              return res.status(500).json({
                status: false,
                message: `Failed to update booking ID ${row.id}`,
              });
            }

            const comment = `Call cancelled and to be rescheduled as client did not confirm on ${currentDate} at ${currentTime}`;
            const historyData = {
              fld_booking_id: row.id,
              fld_comment: comment,
              fld_notif_for: "EXECUTIVE",
              fld_notif_for_id: row.fld_addedby,
              fld_addedon: new Date(),
            };

            bookingModel.insertBookingHistory(historyData, (historyErr) => {
              if (historyErr) {
                return res.status(500).json({
                  status: false,
                  message: `Failed to insert history for booking ID ${row.id}`,
                });
              }

              remaining--;
              if (remaining === 0) {
                return res.status(200).json({
                  status: true,
                  message: "Other bookings rescheduled successfully",
                });
              }
            });
          });
        });
      }
    );
  });
};

const reassignComment = (req, res) => {
  const bookingId = req.body.bookingid;
  const reassignComment = req.body.reassign_comment;
  const user = req.body.user;
  try {
    if (bookingId > 0 && reassignComment !== "") {
      const updateData = {
        fld_reassign_comment: reassignComment,
        fld_call_request_sts: "Reassign Request",
      };

      bookingModel.updateBooking(bookingId, updateData, (err) => {
        if (err) {
          return res.status(500).json({
            status: false,
            message: "Failed to submit call reassign comment!",
          });
        }

        const get_current_date = moment().format("DD MMM YYYY");
        const get_current_time = moment().format("hh:mm a");

        const comment = `Call reassign request to another consultant by ${user.fld_name} on ${get_current_date} at ${get_current_time}`;

        const historyData = {
          fld_booking_id: bookingId,
          fld_comment: comment,
          fld_notif_for: "SUPERADMIN",
          fld_notif_for_id: 1,
          fld_addedon: new Date(),
        };

        bookingModel.insertBookingHistory(historyData, (historyErr) => {
          if (historyErr) {
            return res.status(500).json({
              status: false,
              message: "Failed to insert reassign comment history!",
            });
          }

          bookingModel.getBookingRowById(bookingId, (err, booking) => {
            if (
              booking &&
              booking.fld_consultantid &&
              booking.fld_call_request_id &&
              booking.fld_rc_call_request_id
            ) {
              bookingModel.updateRcCallRequestSts(
                booking.fld_call_request_id,
                booking.fld_rc_call_request_id,
                "Reassign Request",
                (rcErr) => {
                  if (rcErr) {
                    return res.status(500).json({
                      status: false,
                      message: "Failed to update RC Call Request status",
                    });
                  }

                  return res.status(200).json({
                    status: true,
                    message: "Call reassign comment submitted successfully",
                  });
                }
              );
            } else {
              return res.status(200).json({
                status: true,
                message: "Call reassign comment submitted successfully",
              });
            }
          });
        });
      });
    } else {
      return res.status(400).json({
        status: false,
        message: "Missing bookingId or reassign comment",
      });
    }
  } catch (error) {
    console.error("Exception in Reassign Comment:", error);
    res.status(500).json({ status: false, message: "Unexpected error" });
  }
};

const getExternalCallByBookingId = (req, res) => {
  const bookingId = parseInt(req.query.bookingId);
  const id = req.query.id ? parseInt(req.query.id) : 0;

  if (!bookingId) {
    return res.status(400).json({
      status: false,
      message: "Booking ID is required",
    });
  }

  bookingModel.getExternalCallInfo(id, bookingId, (err, data) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({
        status: false,
        message: "Database error",
      });
    }

    return res.json({
      status: true,
      data: data,
    });
  });
};

const reassignToConsultant = (req, res) => {
  const { bookingId, primary_consultant_id, user } = req.body;

  if (!bookingId) {
    return res
      .status(400)
      .json({ status: false, message: "Missing bookingId" });
  }

  if (!primary_consultant_id) {
    return res
      .status(400)
      .json({ status: false, message: "Missing Consultant Id" });
  }

  bookingModel.getBookingRowById(bookingId, (err, booking) => {
    if (err || !booking) {
      return res.status(500).json({
        status: false,
        message: "Booking not found or error occurred",
      });
    }

    const updateData = {
      fld_consultantid: primary_consultant_id,
      fld_consultation_sts: "Pending",
      fld_call_request_sts: "Consultant Assigned",
      fld_booking_date: null,
      fld_booking_slot: null,
    };

    bookingModel.updateBooking(bookingId, updateData, (updateErr) => {
      if (updateErr) {
        return res
          .status(500)
          .json({ status: false, message: "Failed to update booking" });
      }

      bookingModel.getAdminById(
        primary_consultant_id,
        (adminErr, consultant) => {
          if (adminErr || !consultant) {
            return res.status(500).json({
              status: false,
              message: "Failed to fetch consultant details",
            });
          }

          const currentDate = moment().format("YYYY-MM-DD");
          const currentTime = moment().format("hh:mm A");

          const consultantName = consultant.fld_name || "unknown";
          const adminName = user?.fld_name || "Admin";

          const comment = `Call reassigned to consultant ${consultantName} by ${adminName} on ${currentDate} at ${currentTime}`;

          const historyData = {
            fld_booking_id: bookingId,
            fld_comment: comment,
            fld_notif_for: "CONSULTANT",
            fld_notif_for_id: 1,
            fld_addedon: moment().toDate(),
          };

          bookingModel.insertBookingHistory(historyData, (historyErr) => {
            if (historyErr) {
              return res
                .status(500)
                .json({ status: false, message: "Failed to insert history" });
            }

            // Handle RC update if IDs are present
            if (booking.fld_call_request_id && booking.fld_rc_call_request_id) {
              bookingModel.updateRcCallRequestSts(
                booking.fld_call_request_id,
                booking.fld_rc_call_request_id,
                "Consultant Assigned",
                (rcErr) => {
                  if (rcErr) {
                    return res.status(500).json({
                      status: false,
                      message: "Failed to update RC call request",
                    });
                  }

                  return res.status(200).json({
                    status: true,
                    message: "Booking reassigned and RC updated",
                  });
                }
              );
            } else {
              return res.status(200).json({
                status: true,
                message: "Booking reassigned successfully (No RC data)",
              });
            }
          });
        }
      );
    });
  });
};

const updateConsultationStatus = async (req, res) => {
  try {
    const {
      bookingid,
      comment,
      consultation_sts,
      status_options,
      status_options_rescheduled_others,
      rescheduled_date,
      rescheduled_time,
      scalequestion1,
      scalequestion2,
      scalequestion3,
      specific_commnets_for_the_call,
      old_video_file,
      user,
    } = req.body;

    const new_consultation_sts = consultation_sts;
    let uploadedFileName = null;

    if (!bookingid || !consultation_sts) {
      return res.status(400).json({
        status: false,
        message: "Missing required parameters",
      });
    }

    // Handle auto follower API call for completed consultations
    if (consultation_sts.toLowerCase() === "completed") {
      bookingModel.getBookingRowById(bookingid, (err, clientData) => {
        if (!err && clientData && clientData.fld_client_id) {
          const postData = {
            email: user.fld_email || "",
            ref_id: clientData.fld_client_id,
          };

          axios
            .post("https://apacvault.com/php/Webapi/autoFollower", postData, {
              headers: { "Content-Type": "application/json" },
            })
            .catch((error) => {
              console.error("Auto follower API error:", error);
            });
        }
      });
    }

    // Handle file upload
    if (req.file && req.file.filename) {
      try {
        uploadedFileName = req.file.filename;
        const fileName = req.file.originalname;
        const filePath = path.join(__dirname, "../uploads", uploadedFileName);

        const formData = new FormData();
        formData.append("upload_file", fs.createReadStream(filePath));
        formData.append("file_name", fileName);
        formData.append("type", "video");

        const uploadRes = await axios.post(
          "https://www.rapidcollaborate.com/call_calendar/test/upload_file.php",
          formData,
          {
            headers: formData.getHeaders(),
          }
        );

        console.log("File upload successful:", uploadRes.data);

        // You can store `uploadRes.data.filename` as public file path if needed
      } catch (uploadErr) {
        console.error("File upload failed:", uploadErr.message);
      }

      //delet old file
      if (old_video_file) {
        const oldFilePath = path.join("assets/upload_doc/", old_video_file);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    // Get booking details first
    bookingModel.getBookingRowById(bookingid, (err, booking) => {
      if (err || !booking) {
        return res.status(500).json({
          status: false,
          message: "Booking not found or error occurred",
        });
      }

      let finalConsultationStatus = consultation_sts;
      let statusOptionsStr = "";

      // Handle status options
      if (consultation_sts === "Accept" || consultation_sts === "Reject") {
        statusOptionsStr = Array.isArray(status_options)
          ? status_options.join(",")
          : status_options;
      } else if (consultation_sts === "Rescheduled") {
        statusOptionsStr = status_options;
      }

      // Handle rescheduled status
      if (consultation_sts === "Rescheduled") {
        finalConsultationStatus = "Rescheduled";

        // Clear verify_otp_url for rescheduled bookings
        bookingModel.updateBooking(
          bookingid,
          { fld_verify_otp_url: NULL },
          (err) => {
            if (err) {
              console.error("Error clearing verify_otp_url:", err);
            }
          }
        );
      }

      // Prepare main booking update data
      const updateData = {
        fld_consultation_sts: finalConsultationStatus,
        fld_comment: comment,
        fld_call_request_sts: finalConsultationStatus,
        fld_status_options: statusOptionsStr,
        fld_status_options_rescheduled_others:
          status_options_rescheduled_others,
      };

      if (consultation_sts === "Reject") {
        updateData.fld_verify_otp_url = null;
      }

      // Update main booking
      bookingModel.updateBooking(bookingid, updateData, (updateErr) => {
        if (updateErr) {
          return res.status(500).json({
            status: false,
            message: "Failed to update booking status",
          });
        }

        // Update external calls
        bookingModel.updateExternalCallsStatus(
          bookingid,
          {
            fld_consultation_sts: finalConsultationStatus,
            fld_call_request_sts: finalConsultationStatus,
          },
          (extErr) => {
            if (extErr) {
              console.error("Error updating external calls:", extErr);
            }
          }
        );

        // Update RC call request if applicable
        if (booking.fld_call_request_id && booking.fld_rc_call_request_id) {
          bookingModel.updateRcCallRequestSts(
            booking.fld_call_request_id,
            booking.fld_rc_call_request_id,
            finalConsultationStatus,
            (rcErr) => {
              if (rcErr) {
                console.error("Error updating RC call request:", rcErr);
              }
            }
          );
        }

        // Insert booking status history
        const historyData = {
          fld_booking_id: bookingid,
          status: finalConsultationStatus,
          fld_comment: comment,
          fld_question1: scalequestion1,
          fld_question2: scalequestion2,
          fld_question3: scalequestion3,
          fld_specific_commnets_for_the_call: specific_commnets_for_the_call,
          fld_status_options: statusOptionsStr,
          fld_status_options_rescheduled_others:
            status_options_rescheduled_others,
          fld_call_completed_date: moment().format("YYYY-MM-DD"),
        };

        if (uploadedFileName) {
          historyData.fld_booking_call_file = uploadedFileName;
        }

        bookingModel.insertBookingStatusHistory(historyData, (historyErr) => {
          if (historyErr) {
            console.error(
              "Error inserting booking status history:",
              historyErr
            );
          }
        });

        // Get current date and time
        const currentDate = moment().format("DD MMM YYYY");
        const currentTime = moment().format("hh:mm A");

        // Get consultant name
        bookingModel.getAdminById(
          booking.fld_consultantid,
          (adminErr, consultant) => {
            if (adminErr || !consultant) {
              console.error("Error fetching consultant details:", adminErr);
              return;
            }

            const consultantName = consultant.fld_name;
            let consultationStatusText = finalConsultationStatus;

            if (finalConsultationStatus === "Accept") {
              consultationStatusText = "Accepted";
            } else if (finalConsultationStatus === "Reject") {
              consultationStatusText = "Rejected";
            }

            // Handle different consultant types (primary, secondary, third)
            const processConsultantHistory = (
              consultantId,
              isExternal = false
            ) => {
              if (!consultantId || consultantId === 0) return;

              bookingModel.getAdminById(consultantId, (err, consultantData) => {
                if (err || !consultantData) return;

                let comments;
                if (isExternal && booking.fld_rc_call_request_id > 0) {
                  comments = `External Call ${consultationStatusText} by ${
                    user.fld_name || "Admin"
                  } on ${currentDate} at ${currentTime}`;
                } else {
                  if (consultationStatusText === "Client did not join") {
                    comments = `Call status updated to ${consultationStatusText} by ${consultantData.fld_name} on ${currentDate} at ${currentTime}`;
                  } else {
                    comments = `Call ${consultationStatusText} by ${consultantData.fld_name} on ${currentDate} at ${currentTime}`;
                  }
                }

                const overallHistoryData = {
                  fld_booking_id: bookingid,
                  fld_comment: comments,
                  fld_rescheduled_date_time: "",
                  fld_addedon: moment().format("YYYY-MM-DD"),
                };

                bookingModel.insertBookingHistory(overallHistoryData, (err) => {
                  if (err) {
                    console.error("Error inserting overall history:", err);
                  }
                });
              });
            };

            // Process primary consultant history
            if (
              booking.fld_secondary_consultant_id === 0 &&
              booking.fld_consultantid
            ) {
              processConsultantHistory(
                booking.fld_consultantid,
                booking.fld_rc_call_request_id > 0
              );
            }

            // Process secondary consultant history
            if (booking.fld_secondary_consultant_id > 0) {
              processConsultantHistory(booking.fld_secondary_consultant_id);
            }

            // Process third consultant history
            if (booking.fld_third_consultantid > 0) {
              processConsultantHistory(booking.fld_third_consultantid);
            }

            // Send emails based on status
            handleEmailNotifications(
              booking,
              new_consultation_sts,
              currentDate,
              currentTime,
              req
            );
          }
        );

        return res.status(200).json({
          status: true,
          message: "Consultation status updated successfully",
        });
      });
    });
  } catch (error) {
    console.error("Error in updateConsultationStatus:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

const handleEmailNotifications = (
  booking,
  consultation_sts,
  currentDate,
  currentTime,
  req
) => {
  try {
    // Send email to CRM for specific statuses
    if (
      ["Accept", "Reject", "Rescheduled", "Cancelled"].includes(
        consultation_sts
      )
    ) {
      bookingModel.getAdminById(booking.fld_addedby, (err, crmInfo) => {
        if (err || !crmInfo) return;

        bookingModel.getAdminById(
          booking.fld_consultantid,
          (err, consultantInfo) => {
            if (err || !consultantInfo) return;

            const subject = `Call ${consultation_sts} by ${
              consultantInfo.fld_name
            } - ${process.env.WEBNAME || "Website"}`;
            let body;

            if (consultation_sts === "Rescheduled") {
              body = `Hi ${crmInfo.fld_name},<br/><br/>The consultant ${
                consultantInfo.fld_name
              } has rescheduled the call for Booking ID ${
                booking.fld_bookingcode
              }.<br/><br/>Thanks & Regards,<br/>Team - ${
                process.env.WEBNAME || "Website"
              }`;
            } else {
              body = `Hi ${crmInfo.fld_name},<br/><br/>Call Id ${
                booking.id
              } ${consultation_sts} by ${
                consultantInfo.fld_name
              } on ${currentDate} at ${currentTime}<br/><br/>Thanks & Regards,<br/>Team - ${
                process.env.WEBNAME || "Website"
              }`;
            }

            const from =
              process.env.MAIL_FROM || "donotreply@rapidcollaborate.com";

            sendPostmarkMail(
              {
                from: from,
                to: crmInfo.fld_email,
                subject: subject,
                body: body,
                bcc: "",
              },
              (emailErr) => {
                if (emailErr) {
                  console.error("Error sending CRM email:", emailErr);
                }
              }
            );
          }
        );
      });
    }

    // Handle client notifications for specific statuses
    if (["Accept", "Reject", "Rescheduled"].includes(consultation_sts)) {
      bookingModel.getFullBookingData(booking.id, (err, bookingInfo) => {
        if (err || !bookingInfo) return;

        if (consultation_sts === "Accept") {
          handleAcceptedBookingNotification(bookingInfo);
        } else if (["Reject", "Rescheduled"].includes(consultation_sts)) {
          handleRejectedOrRescheduledNotification(
            bookingInfo,
            consultation_sts
          );
        }
      });
    }
  } catch (error) {
    console.error("Error in handleEmailNotifications:", error);
  }
};

const handleAcceptedBookingNotification = (bookingInfo) => {
  try {
    // Generate OTP for client verification
    const verifyOtpUrl =
      Math.floor(Math.random() * (999999 - 111111 + 1)) + 111111;

    if (!bookingInfo.fld_verify_otp_url) {
      bookingModel.updateBooking(
        bookingInfo.id,
        {
          fld_call_confirmation_status:
            "Call Confirmation Pending at Client End",
          fld_verify_otp_url: verifyOtpUrl,
        },
        (err) => {
          if (err) {
            console.error("Error updating call confirmation status:", err);
          }
        }
      );
    }

    // Generate OTP page URL
    const otpPageUrl = `${process.env.BASE_URL}/otp/${bookingInfo.id}/${verifyOtpUrl}`;

    // Send email to client
    const subject = `Booking Information ${bookingInfo.fld_bookingcode} - ${
      process.env.WEBNAME || "Website"
    }`;
    const body = `Hi ${
      bookingInfo.user_name
    },<br/><br/>Your call is scheduled with one of the experts to discuss about your research work. Please click on the button below to view the booking details<br/><br/><a href="${otpPageUrl}" style="color: #fff;background-color: #fa713b;border-radius:5px;padding:10px 15px;" target="_blank">View Booking Details</a><br/><br/>Thanks & Regards,<br/>Team - ${
      process.env.WEBNAME || "Website"
    }`;

    const from = process.env.MAIL_FROM || "donotreply@rapidcollaborate.com";

    sendPostmarkMail(
      {
        from: from,
        to: bookingInfo.user_email,
        subject: subject,
        body: body,
      },
      (emailErr) => {
        if (emailErr) {
          console.error("Error sending client email:", emailErr);
        }
      }
    );
  } catch (error) {
    console.error("Error in handleAcceptedBookingNotification:", error);
  }
};

const handleRejectedOrRescheduledNotification = (bookingInfo, status) => {
  try {
    const callStatus = status === "Reject" ? "Rejected" : status;
    const bookingDate = moment(bookingInfo.fld_booking_date).format(
      "DD MMM YYYY"
    );

    const subject = `Status Updated - ${process.env.WEBNAME || "Website"}`;
    const body = `Hi ${
      bookingInfo.user_name
    },<br/><br/>This is to inform you that your call which was scheduled for ${bookingDate} ${
      bookingInfo.fld_booking_slot
    } with ${
      bookingInfo.admin_name
    } has been ${callStatus}.<br/><br/>Thanks & Regards,<br/>Team - ${
      process.env.WEBNAME || "Website"
    }`;

    const from = process.env.MAIL_FROM || "donotreply@rapidcollaborate.com";

    sendPostmarkMail(
      {
        from: from,
        to: bookingInfo.user_email,
        subject: subject,
        body: body,
      },
      (emailErr) => {
        if (emailErr) {
          console.error("Error sending status update email:", emailErr);
        }
      }
    );
  } catch (error) {
    console.error("Error in handleRejectedOrRescheduledNotification:", error);
  }
};

const getExternalCallCount = (req, res) => {
  const { bookingId } = req.query;

  if (!bookingId) {
    return res.status(400).json({ error: "Booking ID is required" });
  }

  try {
    bookingModel.getExternalCallCountByBookingId(bookingId, (err, count) => {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err });
      }

      return res.status(200).json({ bookingId, totalExternalCalls: count });
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Unexpected error", details: error.message });
  }
};

const getBookingStatusHistory = async (req, res) => {
  try {
    const { bookingId, status } = req.query;

    if (!bookingId || !status) {
      return res
        .status(400)
        .json({ status: false, message: "Missing booking ID or Status" });
    }

    bookingModel.getBookingStatusHistory(bookingId, status, (err, results) => {
      if (err) {
        console.error("Error fetching booking status history:", err);
        return res
          .status(500)
          .json({ status: false, message: "Database error" });
      }

      return res.status(200).json({ status: true, data: results });
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch status history", details: err });
  }
};

const getAllClientBookingData = (req, res) => {
  const { clientId } = req.query;

  try {
    if (!clientId) {
      return res
        .status(400)
        .json({ status: false, message: "clientId is required" });
    }

    // Call model to get booking data
    bookingModel.getAllClientBookings(clientId, (err, results) => {
      if (err) {
        console.error("Error in getAllClientBookings:", err);
        return res.status(500).json({ status: false, message: "Server error" });
      }

      if (!results || results.length === 0) {
        return res
          .status(404)
          .json({ status: false, message: "No bookings found" });
      }

      res.status(200).json({ status: true, data: results });
    });
  } catch (error) {
    console.error("Exception in getAllClientBookingData:", error);
    res.status(500).json({ status: false, message: "Unexpected error" });
  }
};

const assignExternalCall = (req, res) => {
  try {
    const { consultantName, bookingId } = req.body;

    if (!consultantName || !bookingId) {
      return res
        .status(400)
        .json({
          status: false,
          message: "Missing consultantName or bookingId",
        });
    }

    // Step 1: Fetch booking
    bookingModel.getBookingRowById(bookingId, (err, booking) => {
      if (err) {
        console.error("Booking fetch error:", err);
        return res
          .status(500)
          .json({ status: false, message: "DB error while fetching booking" });
      }
      if (!booking) {
        return res
          .status(404)
          .json({ status: false, message: "Booking not found" });
      }

      const consultantId = booking.fld_consultantid;
      const callAddedBy = booking.fld_addedby;

      // Step 2: Insert into tbl_external_calls
      const externalCallData = {
        fld_booking_id: bookingId,
        fld_call_added_by: callAddedBy,
        fld_consultation_sts: "Pending",
        fld_call_request_sts: "Pending",
        fld_added_on: new Date(),
      };

      bookingModel.insertExternalCall(externalCallData, (err, insertedId) => {
        if (err) {
          console.error("Insert external call failed:", err);
          return res
            .status(500)
            .json({ status: false, message: "Failed to insert external call" });
        }

        // Step 3: Get admin info (main consultant)
        bookingModel.getAdminById(consultantId, (err, admin) => {
          if (err || !admin) {
            console.error("Admin fetch error:", err);
            return res
              .status(500)
              .json({ status: false, message: "Consultant info fetch failed" });
          }

          const now = moment();
          const formattedDate = now.format("DD-MMM-YYYY"); // e.g., "29-Jul-2025"
          const formattedTime = now.format("hh:mm A");

          const comment = `Call External assigned to consultant ${consultantName} by ${admin.fld_name} on ${formattedDate} at ${formattedTime}`;

          // Step 4: Insert into history
          const historyData = {
            fld_booking_id: bookingId,
            fld_comment: comment,
            fld_notif_for: admin.fld_admin_type,
            fld_notif_for_id: process.env.DEFAULT_EXTERNAL_ASSIGN_ID || 0,
            fld_addedon: new Date(),
          };

          bookingModel.insertBookingHistory(historyData, (err, historyId) => {
            if (err) {
              console.error("History insert failed:", err);
              return res
                .status(500)
                .json({ status: false, message: "Failed to log history" });
            }

            // Step 5: Update booking status
            bookingModel.updateBooking(
              bookingId,
              { fld_call_external_assign: "Yes" },
              (err, updated) => {
                if (err || !updated) {
                  console.error("Update booking failed:", err);
                  return res
                    .status(500)
                    .json({
                      status: false,
                      message: "Failed to update booking status",
                    });
                }

                return res.json({
                  status: true,
                  message: "External consultant assigned successfully",
                });
              }
            );
          });
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ status: false, message: "Internal error" });
  }
};

const checkCompletedCall = (req, res) => {
  const { primaryConsultantId, clientEmail, saleType, user } = req.body;

  if (saleType !== "Presales") return res.send("call not completed");

  bookingModel.getLatestCompletedBooking(primaryConsultantId, clientEmail, (err, bookings) => {
    if (err || !bookings || bookings.length === 0) return res.send("call not completed");

    const booking = bookings[0];
    const bookingId = booking.id;
    const clientName = booking.fld_name;
    const teamId = booking.fld_teamid;
    const bookingConsultantId = booking.fld_consultantid;

    // Get current logged-in CRM team ID
    bookingModel.getAdminById(user.fld_consultantid, (err, consultantData) => {
      if (err || !consultantData) return res.status(500).send("consultant fetch error");

      const currentCrmTeamId = user.fld_team_id;
      const consultantName = consultantData.fld_name;

      if (teamId !== currentCrmTeamId) {
        // Team doesn't match, check if call completed
        bookingModel.getLatestCompletedBookingStatusHistory(bookingId, "Completed", (err, statusHist) => {
          const completedDate = statusHist?.[0]?.fld_call_completed_date;

          if (completedDate) {
            const msg = `Call completed with client ${clientName} by consultant ${consultantName} on date ${moment(completedDate).format("D MMM YYYY")}`;
            return res.send(`${msg}||${bookingConsultantId}||${primaryConsultantId}`);
          }

          // Fallback: Check overall history
          bookingModel.getLatestCompletedBookingHistory(bookingId, (err, overallHist) => {
            const historyRow = overallHist?.[0];
            const fallbackDate = historyRow?.fld_addedon;

            if (fallbackDate) {
              const msg = `Call completed with client ${clientName} by consultant ${consultantName} on date ${moment(fallbackDate).format("D MMM YYYY")}`;
              return res.send(`${msg}||${historyRow.fld_consultantid}||${primaryConsultantId}`);
            } else {
              return res.send("call not completed");
            }
          });
        });
      } else {
        // Same team, allow call addition
        return res.send("add call");
      }
    });
  });
};

const updateReassignCallStatus = (req, res) => {
  const { bookingid, consultant_id, bookingslot, bookingdate,user } = req.body;

  if (!bookingid || !consultant_id) {
    return res.json({ status: false, message: "Missing booking ID or consultant ID." });
  }

  const inputTime = moment(bookingslot, "h:mm A");
  const timeSlotVariants = [
    inputTime.format("h:mm A"),
    inputTime.clone().subtract(30, "minutes").format("h:mm A"),
    inputTime.clone().add(30, "minutes").format("h:mm A")
  ];

  bookingModel.checkConflictingBookings(
    consultant_id,
    bookingdate,
    bookingslot,
    timeSlotVariants,
    (err, conflicts) => {
      if (err) {
        return res.json({ status: false, message: "Error checking for conflicting bookings." });
      }

      if (Array.isArray(conflicts) && conflicts.length > 0) {
        return res.json({ status: false, message: "Consultant already has a call around this time." });
      }

      const updateData = {
        fld_consultantid: consultant_id,
        fld_consultant_another_option: ''
      };

      bookingModel.updateBooking(bookingid, updateData, (err, success) => {
        if (err || !success) {
          return res.json({ status: false, message: "Failed to update booking." });
        }

        bookingModel.getBookingRowById(bookingid, (err, bookingInfo) => {
          if (err || !bookingInfo) {
            return res.json({ status: false, message: "Failed to fetch booking details." });
          }

          bookingModel.getAdminById(consultant_id, (err, adminInfo) => {
            if (err || !adminInfo) {
              return res.json({ status: false, message: "Failed to fetch consultant info." });
            }

            const consultantName = adminInfo.fld_name || "Consultant";
            const adminType = adminInfo.fld_admin_type || "CONSULTANT";
            const currentDate = moment().format("D MMM YYYY");
            const currentTime = moment().format("h:mm A");
            const reassignedBy = req.user?.fld_name || "Adminn";

            const comment = `Call Reassigned by consultant ${reassignedBy} to consultant ${consultantName} on ${currentDate} at ${currentTime}`;

            const historyData1 = {
              fld_booking_id: bookingid,
              fld_comment: comment,
              fld_notif_for: adminType,
              fld_notif_for_id: consultant_id,
              fld_addedon: moment().format("YYYY-MM-DD")
            };

            bookingModel.insertBookingHistory(historyData1, (err, _) => {
              if (err) return res.json({ status: false, message: "Failed to log reassignment history (consultant)." });

              const historyData2 = {
                fld_booking_id: bookingid,
                fld_comment: comment,
                fld_notif_for: "EXECUTIVE",
                fld_notif_for_id: bookingInfo.fld_addedby,
                view_sts: "HIDE",
                fld_addedon: moment().format("YYYY-MM-DD")
              };

              bookingModel.insertBookingHistory(historyData2, (err, _) => {
                if (err) return res.json({ status: false, message: "Failed to log reassignment history (executive)." });

                return res.json({ status: true, message: "Call reassigned successfully." });
              });
            });
          });
        });
      });
    }
  );
};



module.exports = {
  fetchBookings,
  getBookingHistory,
  getPresaleClientDetails,
  getPostsaleClientDetails,
  getProjectMilestones,
  checkCallrecording,
  checkConsultantWebsiteCondition,
  checkConsultantTeamCondition,
  checkPresalesCall,
  insertCallRequest,
  checkPostsaleCompletedCalls,
  saveCallScheduling,
  fetchBookingById,
  deleteBookingById,
  setAsConverted,
  updateStatusByCrm,
  getBookingData,
  markAsConfirmByClient,
  reassignComment,
  getExternalCallByBookingId,
  rescheduleOtherBookings,
  getBookingDataNew,
  reassignToConsultant,
  updateConsultationStatus,
  getExternalCallCount,
  getBookingStatusHistory,
  getAllClientBookingData,
  assignExternalCall,
  checkCompletedCall,
  updateReassignCallStatus,
};
