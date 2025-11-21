const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');


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
    console.log("Request body:", req.body); // Debugging
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
// GET /admin/manageBooks - Get pending books with status 'sell_papproved' or 'auction_approved'
// and join with users table to get uploader name.
router.get('/manageBooks', async (req, res) => {
  try {
    const promiseDb = db.promise();
    const [rows] = await promiseDb.execute(
      `SELECT b.id, b.book_name, b.sell_price,b.max_bid,b.author, b.bid_period,b.bid_end,b.edition, b.book_cover, b.status, 
       u.full_name AS uploader_name 
FROM books b 
LEFT JOIN users u ON b.uploader_id = u.email 
WHERE b.status IN ('sell_approved', 'auction_approved') 
  AND b.type IN ('sale', 'auction') 
  AND b.min_bid_price IS NOT NULL;

 `
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching pending books:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// GET /admin/pendingBooks - Get pending books with status 'sell_pending' or 'auction_pending'
// and join with users table to get uploader name.
router.get('/pendingBooks', async (req, res) => {
  try {
    const promiseDb = db.promise();
    const [rows] = await promiseDb.execute(
      `SELECT b.id, b.book_name, b.author, b.edition, b.book_cover, b.status, 
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

// PUT /admin/updateUserStatus - Toggle user's status using email (existing endpoint)
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

// POST /admin/approveBook - Approve a pending book.
// If book status is 'sell_pending', update to 'sell_approved'.
// If 'auction_pending', update to 'auction_approved'.
router.post('/approveBook', async (req, res) => {
  try {
    const id = req.query.id || req.body.id;
    if (!id) {
      return res.status(400).json({ message: "Book id is required" });
    }
    const promiseDb = db.promise();
    // Get the current status of the book
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
    const [result] = await promiseDb.execute(
      "UPDATE books SET status = ? WHERE id = ?",
      [newStatus, id]
    );
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
    const [result] = await promiseDb.execute(
      "UPDATE books SET status = 'library' WHERE id = ?",
      [id]
    );
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
    const [result] = await promiseDb.execute(
      "DELETE FROM users WHERE email = ?",
      [email]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User removed successfully" });
  } catch (error) {
    console.error("Error removing user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// GET /admin/pendingFiles - Get pending files from the files table (status 'pending') with uploader info
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
    const [result] = await promiseDb.execute(
      "UPDATE files SET status = 'approved' WHERE id = ?",
      [id]
    );
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
    const [result] = await promiseDb.execute(
      "DELETE FROM files WHERE id = ?",
      [id]
    );
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
    const [rows] = await promiseDb.execute(
      "SELECT file_name, file_path FROM files WHERE id = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "File not found" });
    }
    const file = rows[0];
    // Assume your uploaded files are stored in the "uploads" folder at the project root.
    // Build an absolute path to the file.
    const fileLocation = path.resolve(__dirname, '..', 'uploads','study_materials', file.file_path);
    // Alternatively, if file.file_path is relative to your project root, you could do:
    // const fileLocation = path.resolve(__dirname, '..', file.file_path);

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
// ... (Existing endpoints remain unchanged)

// GET /admin/pendingSales
router.get('/pendingSales', async (req, res) => {
  try {
    const promiseDb = db.promise();
    const [rows] = await promiseDb.execute(
      // 1) Regular sales pending in buy_requests
      `(

  SELECT
    br.book_id,
    br.buyer_id       AS requested_buyerid,
    br.buyer_status,
    b.book_name,
    b.author,
    b.type,
    b.buyer_id        AS book_buyer_id,
    b.edition,
    b.book_cover,
    b.sell_price,
    NULL              AS min_bid_price,
    NULL              AS max_bid,
    b.semester        AS book_semester,
    b.department      AS book_department,
    u.full_name       AS buyer_name,
    u.email           AS buyer_email,
    u.admission_number,
    u.profile_picture,
    u.branch,
    u.semester        AS buyer_semester,
    s.full_name       AS seller_name,
    s.branch          AS seller_department
  FROM buy_requests br
  JOIN books b        ON br.book_id = b.id
  JOIN users u        ON br.buyer_id = u.email
  LEFT JOIN users s   ON b.uploader_id = s.email
  WHERE br.buyer_status = 'pending'
    AND b.type = 'sale'
    AND b.status = 'sell_approved'
    AND b.buyer_id IS NULL
)
UNION
(

  SELECT
    b.id              AS book_id,
    b.buyer_id        AS requested_buyerid,
    'approved'        AS buyer_status,
    b.book_name,
    b.author,
    b.type,
    b.buyer_id        AS book_buyer_id,
    b.edition,
    b.book_cover,
    NULL              AS sell_price,
    b.min_bid_price,
    b.max_bid,
    b.semester        AS book_semester,
    b.department      AS book_department,
    u.full_name       AS buyer_name,
    u.email           AS buyer_email,
    u.admission_number,
    u.profile_picture,
    u.branch,
    u.semester        AS buyer_semester,
    s.full_name       AS seller_name,
    s.branch          AS seller_department
  FROM books b
  JOIN users u        ON b.buyer_id = u.email
  LEFT JOIN users s   ON b.uploader_id = s.email
  WHERE b.type = 'auction'
    AND b.status = 'library'
    AND b.buyer_id IS NOT NULL
)
ORDER BY book_id;
`
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching pending sales:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});



// New Endpoint: POST /admin/approveSaleForSale
// Approves the sale for a pending buy request: updates buyer_status to 'approved',
// removes other buy requests for the same book, inserts notifications for both buyer and seller,
// and finally removes the book from the books table.
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
    // Note: We're joining the users table (alias u) to get seller details.
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
      "INSERT INTO user_notification ( user_email, notification, notification_generated_time) VALUES ( ?, ?, NOW())",
      [buyer_id,buyerNotification]
    );
    
    // Insert notification for the seller.
    const sellerNotification = `Your book ${book.book_name} is sold out to ${buyer.full_name} for ₹${book.sell_price}`;
    await promiseDb.execute(
      "INSERT INTO user_notification (user_email, notification, notification_generated_time) VALUES ( ?, ?, NOW())",
      [ book.seller_email, sellerNotification]
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
// Add this to your admin routes (e.g., adminRoutes.js)
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

// POST /admin/approveAuctionSale
router.post('/approveAuctionSale', async (req, res) => {
  const { book_id, buyer_id } = req.body;
  if (!book_id || !buyer_id) {
    return res.status(400).json({ error: "Missing book_id or buyer_id" });
  }
  try {
    const promiseDb = db.promise();

    // Retrieve auction book details along with seller info.
    const [bookRows] = await promiseDb.execute(
      "SELECT b.book_name, b.min_bid_price, b.max_bid,b.id,b.buyer_id, b.uploader_id, u.full_name AS seller_name, u.email AS seller_email, b.status FROM books b JOIN users u ON b.uploader_id = u.email WHERE b.id = ?",
      [book_id]
    );
    if (bookRows.length === 0) {
      return res.status(404).json({ error: "Auction book not found" });
    }
    const book = bookRows[0];

    // Ensure the book's status is appropriate for approval (for example, status should be 'library')
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
    const buyerNotification = `Your bid on the book "${book.book_name}" has been approved.`;
    await promiseDb.execute(
      "INSERT INTO user_notification (user_email, notification, notification_generated_time) VALUES (?, ?, NOW())",
      [book.buyer_id, buyerNotification]
    );

    // Insert notification for the seller.
    const sellerNotification = `Your auction for "${book.book_name}" has been sold to ${buyer.full_name}.`;
    await promiseDb.execute(
      "INSERT INTO user_notification (user_email, notification, notification_generated_time) VALUES (?, ?, NOW())",
      [book.seller_email, sellerNotification]
    );

    // (Optional) Remove the book from the books table if you no longer want it listed.
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
// GET /admin/manageFiles - Get existing files from the files table (status 'pending') with uploader info
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
    console.error("Error fetching pending files:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
