// controllers/helperController.js
const helperModel = require("../models/helperModel");
const domainModel = require("../models/domainModel");
const db = require("../config/db");
const moment =require('moment');
const { getIO } = require("../socket");




const addDomain = (req, res) => {
  const {
    domain,
    pref_1 = "",
    pref_2 = "",
    pref_3 = "",
    pref_4 = "",
    pref_5 = "",
    pref_6 = "",
  } = req.body;

  if (!domain) {
    return res.json({ status: false, message: "Domain name is required" });
  }

  const consultantsArray = [pref_1, pref_2, pref_3, pref_4, pref_5, pref_6].map(
    (c) => (c || "").trim()
  );
  const cosultantId = consultantsArray.join(",");

  const data = {
    domain,
    cosultantId,
    fld_addedon: moment().format("YYYY-MM-DD HH:mm:ss"),
    status: "Active",
  };

  try {
    domainModel.checkIfDomainExists(domain, (err, exists) => {
      if (err) {
        console.error("Domain check error:", err);
        return res.json({ status: false, message: "Database error" });
      }

      if (exists) {
        return res.json({ status: false, message: "Domain already exists!" });
      }

      domainModel.insertDomainPref(data, (err, insertId) => {
        if (err) {
          console.error("Insert error:", err);
          return res.json({ status: false, message: "Insert failed" });
        }

        // Now fetch the new domain and then emit
        domainModel.getDomainbyId(insertId, (err, newDomain) => {
          if (err) {
            console.error("Fetch error:", err);
            return res.json({ status: false, message: "Failed to fetch new domain" });
          }

          const io = getIO();
          io.emit("domainAdded", newDomain);

          return res.json({ status: true, message: "Domain added successfully" });
        });
      });
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.json({ status: false, message: "Server error" });
  }
};


const updateDomain = (req, res) => {
  const { id } = req.params;
  const {
    domain,
    pref_1 = "",
    pref_2 = "",
    pref_3 = "",
    pref_4 = "",
    pref_5 = "",
    pref_6 = "",
  } = req.body;

  if (!domain) {
    return res.json({ status: false, message: "Domain name is required" });
  }

  const consultantsArray = [pref_1, pref_2, pref_3, pref_4, pref_5, pref_6].map(
    (c) => (c || "").trim()
  );
  const cosultantId = consultantsArray.join(",");

  const data = {
    domain,
    cosultantId,
    fld_addedon: moment().format("YYYY-MM-DD HH:mm:ss"),
  };

  try {
    domainModel.checkIfDomainExistsForUpdate(domain, id, (err, exists) => {
      if (err) {
        console.error("Domain duplication check error:", err);
        return res.json({ status: false, message: "Database error" });
      }

      if (exists) {
        return res.json({ status: false, message: "Domain name already used by another record!" });
      }

      domainModel.updateDomainPref(id, data, (err, affectedRows) => {
        if (err) {
          console.error("Update error:", err);
          return res.json({ status: false, message: "Update failed" });
        }

        if (affectedRows > 0) {
          return res.json({ status: true, message: "Domain updated successfully" });
        } else {
          return res.json({ status: false, message: "No changes made or record not found" });
        }
      });
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.json({ status: false, message: "Server error" });
  }
};

const deleteDomain = (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.json({ status: false, message: "ID is required" });
  }

  domainModel.deleteDomainById(id, (err, result) => {
    if (err) {
      console.error("Delete error:", err);
      return res.json({ status: false, message: "Database error" });
    }

    if (result.affectedRows > 0) {
      res.json({ status: true, message: "Domain deleted successfully" });
    } else {
      res.json({ status: false, message: "Domain not found" });
    }
  });
};


const updateDomainStatus = (req, res) => {
  const domainId = req.params.id;
  const { status } = req.body;

  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    return res
      .status(400)
      .json({ status: false, message: "Invalid status value" });
  }

  domainModel.updateDomainStatus(domainId, status, (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }

    return res.json({
      status: true,
      message: "Domain status updated successfully",
    });
  });
};

module.exports = {
 addDomain,
 updateDomain,
 deleteDomain,
 updateDomainStatus,
};
