// controllers/followerController.js
const followerModel = require("../models/followerModel");
const db = require("../config/db");
const moment =require('moment');

const getAllActiveFollowers = (req, res) => {
  followerModel.getAllActiveFollowers((err, Followers) => {
    if (err) {
      console.error("Error fetching Followers:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }

    return res.json({
      status: true,
      message: "Success",
      data: Followers.length > 0 ? Followers : [],
    });
  });
};

const getAllFollowers = (req, res) => {
  followerModel.getAllFollowers((err, Followers) => {
    if (err) {
      console.error("Error fetching Followers:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }

    return res.json({
      status: true,
      message: "Success",
      data: Followers.length > 0 ? Followers : [],
    });
  });
};

const followerclaimbooking = (req, res) => {
    const followerId = req.params.followerId;
    const bookingId = req.params.bookingId;
    const {userId, userName} = req.body;
    
    if (!followerId && !bookingId && !userId && !userName) {
        return res.status(400).json({ status: false, message: 'All fields are required' });
    }

    followerModel.getbooking(bookingId, (err, existingbooking) => {
        //console.log(userName);
        
        if (err) {
            return res.status(500).json({ status: false, message: 'Error checking Subject area: ' + err });
        }

        if (existingbooking) {
            let bookingTime = new Date(`${existingbooking.fld_booking_date} ${existingbooking.fld_booking_slot}`); // use ISO format
            let currentTime = new Date();

            if (currentTime<bookingTime)
            {
              const now = moment();
              const formattedDate = now.format("DD-MMM-YYYY"); // e.g., "29-Jul-2025"
              const formattedTime = now.format("hh:mm A");
              const comment = `The call has been successfully claimed by  ${userName} on ${formattedDate} at ${formattedTime}`;

              const historyData = {
                fld_booking_id: bookingId,
                fld_comment: comment,
                fld_notif_view_sts:'READ',
                fld_addedon: new Date(),
              };  

              followerModel.insertBookingHistory(historyData, (err, historyId) => {
              if (err) {
                console.error("History insert failed:", err);
                return res
                  .status(500)
                  .json({ status: false, message: "Failed to log history" });
              }
  
              
              followerModel.followerclaimbooking(followerId,bookingId,userId, (err, result) => {
                  if (err) {
                      return res.status(500).json({ status: false, message: 'Failed to add Subject area: ' + err });
                  }
                  return res.json({ status: true, message: 'Booking claimed successfully', insertId: result.insertId });
              });
            });
                
            }
            else
            {
              return res.status(409).json({ status: false, message: 'Booking Not exists!' });
            }
        }
    

        
    });
};

module.exports = {
  getAllActiveFollowers,
  getAllFollowers,
  followerclaimbooking
};
