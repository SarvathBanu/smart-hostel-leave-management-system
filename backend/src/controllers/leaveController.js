import { query, queryOne, run } from '../db/db.js';
import { logAction } from '../utils/logger.js';
import { generateSignedQRToken } from '../utils/qrCrypto.js';
import { updateStudentAttendanceSummary } from './attendanceController.js';
import crypto from 'crypto';

// Helper to calculate days between dates (working days only)
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

// 1. Apply Leave
export async function applyLeave(req, res) {
  const studentId = req.user.id;
  const {
    leaveType,
    reason,
    destination,
    address,
    emergencyContact,
    travelMode,
    startDate,
    endDate,
    expectedReturnTime,
    documents
  } = req.body;

  if (!leaveType || !reason || !destination || !address || !emergencyContact || !travelMode || !startDate || !endDate || !expectedReturnTime) {
    return res.status(400).json({ message: 'All leave details are required.' });
  }

  try {
    // Check if start date is in the past
    const today = new Date().toISOString().split('T')[0];
    if (startDate < today) {
      return res.status(400).json({ message: 'Cannot apply for past dates.' });
    }

    // Check if end date is before start date
    if (endDate < startDate) {
      return res.status(400).json({ message: 'End date cannot be before start date.' });
    }

    // Check if student details exist
    const student = await queryOne(`SELECT * FROM students WHERE user_id = ?`, [studentId]);
    if (!student) {
      return res.status(400).json({ message: 'Student academic records not found.' });
    }

    // Rule: Cannot apply if another leave is pending or active (PENDING_CC, PENDING_HOD, PENDING_DEAN, PENDING_WARDEN, CLARIFICATION, APPROVED, CHECKED_OUT)
    const activeLeaves = await query(`
      SELECT id FROM leave_requests 
      WHERE student_id = ? AND status NOT IN ('COMPLETED', 'REJECTED')
    `, [studentId]);

    if (activeLeaves.length > 0) {
      return res.status(400).json({ message: 'Cannot apply. You already have a pending or active leave request.' });
    }

    const leaveDays = getDaysCount(startDate, endDate);

    // Rule: Warn if leave balance is exceeded
    if (student.leave_balance < leaveDays) {
      return res.status(400).json({ message: `Insufficient leave balance. Requested: ${leaveDays} days, Available: ${student.leave_balance} days.` });
    }

    // Fetch student's attendance summary
    let summary = await queryOne(`SELECT * FROM attendance_summary WHERE student_id = ?`, [studentId]);
    const initialAttendance = student.initial_attendance_percentage ?? 100.0;
    
    if (!summary) {
      summary = {
        working_days_conducted: 45,
        approved_leave_days: 0,
        current_attendance: initialAttendance
      };
    }

    const workingDays = summary.working_days_conducted;
    const conductedPeriods = workingDays * 9;

    // Sum approved leave days directly from database for accuracy (only APPROVED/CHECKED_OUT)
    const leaves = await query(`
      SELECT start_date, end_date FROM leave_requests
      WHERE student_id = ? AND status IN ('APPROVED', 'CHECKED_OUT')
    `, [studentId]);

    let previousApprovedLeaveDays = 0;
    leaves.forEach(l => {
      previousApprovedLeaveDays += getDaysCount(l.start_date, l.end_date);
    });

    const currentRequestedLeaveDays = leaveDays;
    const totalLeaveDays = previousApprovedLeaveDays + currentRequestedLeaveDays;
    const missedPeriods = totalLeaveDays * 9;
    
    let predictedAttendance = initialAttendance;
    if (conductedPeriods > 0) {
      const leaveMissedPercentage = (missedPeriods / conductedPeriods) * 100;
      predictedAttendance = parseFloat(Math.max(0, initialAttendance - leaveMissedPercentage).toFixed(2));
    }

    if (predictedAttendance < 75.0) {
      return res.status(400).json({
        message: 'Attendance Requirement Not Met',
        predictedAttendance,
        minRequired: 75.0,
        attendanceBlocked: true
      });
    }

    const remainingSafeLeaveDays = Math.max(
      0,
      Math.floor(((predictedAttendance - 75.0) * conductedPeriods) / 900)
    );

    const warnings = [];
    if (summary.current_attendance < 75.0) {
      warnings.push(`Low attendance alert (${summary.current_attendance}%). Applying for leave might attract academic warning.`);
    }

    // Insert leave request
    const docString = documents ? JSON.stringify(documents) : null;
    const result = await run(`
      INSERT INTO leave_requests (
        student_id, leave_type, reason, destination, address, emergency_contact,
        travel_mode, start_date, end_date, expected_return_time, documents, status, current_handler_role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_CC', 'CC')
    `, [
      studentId, leaveType, reason, destination, address, emergencyContact,
      travelMode, startDate, endDate, expectedReturnTime, docString
    ]);

    const leaveId = result.lastID;

    // Create system notification for CC (notify the assigned CC if configured, else default)
    let ccUser = null;
    if (student.cc_name) {
      ccUser = await queryOne(`SELECT id FROM users WHERE role = 'CC' AND name = ? LIMIT 1`, [student.cc_name]);
    }
    if (!ccUser) {
      ccUser = await queryOne(`SELECT id FROM users WHERE role = 'CC' LIMIT 1`);
    }

    if (ccUser) {
      await run(`
        INSERT INTO notifications (user_id, title, message, type, leave_request_id)
        VALUES (?, 'New Leave Application', ?, 'INFO', ?)
      `, [ccUser.id, `Student ${req.user.name} has submitted a leave application (${leaveType}) for ${leaveDays} days.`, leaveId]);
    }

    // Student notification
    await run(`
      INSERT INTO notifications (user_id, title, message, type, leave_request_id)
      VALUES (?, 'Leave Application Submitted', 'Your leave request has been sent to your Class Coordinator for approval.', 'SUCCESS', ?)
    `, [studentId, leaveId]);

    // Audit log
    await logAction({
      userId: studentId,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'LEAVE_APPLY',
      details: `Applied for ${leaveType} leave (ID: ${leaveId}) from ${startDate} to ${endDate}. Warnings: ${warnings.join(', ')}`,
      req
    });

    res.json({
      message: 'Leave application submitted successfully.',
      leaveId,
      warnings,
      predictedAttendance,
      remainingSafeLeaveDays
    });

  } catch (err) {
    console.error('Apply leave error:', err);
    res.status(500).json({ message: 'Error submitting leave application.' });
  }
}

