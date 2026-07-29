import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../', 'hlms.db');

console.log('Connecting to database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  
  db.serialize(() => {
    // 1. Delete all leave requests
    db.run("DELETE FROM leave_requests", [], function(err) {
      if (err) console.error('Error deleting leave requests:', err.message);
      else console.log(`Deleted ${this.changes} leave requests.`);
    });

    // 2. Delete all qr_passes
    db.run("DELETE FROM qr_passes", [], function(err) {
      if (err) console.error('Error deleting qr_passes:', err.message);
      else console.log(`Deleted ${this.changes} qr_passes.`);
    });

    // 3. Reset students' leave balances: student1 gets 14/1, others get 15/0
    db.run(`
      UPDATE students 
      SET leave_balance = CASE WHEN user_id = (SELECT id FROM users WHERE email = 'student1@college.edu') THEN 14 ELSE 15 END,
          leaves_used = CASE WHEN user_id = (SELECT id FROM users WHERE email = 'student1@college.edu') THEN 1 ELSE 0 END
    `, [], function(err) {
      if (err) console.error('Error resetting student balance:', err.message);
      else console.log('Reset student leave balance (Student A balance=14 used=1, others balance=15 used=0).');
    });

    // 3b. Seed one past completed leave request & USED QR pass for student1 (Student A)
    db.get("SELECT id FROM users WHERE email = 'student1@college.edu'", [], (err, row) => {
      if (err) {
        console.error('Error fetching student1 user_id:', err.message);
        return;
      }
      if (row) {
        db.run(`
          INSERT INTO leave_requests (
            student_id, leave_type, reason, destination, address, emergency_contact,
            travel_mode, start_date, end_date, expected_return_time, status, current_handler_role, created_at
          ) VALUES (?, 'Personal', 'Weekend visit to parent home.', 'Home', '123 Main Street', '+91 9876543211', 'Bus', '2026-07-28', '2026-07-28', '18:00', 'APPROVED', 'NONE', '2026-07-27 09:00:00')
        `, [row.id], function(err) {
          if (err) {
            console.error('Error seeding past leave request in reset_demo:', err.message);
            return;
          }
          const leaveId = this.lastID;
          db.run(`
            INSERT INTO qr_passes (leave_request_id, pass_id, encrypted_token, status, exit_time, entry_time)
            VALUES (?, 'sample-pass-uuid-1', 'sample-token', 'ACTIVE', NULL, NULL)
          `, [leaveId], function(err) {
            if (err) console.error('Error seeding ACTIVE QR pass in reset_demo:', err.message);
            else console.log('Successfully seeded Student A active approved leave request and ACTIVE QR pass.');
          });
        });
      }
    });

    // 4. Delete all notifications (clean start for new flow)
    db.run("DELETE FROM notifications", [], function(err) {
      if (err) console.error('Error deleting notifications:', err.message);
      else console.log(`Deleted ${this.changes} notifications.`);
    });

    // 5. Delete all audit logs
    db.run("DELETE FROM audit_logs", [], function(err) {
      if (err) console.error('Error deleting audit logs:', err.message);
      else console.log(`Deleted ${this.changes} audit logs.`);
    });
  });

  setTimeout(() => {
    db.close((err) => {
      if (err) console.error('Error closing database:', err.message);
      else console.log('Database connection closed. Reset complete.');
    });
  }, 1000);
});
