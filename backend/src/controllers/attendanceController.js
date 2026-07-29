import { query, queryOne, run } from '../db/db.js';

export const COLLEGE_CONFIG = {
  workingDaysPerWeek: 5,
  periodsPerDay: 9,
  minAttendanceRequired: 75.0,
  defaultWorkingDaysConducted: 45
};

function getDaysCount(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
  
  let count = 0;
  let cur = new Date(start);
  while (cur <= end) {
    const dayOfWeek = cur.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function updateStudentAttendanceSummary(studentId) {
  try {
    // 1. Get or create attendance summary
    let summary = await queryOne(`SELECT * FROM attendance_summary WHERE student_id = ?`, [studentId]);
    if (!summary) {
      await run(`
        INSERT OR IGNORE INTO attendance_summary (student_id, current_attendance, approved_leave_days, remaining_safe_leave_days, working_days_conducted, conducted_periods, attendance_status)
        VALUES (?, 100.0, 0, ?, ?, ?, 'Safe')
      `, [
        studentId, 
        Math.floor(0.25 * COLLEGE_CONFIG.defaultWorkingDaysConducted), 
        COLLEGE_CONFIG.defaultWorkingDaysConducted, 
        COLLEGE_CONFIG.defaultWorkingDaysConducted * COLLEGE_CONFIG.periodsPerDay
      ]);
      summary = await queryOne(`SELECT * FROM attendance_summary WHERE student_id = ?`, [studentId]);
    }

    // Fetch student's initial attendance
    const student = await queryOne(`SELECT initial_attendance_percentage FROM students WHERE user_id = ?`, [studentId]);
    const initialAttendance = student ? (student.initial_attendance_percentage ?? 100.0) : 100.0;

    const workingDays = summary.working_days_conducted;
    const conductedPeriods = workingDays * COLLEGE_CONFIG.periodsPerDay;

    // 2. Sum approved leave days (status IN ('APPROVED', 'CHECKED_OUT'))
    const leaves = await query(`
      SELECT start_date, end_date FROM leave_requests
      WHERE student_id = ? AND status IN ('APPROVED', 'CHECKED_OUT')
    `, [studentId]);

    let approvedLeaveDays = 0;
    leaves.forEach(l => {
      approvedLeaveDays += getDaysCount(l.start_date, l.end_date);
    });

    const missedPeriods = approvedLeaveDays * COLLEGE_CONFIG.periodsPerDay;
    
    let attendancePercentage = initialAttendance;
    if (conductedPeriods > 0) {
      const leaveMissedPercentage = (missedPeriods / conductedPeriods) * 100;
      attendancePercentage = parseFloat(Math.max(0, initialAttendance - leaveMissedPercentage).toFixed(2));
    }

    const remainingSafeLeaveDays = Math.max(
      0,
      Math.floor(((attendancePercentage - 75.0) * conductedPeriods) / 900)
    );

    let status = 'Safe';
    if (attendancePercentage < COLLEGE_CONFIG.minAttendanceRequired) {
      status = 'Critical';
    } else if (attendancePercentage < 80.0) {
      status = 'Warning';
    }

    // 3. Update summary
    await run(`
      UPDATE attendance_summary
      SET current_attendance = ?,
          approved_leave_days = ?,
          remaining_safe_leave_days = ?,
          attendance_status = ?,
          last_updated = CURRENT_TIMESTAMP
      WHERE student_id = ?
    `, [attendancePercentage, approvedLeaveDays, remainingSafeLeaveDays, status, studentId]);

    // 4. Synchronize to students table
    await run(`
      UPDATE students
      SET attendance_percentage = ?,
          leaves_used = ?
      WHERE user_id = ?
    `, [attendancePercentage, approvedLeaveDays, studentId]);

    return {
      attendancePercentage,
      approvedLeaveDays,
      remainingSafeLeaveDays,
      status
    };

  } catch (err) {
    console.error(`Error updating student attendance summary for ID ${studentId}:`, err);
    throw err;
  }
}

export async function getAttendance(req, res) {
  try {
    const list = await query(`
      SELECT a.id, a.student_id, u.name as student_name, u.register_number, 
             s.department, a.status, a.last_updated,
             att.current_attendance, att.approved_leave_days, att.remaining_safe_leave_days, att.attendance_status
      FROM erp_attendance a
      JOIN users u ON a.student_id = u.id
      JOIN students s ON a.student_id = s.user_id
      LEFT JOIN attendance_summary att ON a.student_id = att.student_id
      ORDER BY u.name ASC
    `);
    res.json(list);
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ message: 'Error retrieving ERP attendance records.' });
  }
}