// 2. Get Student Leave History
export async function getStudentLeaves(req, res) {
  const studentId = req.user.id;

  try {
    // Get leaves and check for active QR passes
    const leaves = await query(`
      SELECT lr.*, qp.pass_id, qp.status as qr_status, qp.exit_time, qp.entry_time
      FROM leave_requests lr
      LEFT JOIN qr_passes qp ON lr.id = qp.leave_request_id
      WHERE lr.student_id = ?
      ORDER BY lr.created_at DESC
    `, [studentId]);

    // Format document array
    const formattedLeaves = leaves.map(l => ({
      ...l,
      documents: l.documents ? JSON.parse(l.documents) : []
    }));

    res.json(formattedLeaves);
  } catch (err) {
    console.error('Get student leaves error:', err);
    res.status(500).json({ message: 'Error fetching leave history.' });
  }
}

// 3. Get Pending/All Leaves for Faculty (CC, HOD, DEAN, WARDEN)
export async function getFacultyLeaves(req, res) {
  const role = req.user.role;
  const userName = req.user.name;

  try {
    let leaves;
    if (role === 'CC') {
      // CC gets all leave requests for their assigned students, or unassigned students
      leaves = await query(`
        SELECT lr.*, u.name as student_name, u.register_number, u.email as student_email, s.department, s.year, s.section, 
               s.hostel_block, s.room_number, s.attendance_percentage, s.parent_name, s.parent_phone, s.cc_name, s.hod_name,
               qp.pass_id, qp.status as qr_status, qp.exit_time, qp.entry_time
        FROM leave_requests lr
        JOIN users u ON lr.student_id = u.id
        JOIN students s ON lr.student_id = s.user_id
        LEFT JOIN qr_passes qp ON lr.id = qp.leave_request_id
        WHERE s.cc_name = ? OR s.cc_name IS NULL OR s.cc_name = ''
        ORDER BY lr.created_at DESC
      `, [userName]);
    } else if (role === 'HOD') {
      // HOD gets all leave requests for their assigned students, or unassigned students
      leaves = await query(`
        SELECT lr.*, u.name as student_name, u.register_number, u.email as student_email, s.department, s.year, s.section, 
               s.hostel_block, s.room_number, s.attendance_percentage, s.parent_name, s.parent_phone, s.cc_name, s.hod_name,
               qp.pass_id, qp.status as qr_status, qp.exit_time, qp.entry_time
        FROM leave_requests lr
        JOIN users u ON lr.student_id = u.id
        JOIN students s ON lr.student_id = s.user_id
        LEFT JOIN qr_passes qp ON lr.id = qp.leave_request_id
        WHERE s.hod_name = ? OR s.hod_name IS NULL OR s.hod_name = ''
        ORDER BY lr.created_at DESC
      `, [userName]);
    } else {
      // Dean and Warden see requests matching their current handler role or completed ones
      leaves = await query(`
        SELECT lr.*, u.name as student_name, u.register_number, u.email as student_email, s.department, s.year, s.section, 
               s.hostel_block, s.room_number, s.attendance_percentage, s.parent_name, s.parent_phone, s.cc_name, s.hod_name,
               qp.pass_id, qp.status as qr_status, qp.exit_time, qp.entry_time
        FROM leave_requests lr
        JOIN users u ON lr.student_id = u.id
        JOIN students s ON lr.student_id = s.user_id
        LEFT JOIN qr_passes qp ON lr.id = qp.leave_request_id
        WHERE lr.current_handler_role = ? OR lr.status IN ('APPROVED', 'REJECTED')
        ORDER BY lr.created_at DESC
      `, [role]);
    }

    const formattedLeaves = leaves.map(l => ({
      ...l,
      documents: l.documents ? JSON.parse(l.documents) : []
    }));

    res.json(formattedLeaves);
  } catch (err) {
    console.error('Get faculty leaves error:', err);
    res.status(500).json({ message: 'Error fetching approvals list.' });
  }
}

