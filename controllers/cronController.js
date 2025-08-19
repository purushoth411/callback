// controllers/additionalController.js
const cronModel = require("../models/cronModel");
const bookingModel = require("../models/bookingModel");
const db = require("../config/db");
const moment = require('moment-timezone');

const { getIO } = require("../socket");
const sendPostmarkMail = require("../sendPostmarkMail");

function getFormattedDate() {
  return moment().tz("Asia/Kolkata").format("DD-MMM-YYYY"); 
}
 function getFormattedTime() {
  return moment().tz("Asia/Kolkata").format("hh:mm A"); 
}
function getCurrentDate(format = "YYYY-MM-DD") {
  return moment().tz("Asia/Kolkata").format(format);
}

const consultantAbsentCallCancelled = (callback) => {
  try {
    cronModel.getAbsentConsultantsCallScheduledBookings((err, bookings) => {
      if (err) {
        console.error("Error fetching absent consultants:", err);
        return callback(err, null);
      }

      if (!bookings || bookings.length === 0) {
        return callback(null, { message: "No absent consultants with bookings" });
      }

      let processed = 0;
      let hasError = false;

      bookings.forEach((row) => {
        const bookingId = row.id;
        const today = getCurrentDate("YYYY-MM-DD");
        const comment = `Consultant Absent on ${getCurrentDate("D MMM YYYY")}`;

        // 1️⃣ Cancel the booking
        bookingModel.updateBooking(
          bookingId,
          { fld_consultation_sts: "Cancelled", fld_call_request_sts: "Cancelled" },
          (updateErr, success) => {
            if (updateErr || !success) {
              hasError = true;
              processed++;
              if (processed === bookings.length) {
                return callback(updateErr || new Error("Failed to update booking"), null);
              }
              return;
            }

            // 2️⃣ Update RC Call Request if exists
            if (row.fld_call_request_id > 0 && row.fld_rc_call_request_id > 0) {
              bookingModel.updateRcCallRequestSts(
                row.fld_call_request_id,
                row.fld_rc_call_request_id,
                "Cancelled",
                (rcErr) => {
                  if (rcErr) console.error("RC update error:", rcErr);
                }
              );
            }

            // 3️⃣ Insert Booking History
            bookingModel.insertBookingHistory(
              {
                fld_booking_id: bookingId,
                fld_comment: comment,
                fld_notif_for: "",
                fld_notif_for_id: "",
                fld_addedon: today,
              },
              (histErr) => {
                if (histErr) console.error("Booking history insert error:", histErr);
              }
            );

            // 4️⃣ Insert Status History
            bookingModel.insertBookingStatusHistory(
              {
                fld_booking_id: bookingId,
                fld_comment: comment,
                status: "Cancelled",
                fld_booking_call_file: "",
                fld_question1: "",
                fld_question2: "",
                fld_question3: "",
                fld_specific_commnets_for_the_call: "",
                fld_call_completed_date: "",
              },
              (stsErr) => {
                if (stsErr) console.error("Booking status history insert error:", stsErr);
              }
            );

            processed++;
            if (processed === bookings.length && !hasError) {
              return callback(null, {
                message: "Absent consultant bookings cancelled successfully",
              });
            }
          }
        );
      });
    });
  } catch (error) {
    console.error("Unexpected error in consultantAbsentCallCancelled:", error);
    return callback(error, null);
  }
};

const autoAcceptCall = async (req, res) => {
  try {
    // Get bookings that should be auto-accepted
    cronModel.getUpcomingBookings((err, bookings) => {
      if (err) {
        console.error('Error fetching upcoming bookings:', err);
        return res.status(500).json({
          status: false,
          message: 'Error fetching bookings'
        });
      }
console.log(bookings);
      if (!bookings || bookings.length === 0) {
        return res.status(200).json({
          status: true,
          message: 'No bookings found to auto-accept',
          count: 0
        });
      }

      let processedCount = 0;
      let errors = [];

      // Process each booking
      bookings.forEach((booking, index) => {
        const bookingId = booking.id;
        
        // Auto accept the booking
        processAutoAccept(bookingId, (processErr, result) => {
          processedCount++;
          
          if (processErr) {
            errors.push({ bookingId, error: processErr.message });
          }

          // If this is the last booking, send response
          if (processedCount === bookings.length) {
            return res.status(200).json({
              status: errors.length === 0 ? true : false,
              message: `Processed ${processedCount} bookings`,
              processed: processedCount,
              errors: errors
            });
          }
        });
      });
    });

  } catch (error) {
    console.error('Error in autoAcceptCall:', error);
    return res.status(500).json({
      status: false,
      message: 'Internal server error'
    });
  }
};

