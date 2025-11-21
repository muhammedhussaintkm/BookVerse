const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Use your MySQL username
    password: '@Abcdefgh123', // Use your MySQL password
    database: 'BookStoreDB' // Change to your database name
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
    } else {
        console.log('Connected to MySQL database.');
    }
});

module.exports = db;
