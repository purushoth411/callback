const apiModel = require("../models/apiModel");

const getCallDriveLink = (req, res) => {
  const email = req.query.email;
  if (!email) return res.json({ status: false, error: "Email is missing" });

  apiModel.getCallDriveLink(email, (err, result) => {
    if (err) return res.status(500).json({ status: false, error: err.message });
    res.json(result);
  });
};

const markAsAbsentAll = (req, res) => {
  apiModel.markAsAbsentAll((err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: result });
  });
};

const markAsPresent = (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ status: false, message: "Email is required" });

  apiModel.markAsPresent(email, (err, result) => {
    if (err) return res.status(500).json({ status: false, error: err.message });
    res.json(result);
  });
};

const markAsAbsent = (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ status: false, message: "Email is required" });

  apiModel.markAsAbsent(email, (err, result) => {
    if (err) return res.status(500).json({ status: false, error: err.message });
    res.json(result);
  });
};

const getPostSaleInfo = (req, res) => {
  const assignedId = req.query.assigned_id;
  if (!assignedId) return res.json({ status: false, error: "Milestone ID is missing" });

  apiModel.getPostSaleInfo(assignedId, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

const callHistory = (req, res) => {
  const { email } = req.body; // or req.query depending on how request is sent

  if (!email) {
    return res.json({ status: 'Invalid Request' });
  }

  try {
    apiModel.viewBooking(email, (err, bookingInfo) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ status: 'Error', message: 'Database error' });
      }

      if (bookingInfo && bookingInfo.length > 0) {
        res.json({ data: bookingInfo, status: 'Success' });
      } else {
        res.json({ status: 'No Records Found' });
      }
    });
  } catch (err) {
    console.error("Unexpected Error:", err);
    res.status(500).json({ status: 'Error', message: 'Unexpected error' });
  }
};

module.exports = {
  getCallDriveLink,
  markAsAbsentAll,
  markAsPresent,
  markAsAbsent,
  getPostSaleInfo,
  callHistory,
};
