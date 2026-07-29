-- Smart Hostel Leave Management System Database Schema

-- Users Table (Stores authentication & general credentials)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  register_number TEXT UNIQUE, -- NULL for faculty & staff
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL, -- STUDENT, CC, HOD, DEAN, WARDEN, GUARD, ADMIN
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Students Table (Stores student academic & hostel attributes)
CREATE TABLE IF NOT EXISTS students (
  user_id INTEGER PRIMARY KEY,
  department TEXT NOT NULL,
  year INTEGER NOT NULL,
  section TEXT NOT NULL,
  semester INTEGER NOT NULL,
  hostel_block TEXT NOT NULL,
  room_number TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  leave_balance INTEGER DEFAULT 15,
  leaves_used INTEGER DEFAULT 0,
  attendance_percentage REAL DEFAULT 85.0,
  initial_attendance_percentage REAL DEFAULT 85.0,
  faculty_advisor TEXT NOT NULL,
  cc_name TEXT NOT NULL,
  hod_name TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Leave Requests Table (Tracks the leave workflow and approval details)
CREATE TABLE IF NOT EXISTS leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  leave_type TEXT NOT NULL, -- Native Visit, Medical, Family Function, Placement, Internship, Emergency, Personal, Other
  reason TEXT NOT NULL,
  destination TEXT NOT NULL,
  address TEXT NOT NULL,
  emergency_contact TEXT NOT NULL,
  travel_mode TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  expected_return_time TEXT NOT NULL,
  documents TEXT, -- JSON array of file paths/names
  status TEXT DEFAULT 'PENDING_CC', -- PENDING_CC, PENDING_HOD, PENDING_DEAN, PENDING_WARDEN, APPROVED, REJECTED, CLARIFICATION
  cc_remarks TEXT,
  cc_approved_at TEXT,
  hod_remarks TEXT,
  hod_approved_at TEXT,
  dean_remarks TEXT,
  dean_approved_at TEXT,
  warden_remarks TEXT,
  warden_approved_at TEXT,
  current_handler_role TEXT DEFAULT 'CC', -- CC, HOD, DEAN, WARDEN, NONE
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Secure QR Passes Table
CREATE TABLE IF NOT EXISTS qr_passes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  leave_request_id INTEGER UNIQUE NOT NULL,
  pass_id TEXT UNIQUE NOT NULL, -- UUID
  encrypted_token TEXT NOT NULL, -- signed validation payload
  status TEXT DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, USED, CANCELLED
  exit_time TEXT,
  entry_time TEXT,
  late_return INTEGER DEFAULT 0, -- 0 or 1
  late_reason TEXT,
  sent_to_guard INTEGER DEFAULT 0, -- 0 = No, 1 = Yes
  sent_to_guard_time TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE CASCADE
);

-- Audit Logs Table (For security monitoring & actions tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_name TEXT,
  user_email TEXT,
  action TEXT NOT NULL, -- LOGIN, LOGOUT, LEAVE_APPLY, LEAVE_APPROVE, LEAVE_REJECT, PASS_SCAN, etc.
  details TEXT,
  ip_address TEXT,
  device TEXT,
  browser TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'INFO', -- INFO, SUCCESS, WARNING, DANGER
  read INTEGER DEFAULT 0, -- 0 = Unread, 1 = Read
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ERP Attendance Table (Simulated ERP Integration)
CREATE TABLE IF NOT EXISTS erp_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Present',
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Attendance Summary Table
CREATE TABLE IF NOT EXISTS attendance_summary (
  student_id INTEGER PRIMARY KEY,
  current_attendance REAL DEFAULT 100.0,
  approved_leave_days INTEGER DEFAULT 0,
  remaining_safe_leave_days INTEGER DEFAULT 11,
  working_days_conducted INTEGER DEFAULT 45,
  conducted_periods INTEGER DEFAULT 405,
  attendance_status TEXT DEFAULT 'Safe',
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);
