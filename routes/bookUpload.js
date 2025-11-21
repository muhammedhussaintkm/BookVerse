const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// Set the upload directory (adjust path as needed)
const uploadDir = path.join(__dirname, '../uploads/book_covers');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('Storing file in:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({ storage });

// POST /uploadBook route
router.post('/uploadBook', upload.single('book_cover'), async (req, res) => {
  try {
    console.log('Received /uploadBook POST request');
    console.log('Request body:', req.body);
    console.log('Uploaded file info:', req.file);
    const { book_name, author, edition, description, condition, semester, department } = req.body;
    
    const uploaderEmail = req.query.email;
    console.log('Uploader email:', uploaderEmail);
    
    // Get the uploaded file's filename (if any)
    const bookCoverFilename = req.file ? req.file.filename : null;
    console.log('Book cover filename to be stored:', bookCoverFilename);

    const query = `
      INSERT INTO books 
      (book_name, author, edition, description, conditions, semester, department, book_cover, uploader_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [book_name, author, edition, description, condition, semester, department, bookCoverFilename, uploaderEmail];
    const [result] = await db.promise().execute(query, values);
    console.log('Insert result:', result);

    res.status(201).json({ message: 'Book uploaded successfully', coverUrl: bookCoverFilename });
  } catch (error) {
    console.error('Error uploading book:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// POST /updateBook route
router.post('/updateBook', upload.single('book_cover'), async (req, res) => {
  try {
    console.log('Received /updateBook POST request');
    console.log('Request body:', req.body);
    console.log('Uploaded file info:', req.file);

    // Extract form fields (ensure your editBook.html includes a hidden input named "id")
    const { id, book_name, author, edition, description, condition, semester, department } = req.body;
    const promiseDb = db.promise();

    // Fetch the current book record to get the existing cover filename
    const [currentRows] = await promiseDb.execute(
      "SELECT book_cover FROM books WHERE id = ?",
      [id]
    );
    let oldCoverFilename = currentRows.length ? currentRows[0].book_cover : null;

    // Get the new cover filename if a file was uploaded
    const newCoverFilename = req.file ? req.file.filename : null;
    console.log('New cover filename:', newCoverFilename);

    // If a new cover was uploaded and there's an old cover, delete the old file
    if (newCoverFilename && oldCoverFilename) {
      const oldFilePath = path.join(uploadDir, oldCoverFilename);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
        console.log('Old cover image deleted:', oldCoverFilename);
      } else {
        console.log('Old cover file does not exist at:', oldFilePath);
      }
    }

    // Build the UPDATE query (update book_cover only if a new file is provided)
    let query = `
      UPDATE books 
      SET book_name = ?, author = ?, edition = ?, description = ?, conditions = ?, semester = ?, department = ?
    `;
    let values = [book_name, author, edition, description, condition, semester, department];

    if (newCoverFilename) {
      query += `, book_cover = ? `;
      values.push(newCoverFilename);
    }
    query += " WHERE id = ?";
    values.push(id);

    console.log('Executing query:\n', query);
    console.log('With values:', values);

    const [result] = await promiseDb.execute(query, values);
    console.log('Update result:', result);

    // … after your UPDATE executes …
res.redirect(
  `/mybookDetails?id=${id}` +
  `&email=${encodeURIComponent(req.query.email)}`
);

  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;