const processAutoAccept = (bookingId, callback) => {
  try {
    // Get booking details first
    bookingModel.getBookingRowById(bookingId, (err, booking) => {
      if (err || !booking) {
        return callback(new Error('Booking not found or error occurred'));
      }

      const consultation_sts = 'Accept';
      const comment = 'Auto-accepted call';
      const status_options = 'I have gone through all the details,I have received the meeting link';

      const updateData = {
        fld_consultation_sts: consultation_sts,
        fld_comment: comment,
        fld_call_request_sts: consultation_sts,
        fld_status_options: status_options,
        fld_status_options_rescheduled_others: ''
      };

      // Update main booking
      bookingModel.updateBooking(bookingId, updateData, (updateErr) => {
        if (updateErr) {
          return callback(new Error('Failed to update booking status'));
        }

        // Update external calls
        bookingModel.updateExternalCallsStatus(
          bookingId,
          {
            fld_consultation_sts: consultation_sts,
            fld_call_request_sts: consultation_sts,
          },
          (extErr) => {
            if (extErr) {
              console.error('Error updating external calls:', extErr);
            }
          }
        );

        // Update RC call request if applicable
        if (booking.fld_call_request_id && booking.fld_rc_call_request_id) {
          bookingModel.updateRcCallRequestSts(
            booking.fld_call_request_id,
            booking.fld_rc_call_request_id,
            consultation_sts,
            (rcErr) => {
              if (rcErr) {
                console.error('Error updating RC call request:', rcErr);
              }
            }
          );
        }

        // Insert booking status history
        const historyData = {
          fld_booking_id: bookingId,
          status: consultation_sts,
          fld_comment: comment,
          fld_question1: '',
          fld_question2: '',
          fld_question3: '',
          fld_specific_commnets_for_the_call: '',
          fld_status_options: status_options,
          fld_status_options_rescheduled_others: '',
          fld_call_completed_date: getCurrentDate('YYYY-MM-DD'),
        };

        bookingModel.insertBookingStatusHistory(historyData, (historyErr) => {
          if (historyErr) {
            console.error('Error inserting booking status history:', historyErr);
          }
        });

        // Get current date and time
        const currentDate = getCurrentDate('DD MMM YYYY');
        const currentTime = getCurrentDate('hh:mm A');

        // Get consultant name and insert overall history
        bookingModel.getAdminById(booking.fld_consultantid, (adminErr, consultant) => {
          if (adminErr || !consultant) {
            console.error('Error fetching consultant details:', adminErr);
            return callback(null, { status: 'success', bookingId });
          }

          const consultantName = consultant.fld_name;
          const comments = `Call Accepted by ${consultantName} on ${currentDate} at ${currentTime}`;

          // Insert overall history
          const overallHistoryData = {
            fld_booking_id: bookingId,
            fld_comment: comments,
            fld_rescheduled_date_time: '',
            fld_addedon:getCurrentDate('YYYY-MM-DD')
          };

          bookingModel.insertBookingHistory(overallHistoryData, (historyInsertErr) => {
            if (historyInsertErr) {
              console.error('Error inserting overall history:', historyInsertErr);
            }

            // Handle secondary consultant history if exists
            if (booking.fld_secondary_consultant_id > 0) {
              bookingModel.getAdminById(booking.fld_secondary_consultant_id, (secErr, secConsultant) => {
                if (!secErr && secConsultant) {
                  const secComments = `Call Accepted by ${secConsultant.fld_name} on ${currentDate} at ${currentTime}`;
                  const secHistoryData = {
                    fld_booking_id: bookingId,
                    fld_comment: secComments,
                    fld_rescheduled_date_time: '',
                    fld_addedon: getCurrentDate('YYYY-MM-DD')
                  };

                  bookingModel.insertBookingHistory(secHistoryData, (secHistoryErr) => {
                    if (secHistoryErr) {
                      console.error('Error inserting secondary consultant history:', secHistoryErr);
                    }
                  });
                }
              });
            }

            // Handle email notifications
            handleEmailNotifications(booking, consultation_sts, currentDate, currentTime, null);

            // Emit socket update
            emitBookingUpdate(bookingId);

            return callback(null, { status: 'success', bookingId });
          });
        });
      });
    });

  } catch (error) {
    console.error('Error in processAutoAccept:', error);
    return callback(error);
  }
};

