import { query, queryOne, run } from '../db/db.js';
import { logAction } from '../utils/logger.js';

// 1. Get Dashboard Analytics & Charts Data
export async function getAnalytics(req, res) {
  try {
    // Total numbers
    const totalRequests = await queryOne(`SELECT COUNT(*) as count FROM leave_requests`);
    const approvedRequests = await queryOne(`SELECT COUNT(*) as count FROM leave_requests WHERE status = 'APPROVED'`);
    const rejectedRequests = await queryOne(`SELECT COUNT(*) as count FROM leave_requests WHERE status = 'REJECTED'`);
    const pendingRequests = await queryOne(`SELECT COUNT(*) as count FROM leave_requests WHERE status LIKE 'PENDING%'`);

    // Department-wise distribution
    const deptWise = await query(`
      SELECT s.department, COUNT(*) as count 
      FROM leave_requests lr
      JOIN students s ON lr.student_id = s.user_id
      GROUP BY s.department
    `);

    // Hostel-wise distribution
    const hostelWise = await query(`
      SELECT s.hostel_block as hostel, COUNT(*) as count 
      FROM leave_requests lr
      JOIN students s ON lr.student_id = s.user_id
      GROUP BY s.hostel_block
    `);

    // Daily request trends (last 7 days)
    const dailyTrends = await query(`
      SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count
      FROM leave_requests
      GROUP BY date
      ORDER BY date DESC
      LIMIT 7
    `);

    // Common leave reasons
    const commonReasons = await query(`
      SELECT leave_type, COUNT(*) as count
      FROM leave_requests
      GROUP BY leave_type
      ORDER BY count DESC
    `);

    // Students with highest leave counts
    const topStudents = await query(`
      SELECT u.name, u.register_number, s.leaves_used
      FROM students s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.leaves_used DESC
      LIMIT 5
    `);

    // Late returns count
    const lateReturns = await queryOne(`
      SELECT COUNT(*) as count FROM qr_passes WHERE late_return = 1
    `);

    res.json({
      summary: {
        total: totalRequests.count,
        approved: approvedRequests.count,
        rejected: rejectedRequests.count,
        pending: pendingRequests.count,
        lateReturns: lateReturns.count
      },
      deptWise,
      hostelWise,
      dailyTrends: dailyTrends.reverse(),
      commonReasons,
      topStudents
    });
  } catch (err) {
    console.error('Analytics fetch error:', err);
    res.status(500).json({ message: 'Error retrieving analytics data.' });
  }
}

// 2. Fetch system users
export async function getUsers(req, res) {
  try {
    const users = await query(`
      SELECT u.id, u.email, u.register_number, u.role, u.name, u.phone,
             s.department, s.year, s.section, s.hostel_block, s.room_number, s.leave_balance
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      ORDER BY u.role, u.name
    `);
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Error retrieving users list.' });
  }
}

// 3. Fetch audit logs
export async function getAuditLogs(req, res) {
  try {
    const logs = await query(`
      SELECT * FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT 150
    `);
    res.json(logs);
  } catch (err) {
    console.error('Get audit logs error:', err);
    res.status(500).json({ message: 'Error retrieving audit logs.' });
  }
}

// 4. Update system settings (leave limits, rules)
export async function updateSystemSettings(req, res) {
  const { defaultLeaveLimit } = req.body;
  const adminId = req.user.id;

  if (!defaultLeaveLimit) {
    return res.status(400).json({ message: 'Leave limit parameter is required.' });
  }

  try {
    // Reset all student balance to default limit
    await run(`UPDATE students SET leave_balance = ?`, [defaultLeaveLimit]);

    await logAction({
      userId: adminId,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'ADMIN_SETTINGS_UPDATE',
      details: `Default leave limit reset to ${defaultLeaveLimit} for all students.`,
      req
    });

    res.json({ message: `Leave limit updated to ${defaultLeaveLimit} days for all students.` });
  } catch (err) {
    console.error('Update system settings error:', err);
    res.status(500).json({ message: 'Error updating system settings.' });
  }
}

