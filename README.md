# StudentHub – Student Management System

A full-stack web application for managing student records, built for the Augnifyz Technologies internship task.

**Stack:** HTML5 · CSS3 · JavaScript (fetch) · PHP (REST API, PDO) · MySQL · XAMPP

---

## 1. Project overview
StudentHub is an admin dashboard where you can add, view, edit, delete, search and filter student records.
The browser (JavaScript) talks to a PHP REST API, and the API reads and writes a MySQL database.
No student data is hard-coded in the frontend.

## 2. Features
- Dashboard with live statistics (Total, CSE, ECE, selected/current semester)
- Student table with View / Edit / Delete actions
- Add student form with client-side **and** server-side validation
- Student details page with Edit button
- Edit form pre-filled from the database
- Delete with confirmation dialog
- Search by Student ID, name or email (no page reload)
- Filter by department and semester
- Success/error notifications, empty-state message
- Responsive layout (desktop, laptop, tablet, mobile) with a collapsible sidebar
- SQL-injection protection (PDO prepared statements) and XSS protection (output escaping)

## 3. Technologies used
| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3 (no framework), vanilla JavaScript |
| Backend | PHP 8 with PDO, REST-style JSON API |
| Database | MySQL / MariaDB (via XAMPP) |
| Tools | XAMPP, VS Code |

## 4. Folder structure
```
student-management-system/
├── index.html                  (redirects to frontend/index.html)
├── frontend/
│   ├── index.html              Dashboard
│   ├── add-student.html        Add + Edit form (edit mode: ?id=3)
│   ├── student.html            Student details page
│   ├── style.css               All styling
│   └── script.js               All JavaScript (fetch calls, validation, UI)
├── backend/
│   ├── config/database.php     Database credentials + PDO connection
│   └── api/students.php        REST API (GET, POST, PUT, DELETE)
├── database/student_management.sql   Database + table + sample data
└── README.md
```

## 5. Database setup
The script `database/student_management.sql` creates the database `student_management`,
the `students` table, and 7 sample students. See step 6 for how to import it.

## 6. How to run using XAMPP (Windows)
1. **Install XAMPP** from https://www.apachefriends.org (with Apache, MySQL and PHP).
2. **Copy the project folder** `student-management-system` into `C:\xampp\htdocs\`.
   You should have `C:\xampp\htdocs\student-management-system\frontend\index.html`.
3. Open the **XAMPP Control Panel** and click **Start** next to **Apache**.
4. Click **Start** next to **MySQL**. Both should turn green.
5. Open **http://localhost/phpmyadmin** in your browser.
6. Click the **Import** tab → **Choose file** → select
   `C:\xampp\htdocs\student-management-system\database\student_management.sql` → click **Import**.
   (Alternatively: open the **SQL** tab, paste the file contents and click **Go**.)
7. Check that the database `student_management` and table `students` now exist with 7 rows.
8. Default credentials are `root` with an empty password. If yours differ, edit `backend/config/database.php`.

## 7. How to access the website
- **http://localhost/student-management-system/** (redirects to the dashboard)
- or directly: **http://localhost/student-management-system/frontend/index.html**

> Always open the site through `http://localhost/...`. Opening the HTML file by double-clicking it (`file:///...`) will not work because PHP needs Apache.

## 8. API endpoints
Base URL: `http://localhost/student-management-system/backend/api/students.php`

| Method | URL | Purpose | Success code |
|---|---|---|---|
| GET | `students.php` | List all students | 200 |
| GET | `students.php?search=anjali&department=CSE&semester=5` | Search / filter | 200 |
| GET | `students.php?id=1` | Get one student | 200 |
| GET | `students.php?stats=1[&semester=3]` | Dashboard statistics | 200 |
| POST | `students.php` | Add student (JSON body) | 201 |
| PUT | `students.php?id=1` | Update student (JSON body) | 200 |
| DELETE | `students.php?id=1` | Delete student | 200 |

Error codes: `400` bad request, `404` not found, `405` method not allowed,
`409` duplicate Student ID, `422` validation failed, `500` server/database error.

Example POST body:
```json
{
  "student_id": "CSE2024001", "name": "Nithya Raj", "email": "nithya@example.com",
  "phone": "9876543210", "department": "CSE", "semester": "1",
  "gender": "Female", "dob": "2006-03-14", "address": "Rose Villa, Kochi"
}
```
Success: `{ "success": true, "message": "Student added successfully", "id": 8 }`
Error: `{ "success": false, "message": "Student ID already exists" }`

## 9. CRUD functionality
| Operation | UI action | HTTP request | SQL |
|---|---|---|---|
| Create | Add Student form → Save | `POST` | `INSERT INTO students ...` |
| Read (all) | Dashboard loads | `GET` | `SELECT * FROM students ORDER BY id DESC` |
| Read (one) | View button | `GET ?id=` | `SELECT * FROM students WHERE id = ?` |
| Update | Edit button → Update student | `PUT ?id=` | `UPDATE students SET ... WHERE id = ?` |
| Delete | Delete → confirm | `DELETE ?id=` | `DELETE FROM students WHERE id = ?` |

## 10. Testing instructions
Test with the browser, and use Postman or `curl` for the API.

| # | Test | Steps | Expected result |
|---|---|---|---|
| 1 | View students | Open dashboard | 7 sample students in table, cards show counts |
| 2 | Add student | Add Student → fill valid data → Save | Redirects to dashboard, success toast, new row, Total +1 |
| 3 | View details | Click View | All 10 details shown, Edit button present |
| 4 | Update student | Edit → change name → Update student | Success toast, new name in table |
| 5 | Delete student | Delete → confirm | Row removed, success toast, cards update |
| 6 | Cancel delete | Delete → Cancel | Nothing deleted |
| 7 | Search | Type `anjali`, then an ID, then an email | Table narrows without reload |
| 8 | Filter | Choose CSE; then Semester 5 | Only matching rows; semester card follows filter |
| 9 | Empty state | Search `zzzz` | "No students found" message |
| 10 | Invalid email | Enter `abc@` | "Enter a valid email address" |
| 11 | Empty fields | Click Save with empty form | "… is required" under each field |
| 12 | Invalid phone | Enter `12345` | Phone error message |
| 13 | Duplicate ID | Add with Student ID `CSE2021001` | "Student ID already exists" under the field |
| 14 | DB failure | Stop MySQL in XAMPP, reload dashboard | Error toast: "Database connection failed…" (HTTP 500) |
| 15 | Responsive | Resize browser / use device toolbar (F12) | Sidebar collapses behind a menu button; table scrolls sideways |

Quick `curl` checks:
```
curl http://localhost/student-management-system/backend/api/students.php
curl http://localhost/student-management-system/backend/api/students.php?id=1
curl -X DELETE "http://localhost/student-management-system/backend/api/students.php?id=99"   (expect 404)
```

## Troubleshooting
- **"Cannot reach the server"** – Apache is not running, or you opened the file with `file://`.
- **"Database connection failed"** – MySQL is not running, the SQL file was not imported, or the credentials in `backend/config/database.php` are wrong.
- **Port 80 busy (Skype/IIS)** – change Apache's port in XAMPP (Config → httpd.conf → `Listen 8080`) and use `http://localhost:8080/...`.
