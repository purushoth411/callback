const bookingModel = require("../models/bookingModel");
const crypto = require("crypto");
const logger = require("../logger");

const fetchBookings = (req, res) => {
  const userId = req.user?.id || req.body.userId; // Assuming JWT middleware or fallback
  const userType = req.user?.type || req.body.userType;
  const assigned_team = req.user?.assigned_team || req.body.assigned_team;
  const filters = req.body.filters || {};

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
                      logger.info(`Rc Call request Update `);
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
  return d.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
}

function getFormattedTime() {
  const d = new Date();
  return d.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });
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
};