export async function resetSemester(req, res) {
  const adminId = req.user.id;

  try {
    // Delete all gate passes
    await run(`DELETE FROM qr_passes`);
    // Delete all leave requests
    await run(`DELETE FROM leave_requests`);

    // Reset students balance, used leaves, and initial attendance percentage
    await run(`
      UPDATE students 
      SET leave_balance = 15, 
          leaves_used = 0, 
          attendance_percentage = 100.0
    `);

    // Reset attendance_summary metrics for all students
    await run(`
      UPDATE attendance_summary
      SET current_attendance = 100.0,
          approved_leave_days = 0,
          remaining_safe_leave_days = 11,
          working_days_conducted = 45,
          conducted_periods = 405,
          attendance_status = 'Safe',
          last_updated = CURRENT_TIMESTAMP
    `);

    // Update erp_attendance status back to 'Present' for all students
    await run(`
      UPDATE erp_attendance
      SET status = 'Present',
          last_updated = CURRENT_TIMESTAMP
    `);

    await logAction({
      userId: adminId,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'ADMIN_SEMESTER_RESET',
      details: 'Admin performed a complete semester reset, resetting all student balances, attendance summaries, and clearing leave request history.',
      req
    });

    res.json({ message: 'Semester reset completed successfully. All attendance logs, leave histories, and student balances have been reset.' });
  } catch (err) {
    console.error('Reset semester error:', err);
    res.status(500).json({ message: 'Error performing semester reset.' });
  }
}

export async function resetIndividualStudent(req, res) {
  const adminId = req.user.id;
  const { studentId } = req.body;

  if (!studentId) {
    return res.status(400).json({ message: 'Student ID is required.' });
  }

  try {
    const studentUser = await queryOne(`SELECT u.email, u.name, s.initial_attendance_percentage FROM users u JOIN students s ON u.id = s.user_id WHERE u.id = ? AND u.role = 'STUDENT'`, [studentId]);
    if (!studentUser) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // 1. Delete all QR passes for this student
    await run(`
      DELETE FROM qr_passes 
      WHERE leave_request_id IN (
        SELECT id FROM leave_requests WHERE student_id = ?
      )
    `, [studentId]);

    // 2. Delete ALL leave requests for this student (pending, approved, rejected, completed)
    await run(`DELETE FROM leave_requests WHERE student_id = ?`, [studentId]);

    // 3. Clear notifications
    await run(`DELETE FROM notifications WHERE user_id = ?`, [studentId]);

    // 4. Restore demo attendance
    let initialAtt = studentUser.initial_attendance_percentage;
    if (initialAtt === null || initialAtt === undefined) {
      if (studentUser.email === 'student1@college.edu') initialAtt = 85.0;
      else if (studentUser.email === 'student2@college.edu') initialAtt = 89.2;
      else if (studentUser.email === 'student3@college.edu') initialAtt = 78.5;
      else if (studentUser.email === 'student4@college.edu') initialAtt = 92.0;
      else if (studentUser.email === 'student5@college.edu') initialAtt = 81.4;
      else initialAtt = 100.0;
    }

    const leaveBalance = (studentUser.email === 'student1@college.edu') ? 14 : 15;
    const leavesUsed = (studentUser.email === 'student1@college.edu') ? 1 : 0;

    await run(`
      UPDATE students
      SET leave_balance = ?,
          leaves_used = ?,
          attendance_percentage = ?,
          initial_attendance_percentage = ?
      WHERE user_id = ?
    `, [leaveBalance, leavesUsed, initialAtt, initialAtt, studentId]);

    if (studentUser.email === 'student1@college.edu') {
      const leaveResult = await run(`
        INSERT INTO leave_requests (
          student_id, leave_type, reason, destination, address, emergency_contact,
          travel_mode, start_date, end_date, expected_return_time, status, current_handler_role, created_at
        ) VALUES (?, 'Personal', 'Weekend visit to parent home.', 'Home', '123 Main Street', '+91 9876543211', 'Bus', '2026-07-10', '2026-07-11', '18:00', 'COMPLETED', 'NONE', '2026-07-10 09:00:00')
      `, [studentId]);

      await run(`
        INSERT INTO qr_passes (leave_request_id, pass_id, encrypted_token, status, exit_time, entry_time)
        VALUES (?, 'sample-pass-uuid-1', 'sample-token', 'USED', '2026-07-10 17:00:00', '2026-07-11 17:30:00')
      `, [leaveResult.lastID]);
    }

    const conductedPeriods = 405;
    const remainingSafeLeaveDays = Math.max(
      0,
      Math.floor((((initialAtt - 75.0) * conductedPeriods) / 900))
    );

    let riskStatus = 'Safe';
    if (initialAtt < 75.0) riskStatus = 'Critical';
    else if (initialAtt < 80.0) riskStatus = 'Warning';

    await run(`
      INSERT OR REPLACE INTO attendance_summary (student_id, current_attendance, approved_leave_days, remaining_safe_leave_days, working_days_conducted, conducted_periods, attendance_status, last_updated)
      VALUES (?, ?, 1, ?, 45, 405, ?, CURRENT_TIMESTAMP)
    `, [studentId, initialAtt, remainingSafeLeaveDays, riskStatus]);

    // 5. Restore ERP status to Present
    await run(`
      INSERT OR REPLACE INTO erp_attendance (student_id, status, last_updated)
      VALUES (?, 'Present', CURRENT_TIMESTAMP)
    `, [studentId]);

    await logAction({
      userId: adminId,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'ADMIN_DEMO_RESET_STUDENT',
      details: `Admin reset demo data for student ${studentUser.name} (${studentUser.email}).`,
      req
    });

    res.json({ message: `Demo data for student ${studentUser.name} has been successfully reset.` });
  } catch (err) {
    console.error('Reset student demo data error:', err);
    res.status(500).json({ message: 'Error resetting student demo data.' });
  }
}

