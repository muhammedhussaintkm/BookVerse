require('dotenv').config(); // <- Make sure this is the FIRST thing in server.js

const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const { body, validationResult } = require('express-validator');
const session = require('express-session');
const superadminRoutes = require('./routes/superadmin');
const userRoutes = require('./routes/user');
const bookUploadRoute = require('./routes/bookUpload');
const studyMaterialUploadRoute = require('./routes/studyMaterialUpload');
const adminRoutes = require('./routes/admin');
// ← Add these lines:
const crypto      = require('crypto');
const nodemailer  = require('nodemailer');
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,               // use SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS  // must be an app‑password if 2FA is on
    }
  });
  const app = express(); 


// Middleware: enable CORS and parse JSON/URL-encoded data BEFORE mounting routes.
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routes
app.use('/user', userRoutes);
app.use(studyMaterialUploadRoute);
app.use('/admin', adminRoutes);
app.use(bookUploadRoute);

// Session setup
app.use(session({
    secret: 'makhussu321',  // Change this to a more secure key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to 'true' if using HTTPS
}));
// Serve static files from the public directory
app.use(express.static('public'));
app.use('/api', authRoutes); // Attach your auth routes under '/api'
app.use(express.static(path.join(__dirname, 'public')));
app.use('/superadmin', superadminRoutes);

// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
        return;
    }
    console.log('Connected to MySQL database');
});

// Make db accessible to routes
app.use((req, res, next) => {
    req.db = db;
    next();
});

// Serve Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, 'views', 'forgotPassword.html')));
app.get('/reset-password', (req, res) => res.sendFile(path.join(__dirname, 'views', 'resetPassword.html')));
app.get('/admin-register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'adminRegister.html')));
app.get('/admin-login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'adminLogin.html')));

// Dashboard Routes
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'views', 'users.html')));
app.get('/manageAdmins', (req, res) => res.sendFile(path.join(__dirname, 'views', 'manageAdmins.html')));
app.get('/adminRequests', (req, res) => res.sendFile(path.join(__dirname, 'views', 'adminRequests.html')));
app.get('/superAdminDashboard', (req, res) => res.sendFile(path.join(__dirname, 'views', 'superAdminDashboard.html')));
app.get('/superadmin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'superAdminDashboard.html'));
});
app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'adminDashboard.html'));
});
app.get('/pendingBooks', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pendingBooks.html'));
});
app.get('/pendingFiles', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pendingFiles.html'));
});
app.get('/manageUsers', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'manageUsers.html'));
});
app.get('/changePassword', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'changePassword.html'));
});
app.get('/manageFiles', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'manageFiles.html'));
});
app.get('/pendingSales', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pendingSales.html'));
});
app.get('/manageBooks', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'manageBooks.html'));
});
app.get('/editBook', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'editBook.html'));
});
app.get('/adminProfile', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'adminProfile.html'));
});