const handleEmailNotifications = (booking, consultation_sts, currentDate, currentTime, req) => {
  try {
    // Send email to CRM for specific statuses
    if (['Accept', 'Reject', 'Rescheduled', 'Cancelled'].includes(consultation_sts)) {
      bookingModel.getAdminById(booking.fld_addedby, (err, crmInfo) => {
        if (err || !crmInfo) return;

        bookingModel.getAdminById(booking.fld_consultantid, (err, consultantInfo) => {
          if (err || !consultantInfo) return;

          const subject = `Call ${consultation_sts} by ${consultantInfo.fld_name} - ${process.env.WEBNAME || 'Website'}`;
          let body;

          if (consultation_sts === 'Rescheduled') {
            body = `Hi ${crmInfo.fld_name},<br/><br/>The consultant ${consultantInfo.fld_name} has rescheduled the call for Booking ID ${booking.fld_bookingcode}.<br/><br/>Thanks & Regards,<br/>Team - ${process.env.WEBNAME || 'Website'}`;
          } else {
            body = `Hi ${crmInfo.fld_name},<br/><br/>Call Id ${booking.fld_bookingcode} Auto ${consultation_sts}ed by ${consultantInfo.fld_name} on ${currentDate} at ${currentTime}<br/><br/>Thanks & Regards,<br/>Team - ${process.env.WEBNAME || 'Website'}`;
          }

          const from = process.env.MAIL_FROM || 'donotreply@rapidcollaborate.com';

          sendPostmarkMail({
            from: from,
            to: crmInfo.fld_email,
            subject: subject,
            body: body,
            bcc: ''
          }, (emailErr) => {
            if (emailErr) {
              console.error('Error sending CRM email:', emailErr);
            }
          });
        });
      });
    }

    // Handle client notifications for Accept status
    if (consultation_sts == 'Accept') {
      bookingModel.getFullBookingData(booking.id, (err, bookingInfo) => {
        if (err || !bookingInfo) {
            console.log("Booking Info for email:", err, bookingInfo);
            return;
        }

        handleAcceptedBookingNotification(bookingInfo);
      });
    }
  } catch (error) {
    console.error('Error in handleEmailNotifications:', error);
  }
};

const handleAcceptedBookingNotification = (bookingInfo) => {
  try {
   

    // Send to client if email exists
    if (bookingInfo.user_email) {
      const clientSubject = `Booking Information ${bookingInfo.fld_bookingcode} - ${process.env.WEBNAME || 'Website'}`;
      const otpLink = `${process.env.BASE_URL || 'http://localhost:3000'}/otp/${bookingInfo.id}`;
      
      const clientBody = `Hi ${bookingInfo.user_name},<br/><br/>
        Your call is scheduled with one of the experts to discuss about your research work. 
        Please click on the button below to view the booking details<br/><br/>
        <a href="${otpLink}" style='color: #fff;background-color: #fa713b;border-radius:5px;padding:10px 15px;' target='_blank'>View Booking Details</a><br/>
        <br/>Thanks & Regards,<br/>Team - ${process.env.WEBNAME || 'Website'}`;

      // sendPostmarkMail({
      //   from: process.env.MAIL_FROM || 'donotreply@rapidcollaborate.com',
      //   to: bookingInfo.user_email,
      //   subject: clientSubject,
      //   body: clientBody,
      //   bcc: ''
      // }, (clientEmailErr) => {
      //   if (clientEmailErr) {
      //     console.error('Error sending client email:', clientEmailErr);
      //   }
      // });
    }

  } catch (error) {
    console.error('Error in handleAcceptedBookingNotification:', error);
  }
};




function emitBookingUpdate(bookingId) {
  bookingModel.getBookingById(bookingId, (err, bookingRows) => {
    if (!err && bookingRows && bookingRows.length > 0) {
      const updatedBooking = bookingRows[0];
      const io = getIO();

      io.emit("bookingUpdated", updatedBooking);

      if (
        updatedBooking.fld_call_request_id &&
        updatedBooking.fld_rc_call_request_id
      ) {
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
module.exports = {
    consultantAbsentCallCancelled,  
    autoAcceptCall
}