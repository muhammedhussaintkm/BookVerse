const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Ensure the directory exists
const profileDir = path.join(__dirname, '../uploads/profile_pics');
if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

// Multer storage configuration for profile pictures
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileDir),
  filename: (req, file, cb) => {
    const name = Date.now() + path.extname(file.originalname);
    cb(null, name);
  }
});
const uploadProfile = multer({ storage: profileStorage });

const bcrypt = require('bcryptjs');



// GET /admin/users - Fetch all users
router.get('/users', async (req, res) => {
  try {
    const promiseDb = db.promise();
    const [rows] = await promiseDb.execute(
      `SELECT id, full_name, email, admission_number, branch, semester, phone, profile_picture, user_status 
       FROM users`
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PUT /admin/updateUserStatus - Toggle user's status using email
router.put('/updateUserStatus', async (req, res) => {
  try {
    console.log("Request body:", req.body);
    const { email, status } = req.body;
    if (!email || !status) {
      return res.status(400).json({ message: 'Email and status are required' });
    }
    const promiseDb = db.promise();
    const [result] = await promiseDb.execute(
      "UPDATE users SET user_status = ? WHERE email = ?",
      [status, email]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User status updated successfully" });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /admin/manageBooks - Get approved books (sell_approved or auction_approved)
router.get('/manageBooks', async (req, res) => {
  try {
    const promiseDb = db.promise();
    const [rows] = await promiseDb.execute(
      `SELECT b.id, b.book_name, b.sell_price, b.max_bid, b.author, b.bid_period, b.bid_end, 
              b.edition, b.book_cover, b.status, u.full_name AS uploader_name 
       FROM books b 
       LEFT JOIN users u ON b.uploader_id = u.email 
       WHERE b.status IN ('sell_approved', 'auction_approved') 
         AND b.type IN ('sale', 'auction') 
         `
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching approved books:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /admin/pendingBooks - Get pending books (sell_pending or auction_pending)
router.get('/pendingBooks', async (req, res) => {
  try {
    const promiseDb = db.promise();
    const [rows] = await promiseDb.execute(
      `SELECT b.id, b.book_name,b.sell_price,b.min_bid_price, b.author,b.bid_period, b.edition, b.book_cover, b.status, 
              u.full_name AS uploader_name 
       FROM books b 
       LEFT JOIN users u ON b.uploader_id = u.email 
       WHERE b.status IN ('sell_pending', 'auction_pending')`
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching pending books:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /admin/approveBook - Approve a pending book
router.post('/approveBook', async (req, res) => {
  try {
    const id = req.query.id || req.body.id;
    if (!id) {
      return res.status(400).json({ message: "Book id is required" });
    }
    const promiseDb = db.promise();
    // Get current status of the book
    const [rows] = await promiseDb.execute("SELECT status FROM books WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Book not found" });
    }
    const currentStatus = rows[0].status;
    let newStatus = "";
    if (currentStatus === 'sell_pending') {
      newStatus = 'sell_approved';
    } else if (currentStatus === 'auction_pending') {
      newStatus = 'auction_approved';
    } else {
      return res.status(400).json({ message: "Book status is not pending approval" });
    }
    const [result] = await promiseDb.execute("UPDATE books SET status = ? WHERE id = ?", [newStatus, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Book not found or not updated" });
    }
    res.status(200).json({ message: "Book approved successfully" });
  } catch (error) {
    console.error("Error approving book:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /admin/rejectBook - Reject a pending book by updating its status to 'library'
router.post('/rejectBook', async (req, res) => {
  try {
    const id = req.query.id || req.body.id;
    if (!id) {
      return res.status(400).json({ message: "Book id is required" });
    }
    const promiseDb = db.promise();
    const [result] = await promiseDb.execute("UPDATE books SET status = 'library' WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Book not found or not updated" });
    }
    res.status(200).json({ message: "Book rejected successfully" });
  } catch (error) {
    console.error("Error rejecting book:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /admin/removeUser - Remove a user by email
router.delete('/removeUser', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    const promiseDb = db.promise();
    const [result] = await promiseDb.execute("DELETE FROM users WHERE email = ?", [email]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User removed successfully" });
  } catch (error) {
    console.error("Error removing user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /admin/pendingFiles - Get pending files with uploader info
router.get('/pendingFiles', async (req, res) => {
  try {
    const promiseDb = db.promise();
    const [rows] = await promiseDb.execute(
      `SELECT f.id, f.file_name, f.file_path, f.status, u.full_name AS uploader_name 
       FROM files f 
       LEFT JOIN users u ON f.user_id = u.email 
       WHERE f.status = 'pending'`
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching pending files:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /admin/approveFile - Approve a pending file (update status to 'approved')
router.post('/approveFile', async (req, res) => {
  try {
    const id = req.query.id || req.body.id;
    if (!id) {
      return res.status(400).json({ message: "File id is required" });
    }
    const promiseDb = db.promise();
    const [result] = await promiseDb.execute("UPDATE files SET status = 'approved' WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "File not found or not updated" });
    }
    res.status(200).json({ message: "File approved successfully" });
  } catch (error) {
    console.error("Error approving file:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /admin/rejectFile - Reject a pending file (delete the file entry)
router.post('/rejectFile', async (req, res) => {
  try {
    const id = req.query.id || req.body.id;
    if (!id) {
      return res.status(400).json({ message: "File id is required" });
    }
    const promiseDb = db.promise();
    const [result] = await promiseDb.execute("DELETE FROM files WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "File not found" });
    }
    res.status(200).json({ message: "File rejected and removed successfully" });
  } catch (error) {
    console.error("Error rejecting file:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /admin/downloadFile - Trigger file download
router.get('/downloadFile', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.status(400).json({ message: "File id is required" });
    }
    const promiseDb = db.promise();
    const [rows] = await promiseDb.execute("SELECT file_name, file_path FROM files WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "File not found" });
    }
    const file = rows[0];
    const fileLocation = path.resolve(__dirname, '..', 'uploads', 'study_materials', file.file_path);
    res.download(fileLocation, file.file_name, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        return res.status(500).json({ message: "Error downloading file" });
      }
    });
  } catch (error) {
    console.error("Error in downloadFile endpoint:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /admin/pendingSales - Get pending sales (union query for sale & auction requests)
router.get('/pendingSales', async (req, res) => {
  try {
    const promiseDb = db.promise();
    const [rows] = await promiseDb.execute(
      `(
        SELECT
          br.book_id,
          br.buyer_id AS requested_buyerid,
          br.buyer_status,
          b.book_name,
          b.author,
          b.type,
          b.buyer_id AS book_buyer_id,
          b.edition,
          b.book_cover,
          b.sell_price,
          NULL AS min_bid_price,
          NULL AS max_bid,
          b.semester AS book_semester,
          b.department AS book_department,
          u.full_name AS buyer_name,
          u.email AS buyer_email,
          u.admission_number,
          u.profile_picture,
          u.branch,
          u.semester AS buyer_semester,
          s.full_name AS seller_name,
          s.branch AS seller_department
        FROM buy_requests br
        JOIN books b ON br.book_id = b.id
        JOIN users u ON br.buyer_id = u.email
        LEFT JOIN users s ON b.uploader_id = s.email
        WHERE br.buyer_status = 'pending'
          AND b.type = 'sale'
          AND b.status = 'sell_approved'
          AND b.buyer_id IS NULL
      )
      UNION
      (
        SELECT
          b.id AS book_id,
          b.buyer_id AS requested_buyerid,
          'approved' AS buyer_status,
          b.book_name,
          b.author,
          b.type,
          b.buyer_id AS book_buyer_id,
          b.edition,
          b.book_cover,
          NULL AS sell_price,
          b.min_bid_price,
          b.max_bid,
          b.semester AS book_semester,
          b.department AS book_department,
          u.full_name AS buyer_name,
          u.email AS buyer_email,
          u.admission_number,
          u.profile_picture,
          u.branch,
          u.semester AS buyer_semester,
          s.full_name AS seller_name,
          s.branch AS seller_department
        FROM books b
        JOIN users u ON b.buyer_id = u.email
        LEFT JOIN users s ON b.uploader_id = s.email
        WHERE b.type = 'auction'
          AND b.status = 'library'
          AND b.buyer_id IS NOT NULL
      )
      ORDER BY book_id;`
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching pending sales:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /admin/approveSaleForSale - Approve sale for a pending buy request
router.post('/approveSaleForSale', async (req, res) => {
  const { book_id, buyer_id } = req.body;
  if (!book_id || !buyer_id) {
    return res.status(400).json({ error: "Missing book_id or buyer_id" });
  }
  try {
    const promiseDb = db.promise();
    // Update the selected buy request to 'approved'
    const [updateResult] = await promiseDb.execute(
      "UPDATE buy_requests SET buyer_status = 'approved' WHERE book_id = ? AND buyer_id = ?",
      [book_id, buyer_id]
    );
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ error: "Buy request not found" });
    }
    // Delete other buy_requests for the same book with a different buyer_id
    await promiseDb.execute(
      "DELETE FROM buy_requests WHERE book_id = ? AND buyer_id = ?",
      [book_id, buyer_id]
    );
    // Retrieve book details along with seller info.
    const [bookRows] = await promiseDb.execute(
      "SELECT b.book_name, b.sell_price, b.uploader_id, u.full_name AS seller_name, u.email AS seller_email FROM books b JOIN users u ON b.uploader_id = u.email WHERE b.id = ?",
      [book_id]
    );
    if (bookRows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    const book = bookRows[0];
    // Retrieve buyer details.
    const [buyerRows] = await promiseDb.execute(
      "SELECT full_name, email FROM users WHERE email = ?",
      [buyer_id]
    );
    if (buyerRows.length === 0) {
      return res.status(404).json({ error: "Buyer not found" });
    }
    const buyer = buyerRows[0];
    // Insert notification for the buyer.
    const buyerNotification = `The book ${book.book_name} is sold to you from ${book.seller_name} for rps.${book.sell_price}`;
    await promiseDb.execute(
      "INSERT INTO user_notification (user_email, notification, notification_generated_time) VALUES (?, ?, NOW())",
      [buyer_id, buyerNotification]
    );
    // Insert notification for the seller.
    const sellerNotification = `Your book ${book.book_name} is sold out to ${buyer.full_name} for ₹${book.sell_price}`;
    await promiseDb.execute(
      "INSERT INTO user_notification (user_email, notification, notification_generated_time) VALUES (?, ?, NOW())",
      [book.seller_email, sellerNotification]
    );
    // Remove the book from the books table.
    await promiseDb.execute(
      "DELETE FROM books WHERE id = ?",
      [book_id]
    );
    res.status(200).json({ message: "Sale approved, notifications sent, and book removed." });
  } catch (error) {
    console.error("Error approving sale:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /admin/removeBook - Remove a book by id
router.delete('/removeBook', async (req, res) => {
  const bookId = req.query.id;
  if (!bookId) {
    return res.status(400).json({ message: 'Book ID is required' });
  }
  try {
    const promiseDb = db.promise();
    const [result] = await promiseDb.execute(
      'DELETE FROM books WHERE id = ?',
      [bookId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.status(200).json({ message: 'Book successfully removed' });
  } catch (error) {
    console.error('Error removing book:', error);
    res.status(500).json({ message: 'Server error while removing book' });
  }
});

// POST /admin/approveAuctionSale - Approve an auction sale
router.post('/approveAuctionSale', async (req, res) => {
  const { book_id, buyer_id } = req.body;
  if (!book_id || !buyer_id) {
    return res.status(400).json({ error: "Missing book_id or buyer_id" });
  }
  try {
    const promiseDb = db.promise();
    // Retrieve auction book details along with seller info.
    const [bookRows] = await promiseDb.execute(
      "SELECT b.book_name, b.min_bid_price, b.max_bid, b.id, b.buyer_id, b.uploader_id, u.full_name AS seller_name, u.email AS seller_email, b.status FROM books b JOIN users u ON b.uploader_id = u.email WHERE b.id = ?",
      [book_id]
    );
    if (bookRows.length === 0) {
      return res.status(404).json({ error: "Auction book not found" });
    }
    const book = bookRows[0];
    // Ensure the book's status is appropriate for approval (e.g., 'library')
    if (book.status !== 'library') {
      return res.status(400).json({ error: "Book status is not valid for approval" });
    }
    // Retrieve buyer details.
    const [buyerRows] = await promiseDb.execute(
      "SELECT full_name, email FROM users WHERE email = ?",
      [book.buyer_id]
    );
    if (buyerRows.length === 0) {
      return res.status(404).json({ error: "Buyer not found" });
    }
    const buyer = buyerRows[0];
    // Insert notification for the buyer.
    const buyerNotification = `Your bid ₹${book.max_bid} on the book "${book.book_name}" has been approved.`;
    await promiseDb.execute(
      "INSERT INTO user_notification (user_email, notification, notification_generated_time) VALUES (?, ?, NOW())",
      [book.buyer_id, buyerNotification]
    );
    // Insert notification for the seller.
    const sellerNotification = `Your auction for "${book.book_name}" has been sold to ${buyer.full_name} for ₹${book.max_bid}.`;
    await promiseDb.execute(
      "INSERT INTO user_notification (user_email, notification, notification_generated_time) VALUES (?, ?, NOW())",
      [book.seller_email, sellerNotification]
    );
    // Optionally remove the book from the books table.
    await promiseDb.execute(
      "DELETE FROM books WHERE id = ?",
      [book_id]
    );
    res.status(200).json({ message: "Auction sale approved, notifications sent, and book removed." });
  } catch (error) {
    console.error("Error approving auction sale:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/manageFiles - Get approved files with uploader info
router.get('/manageFiles', async (req, res) => {
  try {
    const promiseDb = db.promise();
    const [rows] = await promiseDb.execute(
      `SELECT f.id, f.file_name, f.department, f.semester, f.file_path, f.status, u.full_name AS uploader_name 
       FROM files f 
       LEFT JOIN users u ON f.user_id = u.email 
       WHERE f.status = 'approved'`
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// GET /admin/getUserByEmail?email=...
// This endpoint fetches the user information by email.
router.get('/getUserByEmail', async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  try {
    const promiseDb = db.promise();
    const [rows] = await promiseDb.execute(
      `SELECT full_name, admission_number, branch, semester, profile_picture 
       FROM users WHERE email = ?`, 
      [email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/updatePassword
// This endpoint receives a new password for a user, hashes it, and updates the users table.
router.post('/updatePassword', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    // Hash the new password with a salt round of 10 (adjust as needed)
    
    const hashedPassword = await bcrypt.hash(password, 10);


    const promiseDb = db.promise();
    const [result] = await promiseDb.execute(
      `UPDATE users SET password = ? WHERE email = ?`,
      [hashedPassword, email]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// POST /admin/updateProfile?email=...
router.post('/updateProfile', uploadProfile.single('profile_picture'), async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Missing email" });

  const { full_name, department, phone } = req.body;
  if (!full_name || !department || !phone) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const promiseDb = db.promise();
    // Fetch old profile picture (from the column "profile")
    const [old] = await promiseDb.execute(
      "SELECT profile FROM admins WHERE email = ?", [email]
    );
    if (!old.length) return res.status(404).json({ error: "User not found" });
    const oldPic = old[0].profile; // Use the field "profile"

    // If a new pic is uploaded, delete the old one
    let newPic = oldPic;
    if (req.file) {
      newPic = req.file.filename;
      if (oldPic) {
        const oldPath = path.join(profileDir, oldPic);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    // Update the admin data (using the "profile" column)
    const [result] = await promiseDb.execute(
      `UPDATE admins SET full_name=?, department=?, phone=?, profile=? 
       WHERE email = ?`,
      [ full_name, department, phone, newPic, email ]
    );
    if (result.affectedRows === 0) {
      return res.status(500).json({ error: "Update failed" });
    }
    res.json({ message: "Profile updated" });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// GET /admin/me?email=... - Fetch details of an admin by email
router.get('/me', async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ message: "Email query parameter is required" });
  }
  try {
    const promiseDb = db.promise();
    const [userRows] = await promiseDb.execute(
      `SELECT * FROM admins WHERE email = ?`, [email]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    // Add a field "profile_picture" for frontend consistency
    userRows[0].profile_picture = userRows[0].profile;
    res.status(200).json(userRows[0]);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
module.exports = router;