app.get('/showFileDetails', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'showFileDetails.html'));
});
app.get('/BidPage', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'BidPage.html'));
});
app.get('/BuyPage', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'BuyPage.html'));
});
// User Dashboard Route
app.get('/user-dashboard', (req, res) => {
    if (req.session.user && req.session.user.role === 'user') {
        res.sendFile('dashboard.html', { root: './views' });
    } else {
        res.status(403).json({ message: 'Access Denied' });
    }
});
app.get('/mybookDetails', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'mybookDetails.html'));
});
app.get('/myBooks', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'myBooks.html'));
});
app.get('/sellBooks', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'sellBooks.html'));
});
app.get('/uploadStudyMaterials', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'uploadStudyMaterials.html'));
});
app.get('/Notifications', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'Notifications.html'));
});
app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});
app.get('/uploadBook', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'uploadBook.html'));
});
app.get('/superadmin/pendingAdmins', async (req, res) => {
    try {
        const promiseDb = db.promise();
        const [rows] = await promiseDb.execute("SELECT full_name, email, admin_status FROM admins WHERE admin_status = 'pending'");
        res.json(rows);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Auth Routes for POST requests
app.use('/auth', (req, res, next) => {
    req.db = db;
    next();
}, authRoutes);


app.post('/register', async (req, res) => {
    console.log('Received Registration Data:', req.body);

    const { full_name, email, admissionNumber, branch, semester, phone, password, confirmPassword } = req.body;

    // Check for empty fields (backend validation)
    if (!full_name || !email || !admissionNumber || !branch || !semester || !phone || !password || !confirmPassword) {
        console.log('Error: Missing required fields');
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const [userExists] = await db.promise().query('SELECT * FROM users WHERE email = ? OR admission_number = ?', [email, admissionNumber]);

        if (userExists.length > 0) {
            console.log('Error: Email or Admission Number already exists');
            return res.status(400).json({ message: 'Email or Admission Number already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.promise().query('INSERT INTO users (full_name, email, admission_number, branch, semester, phone, password) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [full_name, email, admissionNumber, branch, semester, phone, hashedPassword]);

        console.log('User registered successfully');
        res.status(201).json({ message: 'Registration successful' });
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Register route
app.post('/register', [
    body('email').isEmail().withMessage('Invalid Email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('admissionNumber').isNumeric().withMessage('Admission Number should be numeric'),
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('branch').notEmpty().withMessage('Branch is required'),
    body('semester').notEmpty().withMessage('Semester is required'),
    body('phone').isMobilePhone().withMessage('Invalid phone number')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

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

// Approve Admin Registration
app.post('/superadmin/approve-admin', (req, res) => {
    const adminId = req.body.adminId;
    const query = 'UPDATE admins SET admin_status = "active" WHERE id = ?';
    db.query(query, [adminId], (err, result) => {
        if (err) throw err;
        res.redirect('/superadmin/dashboard');  // Refresh the dashboard after approval
    });
});

// Reject Admin Registration
app.post('/superadmin/reject-admin', (req, res) => {
    const adminId = req.body.adminId;
    const query = 'UPDATE admins SET admin_status = "inactive" WHERE id = ?';
    db.query(query, [adminId], (err, result) => {
        if (err) throw err;
        res.redirect('/superadmin/dashboard');  // Refresh the dashboard after rejection
    });
});

// Admin Login Route
app.post('/admin/login', (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM admins WHERE email = ?';

    db.query(query, [email], (err, result) => {
        if (err) throw err;

        if (result.length === 0) {
            return res.status(400).send('Admin not found');
        }

        const admin = result[0];

        // Check if the admin status is pending
        if (admin.admin_status === 'pending') {
            return res.status(400).send('Your account is pending approval by the superadmin.');
        }

        // Check password if not pending
        bcrypt.compare(password, admin.password, (err, match) => {
            if (err) throw err;
            if (!match) {
                return res.status(400).send('Invalid credentials');
            }

            // Set session and log in the admin
            req.session.admin = admin;
            res.redirect('/admin/dashboard');
        });
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      return res.redirect('/');
    });
  });
 // POST /auth/forgot-password
app.post('/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
  
    try {
      // 1) Look up the user
      const [rows] = await db.promise().execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
  
      // 2) Always return success to avoid email enumeration
      if (rows.length === 0) {
        return res.json({ success: true });
      }
  
      const userId = rows[0].id;
  
      // 3) Generate token + expiry
      const token   = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600_000); // 1 hour
  
      // 4) Save into MySQL
      await db.promise().execute(
        `UPDATE users
           SET resetToken = ?, resetTokenExpiration = ?
         WHERE id = ?`,
        [token, expires, userId]
      );
      
      // 5) Send the email
      const resetURL = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
      // inside your POST /auth/forgot-password handler, before `await transporter.sendMail(...)`:
console.log('📨 About to send reset email to:', email);
console.log('📨 Mail options:', {
  to: email,
  subject: 'BookVerse Password Reset',
  text: `Reset link: ${resetURL}`
});

      await transporter.sendMail({
        to:      email,
        from:    process.env.EMAIL_USER,
        subject: '📚 BookVerse Password Reset',
        text:
          `You requested a password reset for your BookVerse account.\n\n` +
          `Click this link (or paste into your browser) within the next hour:\n\n` +
          `${resetURL}\n\n` +
          `If you did not request this, please ignore this email.\n`
      });
  
      res.json({ success: true });
    } catch (err) {
      console.error('Forgot-password error:', err);
      res.status(500).json({ success: false, message: 'Server error.' });
    }
  });
  
 // POST /reset-password
app.post('/reset-password', async (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;
  
    // 1) basic validation
    if (!token) {
      return res.status(400).send('Missing token.');
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).send('Passwords do not match.');
    }
  
    try {
      // 2) Find user by token & check expiration
      const [rows] = await db.promise().execute(
        `SELECT id, resetTokenExpiration
           FROM users
          WHERE resetToken = ?`,
        [token]
      );
  
      if (rows.length === 0) {
        return res.status(400).send('Invalid or expired token.');
      }
  
      const { id, resetTokenExpiration } = rows[0];
      if (new Date(resetTokenExpiration) < new Date()) {
        return res.status(400).send('Token has expired.');
      }
  
      // 3) Hash new password
      const hash = await bcrypt.hash(newPassword, 12);
  
      // 4) Update user: set new password & clear token fields
      await db.promise().execute(
        `UPDATE users
           SET password = ?,
               resetToken = NULL,
               resetTokenExpiration = NULL
         WHERE id = ?`,
        [hash, id]
      );
  
      // 5) (Optional) send confirmation email
      await transporter.sendMail({
        to:      rows[0].email,         // you may need to re‑SELECT email or stash it above
        from:    process.env.EMAIL_USER,
        subject: '✅ Your BookVerse Password Was Reset',
        text:    `Hello,\n\nThis is a confirmation that your password has been successfully changed.\n`
      });
  
      res.send('Password reset successful! You can now log in.');
    } catch (err) {
      console.error('Reset-password error:', err);
      res.status(500).send('Server error. Please try again later.');
    }
  });
  // one‑off test
setTimeout(() => {
    transporter.sendMail({
      to: process.env.EMAIL_USER,
      from: process.env.EMAIL_USER,
      subject: 'Test from BookVerse',
      text: 'If you see this, your mailer is working.'
    })
    .then(() => console.log('✅  Test email sent'))
    .catch(err => console.error('❌  Test email failed:', err));
  }, 2000);
  

// Server listening
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
