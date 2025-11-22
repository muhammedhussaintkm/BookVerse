

---

# **BookVerse – Second-Hand Academic Book Marketplace**

BookVerse is a platform designed for students to **buy, sell, and bid on second-hand academic books**.
It works like OLX but focused entirely on **academic books & study materials**.

This project includes:

* **Backend (Node.js + Express + MySQL)**
* **Planned Frontend**
* **Planned Mobile App (Android)**

---

## 🚀 **Features**

### **👤 User Features**

* Secure authentication (bcrypt + MySQL)
* Profile management (except admission number & email)
* Add books for sale (admin approval required)
* Bidding system (place, accept, reject bids)
* Buy books after bid acceptance
* Manage uploaded books (stop bidding / delete)
* Search and filter books:

  * by name
  * department
  * semester
  * author
  * topic
* Upload & download free notes/documents (admin approval needed)

---

### **🛠 Admin Features**

* Admin registration/login (approved by superadmin)
* Approve/reject books before listing
* Manage users (update info, reset email/password)
* Remove inappropriate listings
* Approve/reject uploaded academic materials

---

### **👑 Superadmin Features**

* Complete control over the platform
* Approve/reject admin registrations
* Monitor admin activity
* Dashboard analytics:

  * User stats
  * Admin stats
  * Book reports

---

## 📦 **Tech Stack**

**Backend:** Node.js, Express
**Database:** MySQL
**Auth:** JWT, bcrypt
**Email:** Nodemailer (Gmail SMTP)
**Frontend:** (To be added)
**Mobile App:** Android (Planned)

---

## ⚙️ **Environment Variables**

Create a `.env` file:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=BookStoreDB

PORT=3002

EMAIL_USER=your_email
EMAIL_PASS=your_app_password

JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:3004
```

---

## 🗄 Database Setup

1. Install MySQL
2. Create database by pasting the given Queries:

```
-- Bookverse schema (corrected: straight quotes, avoided reserved word `type`)
CREATE DATABASE IF NOT EXISTS bookstoredb;
USE bookstoredb;

CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `full_name` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `resetToken` VARCHAR(255),
  `resetTokenExpiry` BIGINT,
  `admin_status` ENUM('pending','active','inactive') DEFAULT 'pending',
  `role` ENUM('superadmin','admin') DEFAULT 'admin',
  `department` VARCHAR(255),
  `profile` VARCHAR(255),
  `phone` VARCHAR(15)
);

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `branch` VARCHAR(50) NOT NULL,
  `semester` INT NOT NULL,
  `resetToken` VARCHAR(255),
  `resetTokenExpiration` DATETIME,
  `phone` VARCHAR(15) NOT NULL,
  `admission_number` VARCHAR(255) NOT NULL UNIQUE,
  `full_name` VARCHAR(255) NOT NULL,
  `profile_picture` VARCHAR(255),
  `user_status` ENUM('active','inactive') DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS `books` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uploader_id` VARCHAR(255),
  `buyer_id` VARCHAR(255),
  `confirm_buyer_id` VARCHAR(255),
  `book_name` VARCHAR(255) NOT NULL,
  `author` VARCHAR(255),
  `edition` VARCHAR(255),
  `description` TEXT,
  `sell_price` DECIMAL(10,2),
  `min_bid_price` DECIMAL(10,2),
  `bid_period` VARCHAR(50),
  `price` DECIMAL(10,2),
  `conditions` ENUM('new','good','fair','poor') NOT NULL,
  `semester` VARCHAR(50),
  `department` VARCHAR(50),
  `book_cover` VARCHAR(255),
  `status` ENUM('sell_pending','auction_pending','enabled','disabled','sell_approved','auction_approved','library') DEFAULT 'library',
  `book_type` ENUM('sale','auction','library') DEFAULT 'library',
  `bid_start` DECIMAL(10,2),
  `bid_end` BIGINT,
  `max_bid` DECIMAL(10,2),
  `bid_status` ENUM('open','closed') DEFAULT 'open',
  `sale_status` ENUM('open','closed') DEFAULT 'open',
  `sell_status` ENUM('open','closed') DEFAULT 'open',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `buyer_status` ENUM('approved','pending'),
  `approved_admin` VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS `buy_requests` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `book_id` INT NOT NULL,
  `buyer_id` VARCHAR(100) NOT NULL,
  `buyer_status` ENUM('pending','approved') DEFAULT 'pending',
  FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `user_notification` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_email` VARCHAR(100) NOT NULL,
  `notification` TEXT NOT NULL,
  `notification_generated_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `files` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(255),
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `semester` ENUM('1','2','3','4','5','6','7','8','Any semester') DEFAULT 'Any semester',
  `department` ENUM('EEE','CSE','ECE','CE','Any department') DEFAULT 'Any department',
  `status` ENUM('pending','approved','rejected') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `file_new_name` VARCHAR(255),
  `title` VARCHAR(100)
);

```



---

## ▶️ How to Run the Backend

### **1. Install dependencies**

```
npm install
```

If “bcryptjs” is missing, install it manually:

```
npm install bcryptjs
```

### **2. Start the server**

```
npm start
```

### or (development mode with auto-reload)

```
nodemon server.js
```

Server runs on:

👉 **[http://localhost:3002](http://localhost:3002)**

---

## 📁 Project Structure

```
project2024/
│── controllers/
│── models/
│── routes/
│── uploads/
│── .env
│── server.js
│── package.json
└── README.md
```

---

## 🌐 API Endpoints (short overview)

### **Auth**

* POST `/register`
* POST `/login`

### **Books**

* POST `/books/add`
* GET  `/books/all`
* PATCH `/books/update/:id`
* DELETE `/books/delete/:id`

### **Bidding**

* POST `/bid/place`
* POST `/bid/accept`
* POST `/bid/reject`

(Full list is in the code)

---

## 📌 Important Notes

* Do **NOT** upload `.env` or `uploads/` folder to GitHub.
* Use `.gitignore` to hide sensitive files.
* Emails require **Gmail App Password** (not normal password).

---

## 🤝 Contributing

Pull requests are welcome!
Open an issue to report bugs or request features.

---

## 📜 License

MIT License – Free to use, modify, and distribute.

---
