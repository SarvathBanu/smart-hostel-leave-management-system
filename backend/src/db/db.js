import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = process.env.DATABASE_FILE || 'hlms.db';
const dbPath = path.resolve(__dirname, '../../', dbFile);

console.log(`Connecting to database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initializeDatabase();
  }
});

function initializeDatabase() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Execute schema
  db.exec(schema, (err) => {
    if (err) {
      console.error('Error creating database tables:', err.message);
    } else {
      console.log('Database tables verified/created successfully.');
      // Dynamically add initial_attendance_percentage column if it doesn't exist
      db.run(`ALTER TABLE students ADD COLUMN initial_attendance_percentage REAL`, (alterErrStudent) => {
        if (alterErrStudent && !alterErrStudent.message.includes('duplicate column name')) {
          console.error('Error adding initial_attendance_percentage column:', alterErrStudent.message);
        }
        db.run(`UPDATE students SET initial_attendance_percentage = attendance_percentage WHERE initial_attendance_percentage IS NULL`);
        
        // Dynamically add leave_request_id column if it doesn't exist
        db.run(`ALTER TABLE notifications ADD COLUMN leave_request_id INTEGER`, (alterErr) => {
          if (alterErr && !alterErr.message.includes('duplicate column name')) {
            console.error('Error altering notifications table:', alterErr.message);
          }
          // Dynamically add sent_to_guard column if it doesn't exist
          db.run(`ALTER TABLE qr_passes ADD COLUMN sent_to_guard INTEGER DEFAULT 0`, (alterErr1) => {
            if (alterErr1 && !alterErr1.message.includes('duplicate column name')) {
              console.error('Error adding sent_to_guard column:', alterErr1.message);
            }
            // Dynamically add sent_to_guard_time column if it doesn't exist
            db.run(`ALTER TABLE qr_passes ADD COLUMN sent_to_guard_time TEXT`, (alterErr2) => {
              if (alterErr2 && !alterErr2.message.includes('duplicate column name')) {
                console.error('Error adding sent_to_guard_time column:', alterErr2.message);
              }
              seedData();
            });
          });
        });
      });
    }
  });
}

function seedData() {
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) {
      console.error('Error checking user count:', err.message);
      return;
    }

    if (row.count === 0) {
      console.log('Database is empty. Seeding initial users...');

      const passwordHash = bcrypt.hashSync('password123', 10);
      const studentPasswordHash = bcrypt.hashSync('student123', 10);

      // 1. Create Users
      const usersToInsert = [
        {
          email: 'admin@college.edu',
          register_number: null,
          password_hash: passwordHash,
          role: 'ADMIN',
          name: 'System Administrator',
          phone: '+91 9999999999'
        },
        {
          email: 'student1@college.edu',
          register_number: '22CSE101',
          password_hash: studentPasswordHash,
          role: 'STUDENT',
          name: 'Student A',
          phone: '+91 9876543211'
        },
        {
          email: 'student2@college.edu',
          register_number: '22CSE102',
          password_hash: studentPasswordHash,
          role: 'STUDENT',
          name: 'Student B',
          phone: '+91 9876543212'
        },
        {
          email: 'student3@college.edu',
          register_number: '22CSE103',
          password_hash: studentPasswordHash,
          role: 'STUDENT',
          name: 'Student C',
          phone: '+91 9876543213'
        },
        {
          email: 'student4@college.edu',
          register_number: '22CSE104',
          password_hash: studentPasswordHash,
          role: 'STUDENT',
          name: 'Student D',
          phone: '+91 9876543214'
        },
        {
          email: 'student5@college.edu',
          register_number: '22CSE105',
          password_hash: studentPasswordHash,
          role: 'STUDENT',
          name: 'Student E',
          phone: '+91 9876543215'
        },
        {
          email: 'priya.cc@college.edu',
          register_number: null,
          password_hash: passwordHash,
          role: 'CC',
          name: 'Class Coordinator',
          phone: '+91 8888888888'
        },
        {
          email: 'ramesh.hod@college.edu',
          register_number: null,
          password_hash: passwordHash,
          role: 'HOD',
          name: 'HOD CS',
          phone: '+91 7777777777'
        },
        {
          email: 'dean@college.edu',
          register_number: null,
          password_hash: passwordHash,
          role: 'DEAN',
          name: 'Dean Academics',
          phone: '+91 6666666666'
        },
        {
          email: 'warden@college.edu',
          register_number: null,
          password_hash: passwordHash,
          role: 'WARDEN',
          name: 'Hostel Warden',
          phone: '+91 5555555555'
        },
        {
          email: 'guard@college.edu',
          register_number: null,
          password_hash: passwordHash,
          role: 'GUARD',
          name: 'Security Guard',
          phone: '+91 4444444444'
        }
      ];

      const studentDetailsMap = {
        'student1@college.edu': {
          department: 'Computer Science & Engineering',
          year: 3,
          section: 'A',
          semester: 6,
          hostel_block: 'Emerald Block-A',
          room_number: 'A-301',
          parent_name: 'Parent A',
          parent_phone: '+91 9876543211',
          faculty_advisor: 'Faculty Advisor A',
          cc_name: 'Class Coordinator',
          hod_name: 'HOD CS',
          leave_balance: 14,
          leaves_used: 1,
          attendance_percentage: 85.0
        },
        'student2@college.edu': {
          department: 'Electronics & Communication Engineering',
          year: 3,
          section: 'B',
          semester: 6,
          hostel_block: 'Ruby Block-B',
          room_number: 'B-102',
          parent_name: 'Parent B',
          parent_phone: '+91 9876543212',
          faculty_advisor: 'Faculty Advisor B',
          cc_name: 'Class Coordinator',
          hod_name: 'HOD CS',
          leave_balance: 15,
          leaves_used: 0,
          attendance_percentage: 89.2
        },
        'student3@college.edu': {
          department: 'Mechanical Engineering',
          year: 3,
          section: 'A',
          semester: 6,
          hostel_block: 'Diamond Block-C',
          room_number: 'C-204',
          parent_name: 'Parent C',
          parent_phone: '+91 9876543213',
          faculty_advisor: 'Faculty Advisor C',
          cc_name: 'Class Coordinator',
          hod_name: 'HOD CS',
          leave_balance: 15,
          leaves_used: 0,
          attendance_percentage: 78.5
        },
        'student4@college.edu': {
          department: 'Information Technology',
          year: 3,
          section: 'C',
          semester: 6,
          hostel_block: 'Emerald Block-A',
          room_number: 'A-405',
          parent_name: 'Parent D',
          parent_phone: '+91 9876543214',
          faculty_advisor: 'Faculty Advisor D',
          cc_name: 'Class Coordinator',
          hod_name: 'HOD CS',
          leave_balance: 15,
          leaves_used: 0,
          attendance_percentage: 92.0
        },
        'student5@college.edu': {
          department: 'Civil Engineering',
          year: 3,
          section: 'B',
          semester: 6,
          hostel_block: 'Ruby Block-B',
          room_number: 'B-308',
          parent_name: 'Parent E',
          parent_phone: '+91 9876543215',
          faculty_advisor: 'Faculty Advisor E',
          cc_name: 'Class Coordinator',
          hod_name: 'HOD CS',
          leave_balance: 15,
          leaves_used: 0,
          attendance_percentage: 81.4
        }
      };

      const insertUser = db.prepare(`
        INSERT INTO users (email, register_number, password_hash, role, name, phone)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      usersToInsert.forEach((u) => {
        insertUser.run([u.email, u.register_number, u.password_hash, u.role, u.name, u.phone], function (err) {
          if (err) {
            console.error(`Error inserting user ${u.name}:`, err.message);
            return;
          }

          const userId = this.lastID;

          // If this is a student, insert student details
          if (u.role === 'STUDENT') {
            const det = studentDetailsMap[u.email];
            db.run(`
              INSERT INTO students (user_id, department, year, section, semester, hostel_block, room_number, parent_name, parent_phone, faculty_advisor, cc_name, hod_name, leave_balance, leaves_used, attendance_percentage, initial_attendance_percentage)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              userId, det.department, det.year, det.section, det.semester, det.hostel_block, det.room_number,
              det.parent_name, det.parent_phone, det.faculty_advisor, det.cc_name, det.hod_name,
              det.leave_balance, det.leaves_used, det.attendance_percentage, det.attendance_percentage
            ], (err) => {
              if (err) {
                console.error(`Error inserting student attributes for ${u.name}:`, err.message);
              } else {
                console.log(`Seeded student attributes for ${u.name} successfully.`);
                // Insert default ERP attendance record
                db.run(`
                  INSERT OR IGNORE INTO erp_attendance (student_id, status)
                  VALUES (?, 'Present')
                `, [userId]);

                if (u.email === 'student1@college.edu') {
                  // Seed exactly one active approved leave request
                  db.run(`
                    INSERT INTO leave_requests (
                      student_id, leave_type, reason, destination, address, emergency_contact,
                      travel_mode, start_date, end_date, expected_return_time, status, current_handler_role, created_at
                    ) VALUES (?, 'Personal', 'Weekend visit to parent home.', 'Home', '123 Main Street', '+91 9876543211', 'Bus', '2026-07-28', '2026-07-28', '18:00', 'APPROVED', 'NONE', '2026-07-27 09:00:00')
                  `, [userId], function(leaveErr) {
                    if (!leaveErr) {
                      const leaveId = this.lastID;
                      // Seed an ACTIVE QR pass for this approved leave
                      db.run(`
                        INSERT INTO qr_passes (leave_request_id, pass_id, encrypted_token, status, exit_time, entry_time)
                        VALUES (?, 'sample-pass-uuid-1', 'sample-token', 'ACTIVE', NULL, NULL)
                      `, [leaveId]);
                    }
                  });
                }
              }
            });
          }
        });
      });

      insertUser.finalize();
      console.log('User accounts seeded. Student passwords: student123, Staff passwords: password123');
      
      // Seed default attendance summaries for seeded students
      db.run(`
        INSERT OR IGNORE INTO attendance_summary (student_id, current_attendance, approved_leave_days, remaining_safe_leave_days, working_days_conducted, conducted_periods, attendance_status)
        SELECT id, 100.0, 0, 11, 45, 405, 'Safe' FROM users WHERE role = 'STUDENT'
      `);
    } else {
      console.log('Users table already contains data. Seeding skipped.');
      // Make sure erp_attendance is populated for existing students
      db.run(`
        INSERT OR IGNORE INTO erp_attendance (student_id, status)
        SELECT id, 'Present' FROM users WHERE role = 'STUDENT'
      `);
      // Make sure attendance_summary is populated for existing students
      db.run(`
        INSERT OR IGNORE INTO attendance_summary (student_id, current_attendance, approved_leave_days, remaining_safe_leave_days, working_days_conducted, conducted_periods, attendance_status)
        SELECT id, 100.0, 0, 11, 45, 405, 'Safe' FROM users WHERE role = 'STUDENT'
      `);
    }

  });
}

// Wrapper utility for SQL operations with Promises
export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const queryOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export default db;