export async function resetAllDemoData(req, res) {
  const adminId = req.user.id;
  try {
    // 1. Delete all notifications
    await run(`DELETE FROM notifications`);
    // 2. Delete all qr_passes
    await run(`DELETE FROM qr_passes`);
    // 3. Delete all leave requests
    await run(`DELETE FROM leave_requests`);
    // 4. Delete all audit logs
    await run(`DELETE FROM audit_logs`);

    // 5. Restore each student to their initial demo data state
    const studentsList = await query(`SELECT user_id, email FROM users JOIN students ON users.id = students.user_id WHERE role = 'STUDENT'`);
    
    for (const s of studentsList) {
      let initialAtt = 100.0;
      if (s.email === 'student1@college.edu') initialAtt = 85.0;
      else if (s.email === 'student2@college.edu') initialAtt = 89.2;
      else if (s.email === 'student3@college.edu') initialAtt = 78.5;
      else if (s.email === 'student4@college.edu') initialAtt = 92.0;
      else if (s.email === 'student5@college.edu') initialAtt = 81.4;

      const leaveBalance = (s.email === 'student1@college.edu') ? 14 : 15;
      const leavesUsed = (s.email === 'student1@college.edu') ? 1 : 0;

      await run(`
        UPDATE students
        SET leave_balance = ?,
            leaves_used = ?,
            attendance_percentage = ?,
            initial_attendance_percentage = ?
        WHERE user_id = ?
      `, [leaveBalance, leavesUsed, initialAtt, initialAtt, s.user_id]);

      if (s.email === 'student1@college.edu') {
        const leaveResult = await run(`
          INSERT INTO leave_requests (
            student_id, leave_type, reason, destination, address, emergency_contact,
            travel_mode, start_date, end_date, expected_return_time, status, current_handler_role, created_at
          ) VALUES (?, 'Personal', 'Weekend visit to parent home.', 'Home', '123 Main Street', '+91 9876543211', 'Bus', '2026-07-28', '2026-07-28', '18:00', 'APPROVED', 'NONE', '2026-07-27 09:00:00')
        `, [s.user_id]);

        await run(`
          INSERT INTO qr_passes (leave_request_id, pass_id, encrypted_token, status, exit_time, entry_time)
          VALUES (?, 'sample-pass-uuid-1', 'sample-token', 'ACTIVE', NULL, NULL)
        `, [leaveResult.lastID]);
      }

      const conductedPeriods = 405;
      const remainingSafeLeaveDays = Math.max(
        0,
        Math.floor((((initialAtt - 75.0) * conductedPeriods) / 900))
      );

      let riskStatus = 'Safe';
      if (initialAtt < 75.0) riskStatus = 'Critical';
      else if (initialAtt < 80.0) riskStatus = 'Warning';

      await run(`
        INSERT OR REPLACE INTO attendance_summary (student_id, current_attendance, approved_leave_days, remaining_safe_leave_days, working_days_conducted, conducted_periods, attendance_status, last_updated)
        VALUES (?, ?, ?, ?, 45, 405, ?, CURRENT_TIMESTAMP)
      `, [s.user_id, initialAtt, leavesUsed, remainingSafeLeaveDays, riskStatus]);

      await run(`
        INSERT OR REPLACE INTO erp_attendance (student_id, status, last_updated)
        VALUES (?, 'Present', CURRENT_TIMESTAMP)
      `, [s.user_id]);
    }

    await logAction({
      userId: adminId,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'ADMIN_DEMO_RESET_ALL',
      details: 'Admin performed a complete reset of all sample accounts and demo data.',
      req
    });

    res.json({ message: 'All demo data has been successfully restored to its original state.' });
  } catch (err) {
    console.error('Reset all demo data error:', err);
    res.status(555).json({ message: 'Error resetting all demo data.' });
  }
}
