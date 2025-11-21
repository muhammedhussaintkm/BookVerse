const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// Set the upload directory for study materials
const uploadDir = path.join(__dirname, '../uploads/study_materials');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created upload directory:', uploadDir);
}

// Configure Multer storage for study materials
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('Storing file in:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename for study material:', filename);
    cb(null, filename);
  }
});
const upload = multer({ storage });

// POST /uploadStudyMaterial route
router.post('/uploadStudyMaterial', upload.single('study_material'), async (req, res) => {
  try {
    console.log('Received /uploadStudyMaterial POST request');
    console.log('Request body:', req.body);
    console.log('Uploaded file info:', req.file);

    // Read the uploader's email from the query parameter
    const uploaderEmail = req.query.email;
    if (!uploaderEmail) {
      console.error("No uploader email provided in the query parameters.");
      return res.status(400).json({ message: 'Uploader email not provided' });
    }
    console.log('Uploader email:', uploaderEmail);

    const { title, description, semester, department } = req.body;
    
    // Get the uploaded file's filename (if any)
    const fileFilename = req.file ? req.file.filename : null;
    console.log('Study material filename to be stored:', fileFilename);
    
    // Prepare the INSERT query
    const query = `
      INSERT INTO files 
      (user_id, title,file_name, file_path, description, semester, department, status)
      VALUES (?,?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Use the original filename (if available) in addition to our stored filename
    const originalName = req.file ? req.file.originalname : null;
    const values = [uploaderEmail,title,originalName, fileFilename, description, semester, department, 'pending'];
    console.log('Executing query:', query);
    console.log('With values:', values);

    // Execute the query
    const [result] = await db.promise().execute(query, values);
    console.log('Insert result:', result);
    
    // Respond with a success message and file information if needed
    res.status(201).json({ message: 'Study material uploaded successfully', fileUrl: fileFilename });
  } catch (error) {
    console.error('Error uploading study material:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
