const express = require('express'); 
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../db');
require('dotenv').config();
const nodemailer = require('nodemailer');

const router = express.Router();

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
});
router.get('/admins', async (req, res) => {
    try {
      const promiseDb = db.promise();
      // Removed "department" from the query since it doesn't exist.
      const [rows] = await promiseDb.execute(
        "SELECT full_name, email, admin_status FROM admins WHERE admin_status = 'active'"
      );
      // Optionally, add a default department if needed by your frontend:
      const mappedRows = rows.map(admin => ({
        ...admin,
        department: 'N/A'
      }));
      res.json(mappedRows);
    } catch (error) {
      console.error("Error fetching active admins:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  
// Route to serve Admin Login Page
router.get('/admin-login', (req, res) => {
    res.sendFile('adminLogin.html', { root: './views' });
});

// Route to serve Forgot Password Page
router.get('/forgot-password', (req, res) => {
    res.sendFile('forgotPassword.html', { root: './views' });
});

// Route to serve Admin Register Page
router.get('/admin-register', (req, res) => {
    res.sendFile('adminRegister.html', { root: './views' });
});

// Route to serve Reset Password Page
router.get('/reset-password', (req, res) => {
    res.sendFile('resetPassword.html', { root: './views' });
});

// User Registration Route
router.post('/register', (req, res) => {
    const { full_name, email, password, confirmPassword, admissionNumber, branch, semester, phone } = req.body;

    // Password Mismatch Check
    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Password mismatch' });
    }

    // Check for Existing Email or Admission Number
    db.query('SELECT email, admission_number FROM users WHERE email = ? OR admission_number = ?', 
    [email, admissionNumber], (err, results) => {
        if (err) {
            console.error('Database error during user registration:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        // Check if Email or Admission Number Already Exists
        if (results.length > 0) {
            const existingUser = results[0];
            if (existingUser.email === email && existingUser.admission_number === admissionNumber) {
                return res.status(400).json({ message: 'Both Email and Admission Number already exist' });
            }
            if (existingUser.email === email) {
                return res.status(400).json({ message: 'Email already exists' });
            }
            if (existingUser.admission_number === admissionNumber) {
                return res.status(400).json({ message: 'Admission number already exists' });
            }
        }

        // Hash Password and Insert New User
        bcrypt.hash(password, 12, (err, hashedPassword) => {
            if (err) {
                console.error('Error hashing password:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }

            db.query('INSERT INTO users (full_name, email, password, admission_number, branch, semester, phone) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [full_name, email, hashedPassword, admissionNumber, branch, semester, phone], (err) => {
                if (err) {
                    console.error('Database error during user insertion:', err);
                    return res.status(500).json({ message: 'Internal server error' });
                }
                res.status(201).json({ message: 'Registration successful' });
            });
        });
    });
});

// Admin Registration Route
router.post('/admin-register', (req, res) => {
    const { full_name, email, specific_password, new_password, confirm_password } = req.body;

    // Check if Admin Code is Correct
    if (specific_password !== 'cetkr@2025') {
        return res.status(400).json({ message: 'Invalid Admin code' });
    }

    // Password Mismatch Check
    if (new_password !== confirm_password) {
        return res.status(400).json({ message: 'Password mismatch' });
    }

    // Check if Admin Email Already Exists
    db.query('SELECT * FROM admins WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Hash Password and Insert New Admin
        bcrypt.hash(new_password, 12, (err, hashedPassword) => {
            if (err) {
                console.error('Error hashing password:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }

            db.query('INSERT INTO admins (full_name, email, password,admin_status) VALUES (?, ?, ?,?)', 
            [full_name, email, hashedPassword,'pending'], (err) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ message: 'Internal server error' });
                }
                res.status(201).json({ message: 'Registration successful' });
            });
        });
    });
});




// Admin Login Route with Superadmin Check
router.post('/admin-login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const promiseDb = db.promise();
  
      // Retrieve admin record by email
      const [results] = await promiseDb.execute("SELECT * FROM admins WHERE email = ?", [email]);
      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
  
      const admin = results[0];
  
      // Verify password
      const isPasswordValid = bcrypt.compareSync(password, admin.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
  
      // Check if admin_status is 'pending'
      if (admin.admin_status === 'pending') {
        return res.status(400).json({ message: 'Your account is pending approval by the superadmin. Please wait until approval.' });
      }
       // Check if admin_status is 'inactive'
       if (admin.admin_status === 'inactive') {
        return res.status(400).json({ message: 'Your account is pending approval by the superadmin. Please wait until approval.' });
      }
  
      // Redirect based on admin email (superadmin check)
      if (admin.email === 'admin@gmail.com') {
        return res.status(200).json({ message: 'Superadmin login successful', redirect: '/superadmin-dashboard' });
      }
  
      return res.status(200).json({ message: 'Admin login successful', redirect: '/admin-dashboard' });
    } catch (error) {
      console.error("Error during admin login:", error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
// POST /user/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // 1) Basic input check
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // 2) Look up the user
  db.query(
    'SELECT id, email, password, full_name FROM users WHERE email = ?',
    [email],
    (error, results) => {
      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      // 3) No such user?
      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const user = results[0];

      // 4) Check password
      const isPasswordValid = bcrypt.compareSync(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // 5) SUCCESS! Send back whatever the client needs
      //    Here we return user info as JSON; you could also set a session or JWT.
      res.status(200).json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name
        }
      });
    }
  );
});
  

router.post('/approveAdmin', async (req, res) => {
    try {
        const email = req.body.email;
        console.log("Approving admin with email:", email); // Debug log

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const promiseDb = db.promise();

        // Check if admin exists before updating
        const [adminRecords] = await promiseDb.execute(
            "SELECT * FROM admins WHERE email = ? AND admin_status = 'pending'",
            [email]
        );
        if (adminRecords.length === 0) {
            console.log("Admin not found or not pending.");
            return res.status(404).json({ message: "Admin not found or not pending" });
        }

        // Update admin_status to 'active'
        const [result] = await promiseDb.execute(
            "UPDATE admins SET admin_status = 'active' WHERE email = ?",
            [email]
        );

        console.log("Affected rows:", result.affectedRows);
        if (result.affectedRows === 0) {
            return res.status(500).json({ message: "Failed to update admin status" });
        }

        res.status(200).json({ message: "Admin approved successfully" });
    } catch (error) {
        console.error("Error approving admin:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

  
  // Reject Admin: Delete the admin record
  router.post('/rejectAdmin', async (req, res) => {
    try {
      const email = req.query.email;
      const promiseDb = db.promise();
      const [result] = await promiseDb.execute(
        "DELETE FROM admins WHERE email = ?",
        [email]
      );
      if(result.affectedRows === 0) {
        return res.status(404).json({ message: "Admin not found" });
      }
      res.status(200).json({ message: "Admin rejected and deleted" });
    } catch (error) {
      console.error("Error rejecting admin:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
 
module.exports = router;
