📌 Barangay / Lupon Management System

A web-based Barangay/Lupon management system built using PHP, MySQL, HTML, CSS, and JavaScript.
This system is designed to run locally using XAMPP.


⚙️ Features
Case / Complaint Management
Admin Dashboard
Document Generation (Reports, Forms, Certificates)
File-based Record Handling (Mov’s / Attachments)
Printable Documents (Browser Print Support)
Notification System (if applicable)

🛠️ Technologies Used
PHP (Core Backend)
MySQL (Database)
HTML / CSS / JavaScript
XAMPP (Local Server Environment)

📂 Project Setup / Installation
1. Clone or Download Project

Place the project folder inside:htdocs/

2. Start XAMPP
Start Apache
Start MySQL
3. Import Database
Open phpMyAdmin
Create a database (e.g. lupon_db)
Import the .sql file located in the project folder
4. Configure Database Connection

Edit database config file:

/config/db.php (or your actual path)

Update:

host
username
password
database name
5. Run the System

Open browser:

http://localhost/your_project_folder

📁 Project Structure
/project-folder
│
├── /assets
├── /config
├── /modules
├── /views
├── /database
├── index.php
└── README.md

👤 Login
Default credentials depend on database setup.
Please check the users table in the database.

⚠️ Notes
This system runs locally using XAMPP
Make sure Apache and MySQL are running
Ensure database is properly imported before using the system
Keep file structure intact to avoid errors

🧑‍💻 Author
Developed for educational and local system use.

📜 License
For academic / non-commercial use only.
