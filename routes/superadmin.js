const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

// GET pending admin requests
router.get('/pendingAdmins', async (req, res) => {
  try {
    const promiseDb = db.promise();
    const [rows] = await promiseDb.execute(
      "SELECT full_name, email, admin_status FROM admins WHERE admin_status = 'pending'"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching pending admin requests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET active admins (updated to include 'phone')
router.get('/admins', async (req, res) => {
  try {
    const promiseDb = db.promise();
    // Include the 'phone' field from the admins table
    const [rows] = await promiseDb.execute(
      "SELECT * FROM admins WHERE admin_status = 'active' or admin_status ='inactive'"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching active admins:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Approve Admin: Update admin_status to 'active'
router.post('/approveAdmin', async (req, res) => {
  try {
    const email = req.query.email || req.body.email;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    const promiseDb = db.promise();
    const [adminRecords] = await promiseDb.execute(
      "SELECT * FROM admins WHERE email = ? AND admin_status = 'pending'",
      [email]
    );
    if (adminRecords.length === 0) {
      return res.status(404).json({ message: "Admin not found or not pending" });
    }
    const [result] = await promiseDb.execute(
      "UPDATE admins SET admin_status = 'active' WHERE email = ?",
      [email]
    );
    if (result.affectedRows === 0) {
      return res.status(500).json({ message: "Failed to update admin status" });
    }
    res.status(200).json({ message: "Admin approved successfully" });
  } catch (error) {
    console.error("Error approving admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Reject Admin: Delete the pending admin record
router.post('/rejectAdmin', async (req, res) => {
  try {
    const email = req.query.email || req.body.email;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    const promiseDb = db.promise();
    const [result] = await promiseDb.execute(
      "DELETE FROM admins WHERE email = ? AND admin_status = 'pending'",
      [email]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Admin not found or already processed" });
    }
    res.status(200).json({ message: "Admin rejected and deleted successfully" });
  } catch (error) {
    console.error("Error rejecting admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// New Endpoint: Update Admin Status (toggle active/inactive)
router.post('/updateStatus', async (req, res) => {
  try {
    const email = req.query.email || req.body.email;
    const status = req.query.status || req.body.status; // Expect 'active' or 'inactive'
    if (!email || !status) {
      return res.status(400).json({ message: "Email and status are required" });
    }
    const promiseDb = db.promise();
    const [result] = await promiseDb.execute(
      "UPDATE admins SET admin_status = ? WHERE email = ?",
      [status, email]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.status(200).json({ message: "Admin status updated successfully" });
  } catch (error) {
    console.error("Error updating admin status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// New Endpoint: Remove Admin
router.delete('/removeAdmin', async (req, res) => {
  try {
    const email = req.query.email || req.body.email;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    const promiseDb = db.promise();
    const [result] = await promiseDb.execute(
      "DELETE FROM admins WHERE email = ?",
      [email]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.status(200).json({ message: "Admin removed successfully" });
  } catch (error) {
    console.error("Error removing admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
module.exports = router;

// Optional: Reset Admin Password (if needed)
// router.post('/resetAdminPassword', async (req, res) => {
//   try {a
//     const email = req.query.email || req.body.email;
//     if (!email) {
//       return res.status(400).json({ message: "Email is required" });
//     }
//     const defaultPassword = "newDefaultPassword"; // Replace with your logic\n     const hashedPassword = await bcrypt.hash(defaultPassword, 12);\n     const promiseDb = db.promise();\n     const [result] = await promiseDb.execute(\n       \"UPDATE admins SET password = ? WHERE email = ?\",\n       [hashedPassword, email]\n     );\n     if(result.affectedRows === 0){\n       return res.status(404).json({ message: \"Admin not found\" });\n     }\n     res.status(200).json({ message: \"Password reset successfully\" });\n   } catch (error) {\n     console.error(\"Error resetting admin password:\", error);\n     res.status(500).json({ message: \"Internal server error\" });\n   }\n });\n\nmodule.exports = router;\n"}