// Helper to parse extension request from reason
function parseExtensionDetails(reason) {
  const match = reason.match(/\[EXTENSION_REQUEST:([^|]+)\|([^\]]+)\]/);
  if (match) {
    return {
      newEndDate: match[1],
      originalEndDate: match[2]
    };
  }
  return null;
}

// 4. Review Leave (Approve / Reject / Clarify)
export async function reviewLeave(req, res) {
  const reviewerId = req.user.id;
  const reviewerRole = req.user.role;
  const { leaveId, action, remarks } = req.body; // action: APPROVE, REJECT, CLARIFICATION, RETURN_TO_CC

  if (!leaveId || !action) {
    return res.status(400).json({ message: 'Leave ID and Action are required.' });
  }

  try {
    const leave = await queryOne(`
      SELECT lr.*, u.name as student_name, u.email as student_email, u.register_number,
             s.cc_name, s.hod_name, s.user_id as student_user_id
      FROM leave_requests lr
      JOIN users u ON lr.student_id = u.id
      JOIN students s ON lr.student_id = s.user_id
      WHERE lr.id = ?
    `, [leaveId]);

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found.' });
    }

    if (leave.status === 'APPROVED' || leave.status === 'REJECTED') {
      return res.status(400).json({ message: 'This leave request has already been finalized.' });
    }

    if (leave.current_handler_role !== reviewerRole) {
      return res.status(403).json({ message: 'You are not the current reviewer for this leave request.' });
    }

    // Intercept rejection of extension requests
    if (action === 'REJECT' && leave.reason.includes('[EXTENSION_REQUEST:')) {
      const details = parseExtensionDetails(leave.reason);
      const originalReason = leave.reason.split('\n\nOriginal Reason: ').slice(1).join('\n\nOriginal Reason: ') || leave.reason;
      
      const pass = await queryOne(`SELECT exit_time FROM qr_passes WHERE leave_request_id = ?`, [leaveId]);
      const originalStatus = (pass && pass.exit_time) ? 'CHECKED_OUT' : 'APPROVED';

      await run(`
        UPDATE leave_requests
        SET status = ?, current_handler_role = 'NONE', reason = ?
        WHERE id = ?
      `, [originalStatus, originalReason, leaveId]);

      await run(`
        INSERT INTO notifications (user_id, title, message, type, leave_request_id)
        VALUES (?, 'Extension Rejected', ?, 'DANGER', ?)
      `, [leave.student_id, `Your leave extension request has been rejected by ${reviewerRole}. Remarks: "${remarks || 'None'}"`, leaveId]);

      await logAction({
        userId: reviewerId,
        userName: req.user.name,
        userEmail: req.user.email,
        action: `LEAVE_EXTENSION_REJECT`,
        details: `Rejected leave extension for ID: ${leaveId}. Status reverted to ${originalStatus}. Remarks: ${remarks}`,
        req
      });

      return res.json({
        message: 'Extension request rejected. Original leave restored.',
        status: originalStatus
      });
    }

    // Role-based access control & Auto-assignment
    if (reviewerRole === 'CC') {
      if (!leave.cc_name || leave.cc_name.trim() === '') {
        try {
          await run(`UPDATE students SET cc_name = ? WHERE user_id = ?`, [req.user.name, leave.student_user_id]);
          leave.cc_name = req.user.name; // update local value
        } catch (dbErr) {
          console.error(`Failed to assign CC ${req.user.name} to student ID ${leave.student_user_id}:`, dbErr.message);
          return res.status(500).json({ message: `Database error: Failed to assign you as the Class Coordinator for this student. Details: ${dbErr.message}` });
        }
      } else if (leave.cc_name !== req.user.name) {
        return res.status(403).json({ message: `Access Denied: You are not the assigned Class Coordinator for this student. Assigned CC is ${leave.cc_name}.` });
      }
    } else if (reviewerRole === 'HOD') {
      if (!leave.hod_name || leave.hod_name.trim() === '') {
        try {
          await run(`UPDATE students SET hod_name = ? WHERE user_id = ?`, [req.user.name, leave.student_user_id]);
          leave.hod_name = req.user.name; // update local value
        } catch (dbErr) {
          console.error(`Failed to assign HOD ${req.user.name} to student ID ${leave.student_user_id}:`, dbErr.message);
          return res.status(500).json({ message: `Database error: Failed to assign you as the HOD for this student. Details: ${dbErr.message}` });
        }
      } else if (leave.hod_name !== req.user.name) {
        return res.status(403).json({ message: `Access Denied: You are not the assigned HOD for this student. Assigned HOD is ${leave.hod_name}.` });
      }
    }

    let nextStatus = leave.status;
    let nextHandler = leave.current_handler_role;
    let updateFields = [];
    let updateParams = [];

    const nowStr = new Date().toISOString();

    if (reviewerRole === 'CC') {
      updateFields.push('cc_remarks = ?', 'cc_approved_at = ?');
      updateParams.push(remarks || 'Approved by Class Coordinator', nowStr);

      if (action === 'APPROVE') {
        nextStatus = 'PENDING_HOD';
        nextHandler = 'HOD';
      } else if (action === 'REJECT') {
        nextStatus = 'REJECTED';
        nextHandler = 'NONE';
      } else if (action === 'CLARIFICATION') {
        nextStatus = 'CLARIFICATION';
        nextHandler = 'STUDENT';
      }
    } 
    else if (reviewerRole === 'HOD') {
      updateFields.push('hod_remarks = ?', 'hod_approved_at = ?');
      updateParams.push(remarks || 'Approved by HOD', nowStr);

      if (action === 'APPROVE') {
        nextStatus = 'PENDING_DEAN';
        nextHandler = 'DEAN';
      } else if (action === 'REJECT') {
        nextStatus = 'REJECTED';
        nextHandler = 'NONE';
      } else if (action === 'RETURN_TO_CC') {
        nextStatus = 'PENDING_CC';
        nextHandler = 'CC';
      }
    } 
    else if (reviewerRole === 'DEAN') {
      updateFields.push('dean_remarks = ?', 'dean_approved_at = ?');
      updateParams.push(remarks || 'Approved by Dean', nowStr);

      if (action === 'APPROVE') {
        nextStatus = 'PENDING_WARDEN';
        nextHandler = 'WARDEN';
      } else if (action === 'REJECT') {
        nextStatus = 'REJECTED';
        nextHandler = 'NONE';
      } else if (action === 'CLARIFICATION') {
        nextStatus = 'CLARIFICATION';
        nextHandler = 'STUDENT';
      }
    } 
    else if (reviewerRole === 'WARDEN') {
      updateFields.push('warden_remarks = ?', 'warden_approved_at = ?');
      updateParams.push(remarks || 'Approved by Hostel Warden', nowStr);

      if (action === 'APPROVE') {
        if (leave.reason.includes('[EXTENSION_REQUEST:')) {
          const details = parseExtensionDetails(leave.reason);
          const originalReason = leave.reason.split('\n\nOriginal Reason: ').slice(1).join('\n\nOriginal Reason: ') || leave.reason;

          const currentDuration = getDaysCount(leave.start_date, leave.end_date);
          const newDuration = getDaysCount(leave.start_date, details.newEndDate);
          const additionalDays = newDuration - currentDuration;

          // Deduct additional days from student's leave balance
          await run(`
            UPDATE students 
            SET leave_balance = leave_balance - ?, leaves_used = leaves_used + ?
            WHERE user_id = ?
          `, [additionalDays, additionalDays, leave.student_id]);

          // Determine next status (if checked out, keep it CHECKED_OUT, else APPROVED)
          const pass = await queryOne(`SELECT exit_time FROM qr_passes WHERE leave_request_id = ?`, [leaveId]);
          const nextStatus = (pass && pass.exit_time) ? 'CHECKED_OUT' : 'APPROVED';

          // Update DB with the new end_date, reset handler, restore reason, and set Warden remarks
          await run(`
            UPDATE leave_requests
            SET status = ?, current_handler_role = 'NONE', end_date = ?, reason = ?, warden_remarks = ?, warden_approved_at = ?
            WHERE id = ?
          `, [nextStatus, details.newEndDate, originalReason, remarks || 'Approved by Hostel Warden', nowStr, leaveId]);

          // Student notification
          await run(`
            INSERT INTO notifications (user_id, title, message, type, leave_request_id)
            VALUES (?, 'Extension Approved', ?, 'SUCCESS', ?)
          `, [leave.student_id, `Your leave extension until ${details.newEndDate} has been approved.`, leaveId]);

          await updateStudentAttendanceSummary(leave.student_id);

          await logAction({
            userId: reviewerId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: `LEAVE_EXTENSION_APPROVE`,
            details: `Approved leave extension to ${details.newEndDate} for leave ID: ${leaveId}. Additional days: ${additionalDays}`,
            req
          });

          return res.json({
            message: 'Extension approved successfully.',
            status: nextStatus
          });
        } else {
          nextStatus = 'APPROVED';
          nextHandler = 'NONE';

          // 1. Generate QR Pass
          const passId = crypto.randomUUID();
          const durationDays = getDaysCount(leave.start_date, leave.end_date);
          const expiryDate = new Date(leave.end_date + 'T23:59:59').toISOString();
          const encryptedToken = generateSignedQRToken(passId, leave.register_number, expiryDate);

          await run(`
            INSERT INTO qr_passes (leave_request_id, pass_id, encrypted_token, status)
            VALUES (?, ?, ?, 'ACTIVE')
          `, [leaveId, passId, encryptedToken]);

          // 2. Deduct leave balance & increment used count
          await run(`
            UPDATE students 
            SET leave_balance = leave_balance - ?, leaves_used = leaves_used + ?
            WHERE user_id = ?
          `, [durationDays, durationDays, leave.student_id]);
        }
      } else if (action === 'REJECT') {
        nextStatus = 'REJECTED';
        nextHandler = 'NONE';
      }
    }

    updateFields.push('status = ?', 'current_handler_role = ?');
    updateParams.push(nextStatus, nextHandler);
    
    // Add leave ID to target query
    updateParams.push(leaveId);

    // Run SQL query
    await run(`
      UPDATE leave_requests
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateParams);

    // Update attendance summary if leave is finalized (Approved or Rejected)
    if (nextStatus === 'APPROVED' || nextStatus === 'REJECTED') {
      await updateStudentAttendanceSummary(leave.student_id);
    }

    // Create notifications for Student
    let notifyMessage = `Your leave request has been reviewed. Status: ${nextStatus}.`;
    if (remarks) notifyMessage += ` Remarks: "${remarks}"`;
    if (nextStatus === 'APPROVED') {
      notifyMessage = 'Your leave has been approved. Please present your QR Pass to the Security Guard while exiting the hostel.';
    }

    await run(`
      INSERT INTO notifications (user_id, title, message, type, leave_request_id)
      VALUES (?, ?, ?, ?, ?)
    `, [
      leave.student_id, 
      `Leave Request ${nextStatus}`, 
      notifyMessage, 
      nextStatus === 'APPROVED' ? 'SUCCESS' : nextStatus === 'REJECTED' ? 'DANGER' : 'WARNING',
      leaveId
    ]);

    // Create notification for Next Handler
    if (nextHandler !== 'NONE' && nextHandler !== 'STUDENT') {
      let nextHandlerUser = null;
      if (nextHandler === 'CC') {
        nextHandlerUser = await queryOne(`SELECT id FROM users WHERE role = 'CC' AND name = ? LIMIT 1`, [leave.cc_name]);
      } else if (nextHandler === 'HOD') {
        nextHandlerUser = await queryOne(`SELECT id FROM users WHERE role = 'HOD' AND name = ? LIMIT 1`, [leave.hod_name]);
      }
      
      if (!nextHandlerUser) {
        nextHandlerUser = await queryOne(`SELECT id FROM users WHERE role = ? LIMIT 1`, [nextHandler]);
      }

      if (nextHandlerUser) {
        await run(`
          INSERT INTO notifications (user_id, title, message, type, leave_request_id)
          VALUES (?, 'Pending Approval Request', ?, 'INFO', ?)
        `, [
          nextHandlerUser.id,
          `Student ${leave.student_name} (${leave.register_number}) request is pending with you.`,
          leaveId
        ]);
      }
    }

    // Write audit log
    await logAction({
      userId: reviewerId,
      userName: req.user.name,
      userEmail: req.user.email,
      action: `LEAVE_REVIEW_${action}`,
      details: `Reviewed leave ID: ${leaveId} for student ${leave.student_name}. Status changed from ${leave.status} to ${nextStatus}. Remarks: ${remarks}`,
      req
    });

    res.json({
      message: `Leave request ${action.toLowerCase()}d successfully.`,
      status: nextStatus
    });

  } catch (err) {
    console.error('Review leave error:', err);
    res.status(500).json({ message: 'Error reviewing leave request.' });
  }
}

// 5. Respond to Clarification
export async function respondToClarification(req, res) {
  const studentId = req.user.id;
  const { leaveId, studentMessage } = req.body;

  if (!leaveId || !studentMessage) {
    return res.status(400).json({ message: 'Leave ID and explanation are required.' });
  }

  try {
    const leave = await queryOne(`
      SELECT * FROM leave_requests 
      WHERE id = ? AND student_id = ?
    `, [leaveId, studentId]);

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found or not owned by you.' });
    }

    if (leave.status !== 'CLARIFICATION') {
      return res.status(400).json({ message: 'This leave request does not require clarification.' });
    }

    // Change status back to CC for reviews with student comments appended to reason
    const updatedReason = `${leave.reason} \n\n[Clarification Response]: ${studentMessage}`;

    await run(`
      UPDATE leave_requests
      SET status = 'PENDING_CC', current_handler_role = 'CC', reason = ?
      WHERE id = ?
    `, [updatedReason, leaveId]);

    // Notify CC
    const student = await queryOne(`SELECT cc_name FROM students WHERE user_id = ?`, [studentId]);
    let ccUser = null;
    if (student && student.cc_name) {
      ccUser = await queryOne(`SELECT id FROM users WHERE role = 'CC' AND name = ? LIMIT 1`, [student.cc_name]);
    }
    if (!ccUser) {
      ccUser = await queryOne(`SELECT id FROM users WHERE role = 'CC' LIMIT 1`);
    }

    if (ccUser) {
      await run(`
        INSERT INTO notifications (user_id, title, message, type, leave_request_id)
        VALUES (?, 'Clarification Submitted', ?, 'INFO', ?)
      `, [ccUser.id, `Student ${req.user.name} submitted clarification on leave ID: ${leaveId}.`, leaveId]);
    }

    await logAction({
      userId: studentId,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'LEAVE_CLARIFY_RESPOND',
      details: `Student clarified leave request ID: ${leaveId} with message: ${studentMessage}`,
      req
    });

    res.json({ message: 'Clarification submitted. Request sent back to Class Coordinator.' });
  } catch (err) {
    console.error('Clarification response error:', err);
    res.status(500).json({ message: 'Error submitting clarification.' });
  }
}

export async function predictLeaveAttendance(req, res) {
  const studentId = req.user.id;
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start and end dates are required.' });
  }

  try {
    const student = await queryOne(`SELECT initial_attendance_percentage FROM students WHERE user_id = ?`, [studentId]);
    const initialAttendance = student ? (student.initial_attendance_percentage ?? 100.0) : 100.0;

    let summary = await queryOne(`SELECT * FROM attendance_summary WHERE student_id = ?`, [studentId]);
    if (!summary) {
      // Create if missing
      await run(`
        INSERT OR IGNORE INTO attendance_summary (student_id, current_attendance, approved_leave_days, remaining_safe_leave_days, working_days_conducted, conducted_periods, attendance_status)
        VALUES (?, 100.0, 0, 11, 45, 405, 'Safe')
      `, [studentId]);
      summary = await queryOne(`SELECT * FROM attendance_summary WHERE student_id = ?`, [studentId]);
    }

    const workingDays = summary.working_days_conducted;
    const conductedPeriods = workingDays * 9;

    // Sum approved leave days directly from database for accuracy (only APPROVED/CHECKED_OUT)
    const leaves = await query(`
      SELECT start_date, end_date FROM leave_requests
      WHERE student_id = ? AND status IN ('APPROVED', 'CHECKED_OUT')
    `, [studentId]);

    let approvedLeaveDays = 0;
    leaves.forEach(l => {
      approvedLeaveDays += getDaysCount(l.start_date, l.end_date);
    });

    const requestedLeaveDays = getDaysCount(startDate, endDate);
    const totalLeaveDays = approvedLeaveDays + requestedLeaveDays;
    const missedPeriods = totalLeaveDays * 9;

    let currentAttendance = initialAttendance;
    if (conductedPeriods > 0) {
      const leaveMissedPercentage = (approvedLeaveDays * 9 / conductedPeriods) * 100;
      currentAttendance = parseFloat(Math.max(0, initialAttendance - leaveMissedPercentage).toFixed(2));
    }

    let predictedAttendance = initialAttendance;
    if (conductedPeriods > 0) {
      const leaveMissedPercentage = (missedPeriods / conductedPeriods) * 100;
      predictedAttendance = parseFloat(Math.max(0, initialAttendance - leaveMissedPercentage).toFixed(2));
    }

    const remainingSafeLeaveDays = Math.max(
      0,
      Math.floor(((predictedAttendance - 75.0) * conductedPeriods) / 900)
    );

    let status = 'Safe';
    if (predictedAttendance < 75.0) {
      status = 'Critical';
    } else if (predictedAttendance < 80.0) {
      status = 'Warning';
    }

    res.json({
      requestedLeaveDays,
      currentAttendance,
      predictedAttendance,
      remainingSafeLeaveDays,
      status
    });
  } catch (err) {
    console.error('Prediction calculation error:', err);
    res.status(500).json({ message: 'Error predicting attendance.' });
  }
}

// 6. Apply Leave Extension
export async function applyExtension(req, res) {
  const studentId = req.user.id;
  const { newEndDate, extensionReason } = req.body;

  if (!newEndDate || !extensionReason) {
    return res.status(400).json({ message: 'New end date and reason are required.' });
  }

  try {
    // 1. Find the active leave request (status APPROVED or CHECKED_OUT)
    const activeLeave = await queryOne(`
      SELECT * FROM leave_requests 
      WHERE student_id = ? AND status IN ('APPROVED', 'CHECKED_OUT')
      LIMIT 1
    `, [studentId]);

    if (!activeLeave) {
      return res.status(400).json({ message: 'No active approved leave request found to extend.' });
    }

    if (newEndDate <= activeLeave.end_date) {
      return res.status(400).json({ message: 'New return date must be after the current return date.' });
    }

    const student = await queryOne(`SELECT * FROM students WHERE user_id = ?`, [studentId]);
    if (!student) {
      return res.status(400).json({ message: 'Student details not found.' });
    }

    // Calculate additional days
    const currentDuration = getDaysCount(activeLeave.start_date, activeLeave.end_date);
    const newDuration = getDaysCount(activeLeave.start_date, newEndDate);
    const additionalDays = newDuration - currentDuration;

    if (student.leave_balance < additionalDays) {
      return res.status(400).json({ message: `Insufficient leave balance for extension. Required additional: ${additionalDays} days, Available: ${student.leave_balance} days.` });
    }

    // Check attendance impact
    let summary = await queryOne(`SELECT * FROM attendance_summary WHERE student_id = ?`, [studentId]);
    const initialAttendance = student.initial_attendance_percentage ?? 100.0;
    const conductedPeriods = (summary?.working_days_conducted ?? 45) * 9;

    // Sum approved leave days excluding this leave's original duration
    const leaves = await query(`
      SELECT id, start_date, end_date FROM leave_requests
      WHERE student_id = ? AND status IN ('APPROVED', 'CHECKED_OUT', 'COMPLETED') AND id != ?
    `, [studentId, activeLeave.id]);

    let otherLeaveDays = 0;
    leaves.forEach(l => {
      otherLeaveDays += getDaysCount(l.start_date, l.end_date);
    });

    const totalLeaveDays = otherLeaveDays + newDuration;
    const missedPeriods = totalLeaveDays * 9;
    
    let predictedAttendance = initialAttendance;
    if (conductedPeriods > 0) {
      const leaveMissedPercentage = (missedPeriods / conductedPeriods) * 100;
      predictedAttendance = parseFloat(Math.max(0, initialAttendance - leaveMissedPercentage).toFixed(2));
    }

    if (predictedAttendance < 75.0) {
      return res.status(400).json({
        message: 'Attendance Requirement Not Met',
        predictedAttendance,
        minRequired: 75.0,
        attendanceBlocked: true
      });
    }

    // Save extension request in the reason field
    // Format: [EXTENSION_REQUEST:newEndDate|originalEndDate]extensionReason\n\nOriginal Reason: ...
    const formattedReason = `[EXTENSION_REQUEST:${newEndDate}|${activeLeave.end_date}] ${extensionReason}\n\nOriginal Reason: ${activeLeave.reason}`;

    // Update leave request status to PENDING_CC and handler to CC
    await run(`
      UPDATE leave_requests
      SET status = 'PENDING_CC', current_handler_role = 'CC', reason = ?
      WHERE id = ?
    `, [formattedReason, activeLeave.id]);

    // Notify CC
    let ccUser = null;
    if (student.cc_name) {
      ccUser = await queryOne(`SELECT id FROM users WHERE role = 'CC' AND name = ? LIMIT 1`, [student.cc_name]);
    }
    if (!ccUser) {
      ccUser = await queryOne(`SELECT id FROM users WHERE role = 'CC' LIMIT 1`);
    }

    if (ccUser) {
      await run(`
        INSERT INTO notifications (user_id, title, message, type, leave_request_id)
        VALUES (?, 'Leave Extension Request', ?, 'INFO', ?)
      `, [ccUser.id, `Student ${req.user.name} has requested a leave extension until ${newEndDate}.`, activeLeave.id]);
    }

    // Student notification
    await run(`
      INSERT INTO notifications (user_id, title, message, type, leave_request_id)
      VALUES (?, 'Extension Requested', 'Your leave extension request has been sent for approval.', 'SUCCESS', ?)
    `, [studentId, activeLeave.id]);

    await logAction({
      userId: studentId,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'LEAVE_EXTENSION_APPLY',
      details: `Requested leave extension (ID: ${activeLeave.id}) to ${newEndDate}. Additional days: ${additionalDays}`,
      req
    });

    res.json({
      message: 'Extension request submitted successfully.',
      leaveId: activeLeave.id,
      predictedAttendance
    });

  } catch (err) {
    console.error('Apply extension error:', err);
    res.status(500).json({ message: 'Error submitting leave extension.' });
  }
}
