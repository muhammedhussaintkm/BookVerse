const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const profileDir = path.join(__dirname, '../uploads/profile_pics');
if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileDir),
  filename:    (req, file, cb) => {
    const name = Date.now() + path.extname(file.originalname);
    cb(null, name);
  }
});
const uploadProfile = multer({ storage: profileStorage });

// GET /user/me?email=... - Fetch details of a user by email
router.get('/me', async (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ message: 'Email query parameter is required' });
  }

  try {
    const promiseDb = db.promise();
    const [userRows] = await promiseDb.execute(
      `SELECT *
       FROM users WHERE email = ?`,
      [email]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(userRows[0]);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /user/notifications?email=... - Retrieve notifications for a given user email, latest first
router.get('/notifications', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: "Missing email parameter" });
  }
  try {
    const [rows] = await db.promise().execute(
      "SELECT id, user_email, notification, notification_generated_time FROM user_notification WHERE user_email = ? ORDER BY notification_generated_time DESC",
      [email]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /user/notifications/:id - Delete a notification by id
router.delete('/notifications/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Missing notification id" });
  }
  try {
    const [result] = await db.promise().execute(
      "DELETE FROM user_notification WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.status(200).json({ message: "Notification removed successfully" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/// GET /user/mybooks - Fetch books for the logged-in user
router.get('/mybooks', async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ message: 'Email query parameter is required' });
  }
  try {
    const promiseDb = db.promise();
    const [bookRows] = await promiseDb.execute(
      `SELECT *
       FROM books
       WHERE uploader_id = ?`,
      [email]
    );
    res.status(200).json(bookRows);
  } catch (error) {
    console.error('Error fetching book details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// GET /user/showstudymaterial - Fetch approved study materials
router.get('/showstudymaterial', async (req, res) => {
  try {
    const promiseDb = db.promise();
    const [rows] = await promiseDb.execute(
      `SELECT * FROM files WHERE status = 'approved'`
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching study materials:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// POST /user/buyBook - Insert a buy request into buy_requests table
router.post('/buyBook', async (req, res) => {
  console.log("Received buy request:", req.body);  // Debug log
  const { id, buyer_email } = req.body;
  if (!id || !buyer_email) {
    return res.status(400).json({ error: "Missing book ID or buyer email" });
  }
  try {
    // Check if the buyer exists in the users table
    const [userCheck] = await db.promise().execute(
      "SELECT email FROM users WHERE email = ?",
      [buyer_email]
    );
    if (userCheck.length === 0) {
      return res.status(404).json({ error: "Buyer does not exist" });
    }
    
    // Check if a buy request already exists in the buy_requests table
    const [existingRequest] = await db.promise().execute(
      "SELECT * FROM buy_requests WHERE book_id = ? AND buyer_id = ?",
      [id, buyer_email]
    );
    if (existingRequest.length > 0) {
      return res.status(400).json({ error: "Buy request already exists" });
    }
    
    // Insert the buy request with buyer_status 'pending'
    const [result] = await db.promise().execute(
      "INSERT INTO buy_requests (book_id, buyer_id, buyer_status) VALUES (?, ?, 'pending')",
      [id, buyer_email]
    );
    console.log("Buy request insertion result:", result);
    if (result.affectedRows === 0) {
      return res.status(500).json({ error: "Buy request not submitted" });
    }
    res.status(200).json({ message: "Buy request submitted successfully" });
  } catch (err) {
    console.error("Error submitting buy request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});





// POST /user/cancelBuy - Remove the buy request from user_requests table
router.post('/cancelBuy', async (req, res) => {
  const { id, buyer_email } = req.body;
  if (!id || !buyer_email) {
    return res.status(400).json({ error: "Missing book ID or buyer email" });
  }
  try {
    const [result] = await db.promise().execute(
      "DELETE FROM buy_requests WHERE book_id = ? AND buyer_id = ?",
      [id, buyer_email]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "No matching buy request found to cancel" });
    }
    res.status(200).json({ message: "Buy request canceled successfully" });
  } catch (err) {
    console.error("Error canceling buy request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


/// GET /user/buyStatus?book_id=...&buyer_email=...
router.get('/buyStatus', async (req, res) => {
  const { book_id, buyer_email } = req.query;
  try {
    const [rows] = await db.promise().execute(
      "SELECT buyer_status FROM buy_requests WHERE book_id = ? AND buyer_id = ?",
      [book_id, buyer_email]
    );
    if (rows.length > 0) {
      res.json({ buyer_status: rows[0].buyer_status });
    } else {
      res.json({ buyer_status: null });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// GET /user/showbooks - Fetch available books (sale/auction)
router.get('/showbooks', async (req, res) => {
  try {
    const promiseDb = db.promise();
    const [rows] = await promiseDb.execute(
      `SELECT * FROM books WHERE status IN ('sell_approved','auction_approved')`
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
 
// POST /user/updateBookStatus?id=...&status=... - Update a book's status
router.post('/updateBookStatus', async (req, res) => {
  const { id, status } = req.query;
  if (!id || !status) {
    return res.status(400).json({ message: 'Book id and status are required' });
  }
  try {
    const [result] = await db.promise().execute(
      "UPDATE books SET status = ? WHERE id = ?",
      [status, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Book not found or status not updated' });
    }
    res.status(200).json({ message: 'Book status updated successfully' });
  } catch (error) {
    console.error('Error updating book status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.post('/updateBookType', async (req, res) => {
  const { id, type } = req.query;
  if (!id || !type) {
    return res.status(400).json({ message: 'Book id and type are required' });
  }
  try {
    const [result] = await db.promise().execute(
      "UPDATE books SET type = ? WHERE id = ?",
      [type, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Book not found or type not updated' });
    }
    res.status(200).json({ message: 'Book type updated successfully' });
  } catch (error) {
    console.error('Error updating book type:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /user/removeBook?id=... - Remove a book
router.delete('/removeBook', async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: 'Book id is required' });
  }
  try {
    const [result] = await db.promise().execute(
      "DELETE FROM books WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.status(200).json({ message: 'Book removed successfully' });
  } catch (error) {
    console.error('Error removing book:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /user/book?id=... - Fetch details of a specific book
router.get('/book', async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: 'Book id is required' });
  }
  try {
    const [rows] = await db.promise().execute(
      `SELECT *
       FROM books WHERE id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error fetching book details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /user/filedetails?id=... - Fetch file details with uploader name
router.get('/filedetails', async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "Missing file id" });
  }
  try {
    const [rows] = await db.promise().execute(
      `SELECT f.id, f.file_name, f.semester, f.department, f.description,
              u.full_name AS uploader_name
       FROM files f
       LEFT JOIN users u ON f.user_id = u.email
       WHERE f.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error fetching file details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /user/download?id=... - Download a file
router.get('/download', async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "Missing file id" });
  }
  try {
    const [rows] = await db.promise().execute(
      "SELECT file_name, file_path FROM files WHERE id = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }
    const file = rows[0];
    const fullPath = path.join(__dirname, '..', 'uploads', 'study_materials', file.file_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "File not found on server" });
    }
    res.download(fullPath, file.file_name, (err) => {
      if (err) {
        console.error("Error during file download:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error downloading file" });
        }
      }
    });
  } catch (error) {
    console.error("Error in download endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// New Endpoint: POST /user/setSellPrice - Set sell price and update status to 'sell_pending'
router.post('/setSellPrice', async (req, res) => {
  const { id, sell_price } = req.body;
  if (!id || !sell_price) return res.status(400).json({ error: "Missing id or sell_price" });
  try {
    const [result] = await db.promise().execute(
      "UPDATE books SET sell_price = ?, type ='sale',status = 'sell_pending' WHERE id = ?",
      [sell_price, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Book not found" });
    res.status(200).json({ message: "Sell price set and status updated to sell_pending" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// New Endpoint: POST /user/cancelSell - Cancel sell request and reset status to 'library'
router.post('/cancelSell', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Missing id" });
  try {
    const [result] = await db.promise().execute(
      "UPDATE books SET sell_price = NULL, type ='library', status = 'library' WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Book not found" });
    res.status(200).json({ message: "Sell request cancelled and status set to library" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Updated Endpoint: POST /user/setAuctionDetails - Set auction details and update status to 'auction_pending'
// Calculates bid_end as current UNIX timestamp + bid_period (bid_period is sent in seconds)
router.post('/setAuctionDetails', async (req, res) => {
  const { id, min_bid_price, bid_period } = req.body;
  if (!id || !min_bid_price || !bid_period) {
    return res.status(400).json({ error: "Missing parameters" });
  }
  try {
    const updateQuery = `
      UPDATE books 
      SET min_bid_price = ?, 
          max_bid = ?, 
          bid_period = ?, 
          type          ='auction',
          bid_end = UNIX_TIMESTAMP() + ?, 
          status = 'auction_pending' 
      WHERE id = ?
    `;
    const [result] = await db.promise().execute(updateQuery, [
      min_bid_price,
      min_bid_price,
      bid_period,
      bid_period,
      id
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.status(200).json({ message: "Auction details set and status updated to auction_pending" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /user/cancelAuction - Cancel auction request and reset details
router.post('/cancelAuction', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Missing id" });
  try {
    const [result] = await db.promise().execute(
      `UPDATE books 
       SET 
           bid_period    = NULL,
           bid_end       = NULL,
           status        = 'library',
           type = 'auction',
           buyer_status  = 'pending'
       WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.status(200).json({ message: "Auction cancelled, status set to library & sale pending." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// POST /user/cancelAuction - Cancel auction request and reset details
router.post('/cancelAuctionE', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Missing id" });
  try {
    const [result] = await db.promise().execute(
      `UPDATE books 
       SET min_bid_price = NULL,
           bid_period    = NULL,
           bid_end       = NULL,
           max_bid       = NULL,
           status        = 'library',
          type = NULL,
           buyer_status  = 'pending'
       WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.status(200).json({ message: "Auction cancelled, status set to library & sale pending." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// New Endpoint: POST /user/confirmSale - Mark book as sold to highest bidder automatically
router.post('/confirmSale', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Missing id" });
  try {
    // Here we assume buyer_id has been updated during bidding (via another page/process)
    // Mark the book as sold and update status to 'sold'
    const [result] = await db.promise().execute(
      "UPDATE books SET status = 'sold' WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Book not found" });
    res.status(200).json({ message: "Book marked as sold" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// New Endpoint: POST /user/rejectSale - Auction didn't complete; revert auction and reset details
router.post('/rejectSale', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Missing id" });
  try {
    // Reset auction details, leaving the book in 'library' status
    const [result] = await db.promise().execute(
      "UPDATE books SET min_bid_price = NULL, bid_period = NULL, bid_end = NULL, status = 'library' WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Book not found" });
    res.status(200).json({ message: "Auction rejected and book status reset" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// New Endpoint: POST /user/addNotification - Insert a notification record
router.post('/addNotification', async (req, res) => {
  const { user_id, user_email, notification } = req.body;
  if (!user_id || !user_email || !notification) {
    return res.status(400).json({ error: "Missing parameters" });
  }
  try {
    const [result] = await db.promise().execute(
      "INSERT INTO user_notification (user_id, user_email, notification, notification_generated_time) VALUES (?, ?, ?, NOW())",
      [user_id, user_email, notification]
    );
    res.status(200).json({ message: "Notification added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// (Optional) Endpoint to get user details by email (used for buyer name in countdown)
router.get('/getUserByEmail', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Missing email" });
  try {
    const [rows] = await db.promise().execute(
      "SELECT full_name FROM users WHERE email = ?",
      [email]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// POST /user/placeBid – Validate and update the bid.
router.post('/placeBid', async (req, res) => {
  const { id, bid_price, buyer_email } = req.body;
  if (!id || !bid_price || !buyer_email) {
    return res.status(400).json({ error: "Missing parameters" });
  }
  try {
    const promiseDb = db.promise();
    // Retrieve current bid details from the book.
    const [bookRows] = await promiseDb.execute(
      "SELECT min_bid_price, max_bid FROM books WHERE id = ?",
      [id]
    );
    if (bookRows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    const book = bookRows[0];
    // Use max_bid if available; otherwise fallback to min_bid_price.
    const currentMax = parseFloat(book.max_bid) || parseFloat(book.min_bid_price) || 0;
    const newBid = parseFloat(bid_price);
    
    // Ensure new bid is at least ₹20 higher than current highest bid.
    if (newBid < currentMax + 20) {
      return res.status(400).json({ error: `Bid must be at least ₹${(currentMax + 20).toFixed(2)}` });
    }
    
    // Update the book record with the new bid and update buyer_id.
    const [result] = await promiseDb.execute(
      "UPDATE books SET max_bid = ?, buyer_id = ? WHERE id = ?",
      [bid_price, buyer_email, id]
    );
    if (result.affectedRows === 0) {
      return res.status(500).json({ error: "Bid not updated" });
    }
    res.status(200).json({ message: "Bid placed successfully", max_bid: bid_price });
  } catch (err) {
    console.error("Error placing bid:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// New Endpoint: POST /user/finalizeAuction 
// When the auction timer expires, update the book record so that:
//   - buyer_status is set to 'pending'
//   - status is set to 'library'
// Then insert notifications for both buyer and seller.
router.post('/finalizeAuction', async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing book id" });
  }
  try {
    const promiseDb = db.promise();
    // Retrieve book details.
    const [bookRows] = await promiseDb.execute(
      "SELECT book_name, max_bid, min_bid_price, uploader_id, sell_price, buyer_id FROM books WHERE id = ?",
      [id]
    );
    if (bookRows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    const book = bookRows[0];
    const minBid = parseFloat(book.min_bid_price) || 0;
    const maxBid = parseFloat(book.max_bid) || 0;
    // Validate that a valid bid was received.
    if (maxBid <= minBid || !book.buyer_id) {
      return res.status(400).json({ error: "No valid bid received" });
    }
    // Update the book: set buyer_status to 'pending' and status to 'library'
    const [updateResult] = await promiseDb.execute(
      "UPDATE books SET buyer_status = 'pending', status = 'library' WHERE id = ?",
      [id]
    );
    if (updateResult.affectedRows === 0) {
      return res.status(500).json({ error: "Failed to update book status" });
    }
    // Retrieve buyer details using the buyer_id stored in the book.
    const [buyerRows] = await promiseDb.execute(
      "SELECT * FROM users WHERE email = ?",
      [book.buyer_id]
    );
    if (buyerRows.length === 0) {
      return res.status(404).json({ error: "Buyer not found" });
    }
    const buyer = buyerRows[0];
    // Retrieve seller details using the uploader_id from the book.
    const [sellerRows] = await promiseDb.execute(
      "SELECT * FROM users WHERE email = ?",
      [book.uploader_id]
    );
    if (sellerRows.length === 0) {
      return res.status(404).json({ error: "Seller not found" });
    }
    const seller = sellerRows[0];
    // Insert notification for buyer.
    const buyerNotification = `The bid amount ₹${maxBid} placed by you for "${book.book_name}" has won the auction.`;
    await promiseDb.execute(
      "INSERT INTO user_notification (user_email, notification, notification_generated_time) VALUES (?, ?, NOW())",
      [buyer.email, buyerNotification]
    );
    // Insert notification for seller.
    const sellerNotification = `The auction for "${book.book_name}" is completed.`;
    await promiseDb.execute(
      "INSERT INTO user_notification (user_email, notification, notification_generated_time) VALUES (?, ?, NOW())",
      [seller.email, sellerNotification]
    );
    res.status(200).json({ message: "Auction finalized: Book updated and notifications sent." });
  } catch (err) {
    console.error("Error finalizing auction:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



// POST /user/auctionFailed – Handle the case when no valid bid was received.
// Insert a notification for the seller indicating auction failure,
// and then revert the auction (clear auction-related fields and update status to 'library').
router.post('/auctionFailed', async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing book id" });
  }
  try {
    const promiseDb = db.promise();
    // Retrieve book details.
    const [bookRows] = await promiseDb.execute(
      "SELECT book_name, min_bid_price, max_bid, uploader_id FROM books WHERE id = ?",
      [id]
    );
    if (bookRows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    const book = bookRows[0];
    // Check that no valid bid was received (max_bid equals or is not greater than min_bid_price).
    if (parseFloat(book.max_bid) > parseFloat(book.min_bid_price)) {
      return res.status(400).json({ error: "Auction did not fail; a valid bid was received." });
    }
    // Retrieve seller details.
    const [sellerRows] = await promiseDb.execute(
      "SELECT * FROM users WHERE email = ?",
      [book.uploader_id]
    );
    if (sellerRows.length === 0) {
      return res.status(404).json({ error: "Seller not found" });
    }
    const seller = sellerRows[0];
    // Insert notification for seller about auction failure.
    const sellerNotification = `Auction failed for "${book.book_name}" due to absence of bidders.`;
    await promiseDb.execute(
      "INSERT INTO user_notification (user_email, notification, notification_generated_time) VALUES (?, ?, NOW())",
      [seller.email, sellerNotification]
    );
    // Revert the auction: clear auction-related fields and update status to 'library'.
    await promiseDb.execute(
      "UPDATE books SET min_bid_price = NULL, bid_period = NULL, bid_end = NULL, max_bid = NULL, buyer_id = NULL, status = 'library' WHERE id = ?",
      [id]
    );
    res.status(200).json({ message: "Auction failed: Notification sent and auction reverted." });
  } catch (err) {
    console.error("Error handling auction failure:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// POST /user/updateProfile?email=...
router.post('/updateProfile', uploadProfile.single('profile_picture'), async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Missing email" });

  const { full_name, admission_number, branch, semester, phone } = req.body;
  if (!full_name||!admission_number||!branch||!semester||!phone) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const promiseDb = db.promise();
    // Fetch old pic
    const [old] = await promiseDb.execute(
      "SELECT profile_picture FROM users WHERE email = ?", [email]
    );
    if (!old.length) return res.status(404).json({ error: "User not found" });
    const oldPic = old[0].profile_picture;

    // If new pic uploaded, delete old
    let newPic = oldPic;
    if (req.file) {
      newPic = req.file.filename;
      if (oldPic) {
        const oldPath = path.join(profileDir, oldPic);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    // Update user
    const [result] = await promiseDb.execute(
      `UPDATE users SET full_name=?, admission_number=?, branch=?, semester=?, phone=?, profile_picture=? 
       WHERE email = ?`,
      [ full_name, admission_number, branch, semester, phone, newPic, email ]
    );
    if (result.affectedRows === 0) {
      return res.status(500).json({ error: "Update failed" });
    }
    res.json({ message: "Profile updated" });
  } catch(err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// New Endpoint: POST /admin/approveAuctionSale
router.post('/approveAuctionSale', async (req, res) => {
  const { book_id, buyer_id } = req.body;
  if (!book_id || !buyer_id) {
    return res.status(400).json({ error: "Missing book_id or buyer_id" });
  }
  const promiseDb = db.promise();
  try {
    // Get the current admin's email from session (adjust as needed)
    const currentAdminEmail = req.session && req.session.admin_email;
    if (!currentAdminEmail) {
      return res.status(403).json({ error: "Unauthorized: Admin not logged in." });
    }
    
    // Retrieve admin's name from the admins table.
    const [adminRows] = await promiseDb.execute(
      "SELECT full_name FROM admins WHERE email = ?",
      [currentAdminEmail]
    );
    if (adminRows.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }
    const approved_admin = adminRows[0].full_name;
    
    // Retrieve book details along with uploader (seller) info.
    const [bookRows] = await promiseDb.execute(
      `SELECT b.book_name, b.max_bid, b.uploader_id, u.full_name AS uploader_name
       FROM books b
       JOIN users u ON b.uploader_id = u.email
       WHERE b.id = ?`,
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
    
    // Update the book with the approved admin name.
    await promiseDb.execute(
      "UPDATE books SET approved_admin = ? WHERE id = ?",
      [approved_admin, book_id]
    );
    
    // Insert notifications for uploader and buyer.
    const uploaderNotification = `your book ${book.book_name} is sold to ${buyer.full_name} for a bid amount ₹${book.max_bid} by the admin : ${approved_admin}.`;
    await promiseDb.execute(
      "INSERT INTO user_notification (user_email, notification, notification_generated_time) VALUES (?, ?, NOW())",
      [book.uploader_id, uploaderNotification]
    );
    const buyerNotification = `The book ${book.book_name} is sold to you from ${book.uploader_name} for a bid amount ₹${book.max_bid} by the admin : ${approved_admin}.`;
    await promiseDb.execute(
      "INSERT INTO user_notification (user_email, notification, notification_generated_time) VALUES (?, ?, NOW())",
      [buyer_id, buyerNotification]
    );
    
    // Delete all buy_requests for the given book_id and then delete the book within a transaction.
    await promiseDb.beginTransaction();
    await promiseDb.execute("DELETE FROM buy_requests WHERE book_id = ?", [book_id]);
    await promiseDb.execute("DELETE FROM books WHERE id = ?", [book_id]);
    await promiseDb.commit();
    
    res.status(200).json({ message: "Auction sale approved, notifications sent, and book removed." });
  } catch (error) {
    await promiseDb.rollback();
    console.error("Error approving auction sale:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// New Endpoint: POST /admin/approveSaleForSale
router.post('/approveSaleForSale', async (req, res) => {
  const { book_id, buyer_id } = req.body;
  if (!book_id || !buyer_id) {
    return res.status(400).json({ error: "Missing book_id or buyer_id" });
  }
  const promiseDb = db.promise();
  try {
    // 1. Update the selected buy request to 'approved'
    const [updateResult] = await promiseDb.execute(
      "UPDATE buy_requests SET buyer_status = 'approved' WHERE book_id = ? AND buyer_id = ?",
      [book_id, buyer_id]
    );
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ error: "Buy request not found" });
    }

    // 2. Delete all other buy_requests for the same book
    await promiseDb.execute(
      "DELETE FROM buy_requests WHERE buyer_id != ? AND book_id = ?",
      [buyer_id,book_id ]
    );

    // 3. Retrieve book details along with seller info
    const [bookRows] = await promiseDb.execute(
      `SELECT b.book_name, b.sell_price, b.uploader_id, u.full_name AS seller_name, u.email AS seller_email 
       FROM books b 
       JOIN users u ON b.uploader_id = u.email 
       WHERE b.id = ?`,
      [book_id]
    );
    if (bookRows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    const book = bookRows[0];

    // 4. Retrieve buyer details
    const [buyerRows] = await promiseDb.execute(
      "SELECT full_name, email FROM users WHERE email = ?",
      [buyer_id]
    );
    if (buyerRows.length === 0) {
      return res.status(404).json({ error: "Buyer not found" });
    }
    const buyer = buyerRows[0];

    // 5. Insert notifications for buyer and seller
    const buyerNotification = `The book ${book.book_name} is sold to you for ₹${book.sell_price}`;
    await promiseDb.execute(
      "INSERT INTO user_notification (user_email, notification, notification_generated_time) VALUES (?, ?, NOW())",
      [buyer_id, buyerNotification]
    );
    const sellerNotification = `Your book ${book.book_name} is sold to ${buyer.full_name} for ₹${book.sell_price}`;
    await promiseDb.execute(
      "INSERT INTO user_notification (user_email, notification, notification_generated_time) VALUES (?, ?, NOW())",
      [book.seller_email, sellerNotification]
    );

    // 6. Wrap deletion of all remaining buy_requests and the book in a transaction
    await promiseDb.beginTransaction();
    // Delete all remaining buy_requests for this book
    await promiseDb.execute("DELETE FROM buy_requests WHERE book_id = ?", [book_id]);
    // Delete the book from the books table
    await promiseDb.execute("DELETE FROM books WHERE id = ?", [book_id]);
    await promiseDb.commit();

    res.status(200).json({ message: "Sale approved, notifications sent, and book removed." });
  } catch (error) {
    await promiseDb.rollback();
    console.error("Error approving sale:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


module.exports = router;

