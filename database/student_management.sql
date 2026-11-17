-- StudentHub database script
-- Import this file in phpMyAdmin (Import tab) or run it in the SQL tab.

CREATE DATABASE IF NOT EXISTS student_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE student_management;

DROP TABLE IF EXISTS students;

CREATE TABLE students (
  id          INT NOT NULL AUTO_INCREMENT,
  student_id  VARCHAR(20)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(100) NOT NULL,
  phone       VARCHAR(15)  NOT NULL,
  department  VARCHAR(50)  NOT NULL,
  semester    VARCHAR(10)  NOT NULL,
  gender      VARCHAR(20)  NOT NULL,
  dob         DATE         NOT NULL,
  address     TEXT         NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO students (student_id, name, email, phone, department, semester, gender, dob, address) VALUES
('CSE2021001', 'Anjali Menon',    'anjali.menon@example.com',  '9847012345', 'CSE', '5', 'Female', '2003-04-12', 'House 21, Temple Road, Angamaly, Kerala'),
('CSE2021002', 'Rahul Krishnan',  'rahul.krishnan@example.com','9946098765', 'CSE', '5', 'Male',   '2003-08-30', 'Skyline Apartments, Edappally, Kochi'),
('ECE2021001', 'Fathima Nasrin',  'fathima.nasrin@example.com','9539123456', 'ECE', '3', 'Female', '2004-01-18', 'Nasrin Manzil, Aluva, Ernakulam'),
('ECE2021002', 'Arjun Nair',      'arjun.nair@example.com',    '9061234567', 'ECE', '5', 'Male',   '2003-11-05', 'Vrindavan, Thrissur Road, Chalakudy'),
('EEE2022001', 'Sneha Joseph',    'sneha.joseph@example.com',  '9895456789', 'EEE', '3', 'Female', '2004-06-22', 'Kalathil House, Kothamangalam'),
('ME2022001',  'Vishnu Prasad',   'vishnu.prasad@example.com', '9747890123', 'Mechanical', '1', 'Male', '2005-02-09', 'Prasad Nivas, Perumbavoor'),
('IT2021001',  'Meera Varghese',  'meera.varghese@example.com','9388765432', 'IT', '7', 'Female', '2002-12-01', 'Varghese Villa, Muvattupuzha');
