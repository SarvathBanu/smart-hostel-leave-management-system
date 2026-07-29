import { query, queryOne, run } from '../db/db.js';
import { verifySignedQRToken } from '../utils/qrCrypto.js';
import { logAction } from '../utils/logger.js';
import { updateStudentAttendanceSummary } from './attendanceController.js';

// Scan QR Code
export async function scanQR(req, res) {
  const { token, lateReason } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Token is required.' });
  }

  try {
    // 1. Verify Cryptographic Signature
    const decoded = verifySignedQRToken(token);
    if (!decoded) {
      return res.status(400).json({
        valid: false,
        message: 'INVALID SIGNATURE (Pass has been tampered with or is fake.)'
      });
    }

    const { passId, expiry } = decoded;

    // 2. Expiry check (for exit)
    const now = new Date();
    const expiryDate = new Date(expiry);

    // 3. Find Pass in Database
    const pass = await queryOne(`
      SELECT qp.*, lr.start_date, lr.end_date, lr.expected_return_time, lr.leave_type, lr.reason, 
             u.name as student_name, u.register_number, u.email as student_email,
             s.department, s.hostel_block, s.room_number, s.parent_name, s.parent_phone
      FROM qr_passes qp
      JOIN leave_requests lr ON qp.leave_request_id = lr.id
      JOIN users u ON lr.student_id = u.id
      JOIN students s ON lr.student_id = s.user_id
      WHERE qp.pass_id = ?
    `, [passId]);

    if (!pass) {
      return res.status(404).json({
        valid: false,
        message: 'PASS NOT FOUND (No matching database record.)'
      });
    }

    if (pass.status === 'CANCELLED') {
      return res.status(400).json({
        valid: false,
        message: 'CANCELLED PASS (This leave pass has been revoked.)'
      });
    }

    const nowStr = now.toISOString();

    // 4. Determine exit vs entry flow
    if (!pass.exit_time) {
      // EXIT FLOW


      if (now > expiryDate) {
        return res.status(400).json({
          valid: false,
          message: 'EXPIRED PASS (Leave end date has passed. Exit denied.)'
        });
      }

      // Allow Exit
      await run(`
        UPDATE qr_passes 
        SET exit_time = ?, status = 'OUT_OF_CAMPUS' 
        WHERE id = ?
      `, [nowStr, pass.id]);

      await run(`
        UPDATE leave_requests
        SET status = 'CHECKED_OUT'
        WHERE id = ?
      `, [pass.leave_request_id]);

      // Automatically update simulated ERP attendance status to "On Approved Leave"
      await run(`
        UPDATE erp_attendance
        SET status = 'On Approved Leave', last_updated = ?
        WHERE student_id = ?
      `, [nowStr, pass.student_id]);

      // Notify warden & student
      const wardenUser = await queryOne(`SELECT id FROM users WHERE role = 'WARDEN' LIMIT 1`);
      if (wardenUser) {
        await run(`
          INSERT INTO notifications (user_id, title, message, type, leave_request_id)
          VALUES (?, 'Student Checked Out', ?, 'INFO', ?)
        `, [wardenUser.id, `Student ${pass.student_name} (${pass.register_number}) has exited the campus.`, pass.leave_request_id]);
      }

      await run(`
        INSERT INTO notifications (user_id, title, message, type, leave_request_id)
        VALUES (?, 'Exit Approved', 'Your QR Pass has been successfully verified by Security. You have been checked out of the hostel.', 'SUCCESS', ?)
      `, [pass.student_id, pass.leave_request_id]);

      await logAction({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        action: 'PASS_EXIT_SCAN',
        details: `Allowed exit for student ${pass.student_name} (${pass.register_number}). Pass ID: ${passId}`,
        req
      });

      return res.json({
        valid: true,
        action: 'EXIT',
        message: 'EXIT APPROVED',
        pass: {
          ...pass,
          exit_time: nowStr,
          status: 'OUT_OF_CAMPUS'
        }
      });

    } else if (!pass.entry_time) {
      // ENTRY FLOW
      // Check if it's a duplicate scan of a recent exit (within 10 seconds)
      const exitTimeDate = new Date(pass.exit_time);
      if (now - exitTimeDate < 10000) { // 10 seconds
        return res.json({
          valid: true,
          action: 'EXIT',
          message: 'EXIT APPROVED (Duplicate scan ignored)',
          pass: {
            ...pass,
            status: 'OUT_OF_CAMPUS'
          }
        });
      }

      let isLate = 0;
      
      // Determine if return is late (Expected return time + end date)
      const expectedReturnStr = `${pass.end_date}T${pass.expected_return_time}:00`;
      const expectedReturnDate = new Date(expectedReturnStr);

      if (now > expectedReturnDate) {
        isLate = 1;
      }

      // Allow Entry
      await run(`
        UPDATE qr_passes 
        SET entry_time = ?, status = 'USED', late_return = ?, late_reason = ?
        WHERE id = ?
      `, [nowStr, isLate, lateReason || null, pass.id]);

      await run(`
        UPDATE leave_requests
        SET status = 'COMPLETED'
        WHERE id = ?
      `, [pass.leave_request_id]);

      // Automatically update simulated ERP attendance status to "Present"
      await run(`
        UPDATE erp_attendance
        SET status = 'Present', last_updated = ?
        WHERE student_id = ?
      `, [nowStr, pass.student_id]);

      // Notify warden, student & admin if late
      const wardenUser = await queryOne(`SELECT id FROM users WHERE role = 'WARDEN' LIMIT 1`);
      if (wardenUser) {
        await run(`
          INSERT INTO notifications (user_id, title, message, type, leave_request_id)
          VALUES (?, ?, ?, ?, ?)
        `, [
          wardenUser.id, 
          isLate ? 'Late Return Alert' : 'Student Checked In',
          isLate 
            ? `Student ${pass.student_name} (${pass.register_number}) returned LATE. Expected: ${pass.expected_return_time}, Returned: ${now.toLocaleTimeString()}. Reason: ${lateReason || 'Not provided'}`
            : `Student ${pass.student_name} has returned to hostel.`,
          isLate ? 'WARNING' : 'SUCCESS',
          pass.leave_request_id
        ]);
      }

      // Notify student
      await run(`
        INSERT INTO notifications (user_id, title, message, type, leave_request_id)
        VALUES (?, 'Welcome Back', 'Your hostel return has been successfully recorded.', 'SUCCESS', ?)
      `, [pass.student_id, pass.leave_request_id]);

      await logAction({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        action: 'PASS_ENTRY_SCAN',
        details: `Allowed entry/return for student ${pass.student_name} (${pass.register_number}). Late: ${isLate}. Pass ID: ${passId}`,
        req
      });

      return res.json({
        valid: true,
        action: 'ENTRY',
        message: isLate ? 'ENTRY APPROVED (LATE RETURN LOGGED)' : 'WELCOME BACK - ENTRY APPROVED',
        isLate,
        pass: {
          ...pass,
          entry_time: nowStr,
          status: 'USED',
          late_return: isLate,
          late_reason: lateReason
        }
      });
    } else {
      // Pass already used fully
      // Check if it's a duplicate scan of a recent entry (within 10 seconds)
      const entryTimeDate = new Date(pass.entry_time);
      if (now - entryTimeDate < 10000) { // 10 seconds
        return res.json({
          valid: true,
          action: 'ENTRY',
          message: pass.late_return ? 'ENTRY APPROVED (LATE RETURN LOGGED) (Duplicate scan ignored)' : 'WELCOME BACK - ENTRY APPROVED (Duplicate scan ignored)',
          isLate: pass.late_return,
          pass: pass
        });
      }

      return res.status(400).json({
        valid: false,
        message: 'This QR Pass has already been used and is no longer valid.'
      });
    }

  } catch (err) {
    console.error('Scan QR error:', err);
    res.status(500).json({ message: 'Error verifying QR pass.' });
  }
}

// Get Active Pass for Student
export async function getActivePass(req, res) {
  const studentId = req.user.id;

  try {
    const pass = await queryOne(`
      SELECT qp.*, lr.leave_type, lr.reason, lr.start_date, lr.end_date, lr.expected_return_time, lr.destination, lr.emergency_contact,
             u.name as student_name, u.register_number, s.department, s.hostel_block, s.room_number
      FROM qr_passes qp
      JOIN leave_requests lr ON qp.leave_request_id = lr.id
      JOIN users u ON lr.student_id = u.id
      JOIN students s ON lr.student_id = s.user_id
      WHERE lr.student_id = ? AND qp.status IN ('ACTIVE', 'OUT_OF_CAMPUS')
      ORDER BY qp.created_at DESC
      LIMIT 1
    `, [studentId]);

    if (!pass) {
      return res.status(404).json({ message: 'No active pass found.' });
    }

    res.json(pass);
  } catch (err) {
    console.error('Get active pass error:', err);
    res.status(500).json({ message: 'Error retrieving active leave pass.' });
  }
}

// Send Gate Pass to Guard
export async function sendToGuard(req, res) {
  const { passId } = req.body;
  const studentId = req.user.id;

  if (!passId) {
    return res.status(400).json({ message: 'Pass ID is required.' });
  }

  try {
    // 1. Verify this pass belongs to the student and is active
    const pass = await queryOne(`
      SELECT qp.* 
      FROM qr_passes qp
      JOIN leave_requests lr ON qp.leave_request_id = lr.id
      WHERE qp.pass_id = ? AND lr.student_id = ? AND qp.status IN ('ACTIVE', 'OUT_OF_CAMPUS')
    `, [passId, studentId]);

    if (!pass) {
      return res.status(404).json({ message: 'Active leave pass not found.' });
    }

    const nowStr = new Date().toISOString();

    // 2. Mark pass as sent to guard
    await run(`
      UPDATE qr_passes 
      SET sent_to_guard = 1, sent_to_guard_time = ? 
      WHERE id = ?
    `, [nowStr, pass.id]);

    await logAction({
      userId: studentId,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'PASS_SEND_TO_GUARD',
      details: `Student sent pass (ID: ${passId}) to guard dashboard.`,
      req
    });

    res.json({ message: 'Gate pass sent to Guard Dashboard successfully.' });
  } catch (err) {
    console.error('Send to guard error:', err);
    res.status(500).json({ message: 'Error sending gate pass to guard.' });
  }
}

// Get Pending Gate Passes for Guard
export async function getPendingPasses(req, res) {
  try {
    const list = await query(`
      SELECT qp.*, lr.leave_type, lr.reason, lr.start_date, lr.end_date, lr.expected_return_time, lr.destination, lr.emergency_contact, lr.status as leave_status,
             u.name as student_name, u.register_number, s.department, s.hostel_block, s.room_number, s.parent_name, s.parent_phone
      FROM qr_passes qp
      JOIN leave_requests lr ON qp.leave_request_id = lr.id
      JOIN users u ON lr.student_id = u.id
      JOIN students s ON lr.student_id = s.user_id
      WHERE qp.sent_to_guard = 1 OR qp.status = 'OUT_OF_CAMPUS'
      ORDER BY qp.sent_to_guard_time ASC
    `);

    res.json(list);
  } catch (err) {
    console.error('Get pending passes error:', err);
    res.status(500).json({ message: 'Error retrieving pending gate passes.' });
  }
}

// Process Pass: EXIT, ENTRY, REJECT
export async function processPass(req, res) {
  const { passId, action, lateReason } = req.body;
  const guardId = req.user.id;

  if (!passId || !action) {
    return res.status(400).json({ message: 'Pass ID and action are required.' });
  }

  try {
    // 1. Find Pass in Database
    const pass = await queryOne(`
      SELECT qp.*, lr.start_date, lr.end_date, lr.expected_return_time, lr.leave_type, lr.reason, lr.destination, lr.emergency_contact, lr.status as leave_status,
             u.name as student_name, u.register_number, u.email as student_email, lr.student_id,
             s.department, s.hostel_block, s.room_number, s.parent_name, s.parent_phone
      FROM qr_passes qp
      JOIN leave_requests lr ON qp.leave_request_id = lr.id
      JOIN users u ON lr.student_id = u.id
      JOIN students s ON lr.student_id = s.user_id
      WHERE qp.pass_id = ?
    `, [passId]);

    if (!pass) {
      return res.status(404).json({ message: 'Gate pass not found.' });
    }

    const now = new Date();
    const nowStr = now.toISOString();

    if (action === 'EXIT') {
      // Prevent duplicate processing
      if (pass.status !== 'ACTIVE' || pass.exit_time) {
        return res.status(400).json({ message: 'Duplicate Exit processing. Egress already registered or pass is not active.' });
      }



      // Check if expired
      const expiryDate = new Date(pass.end_date + 'T23:59:59');
      if (now > expiryDate) {
        return res.status(400).json({ message: 'Expired pass. Leave end date has passed. Exit denied.' });
      }

      // Update exit flow
      await run(`
        UPDATE qr_passes 
        SET exit_time = ?, status = 'OUT_OF_CAMPUS', sent_to_guard = 0 
        WHERE id = ?
      `, [nowStr, pass.id]);

      await run(`
        UPDATE leave_requests
        SET status = 'CHECKED_OUT'
        WHERE id = ?
      `, [pass.leave_request_id]);

      // Automatically update simulated ERP attendance status to "On Approved Leave"
      await run(`
        UPDATE erp_attendance
        SET status = 'On Approved Leave', last_updated = ?
        WHERE student_id = ?
      `, [nowStr, pass.student_id]);

      // Notify Warden & Student
      const wardenUser = await queryOne(`SELECT id FROM users WHERE role = 'WARDEN' LIMIT 1`);
      if (wardenUser) {
        await run(`
          INSERT INTO notifications (user_id, title, message, type, leave_request_id)
          VALUES (?, 'Student Checked Out', ?, 'INFO', ?)
        `, [wardenUser.id, `Student ${pass.student_name} (${pass.register_number}) has exited the campus.`, pass.leave_request_id]);
      }

      await run(`
        INSERT INTO notifications (user_id, title, message, type, leave_request_id)
        VALUES (?, 'Exit Approved', 'Your QR Pass has been successfully verified by Security. You have been checked out of the hostel.', 'SUCCESS', ?)
      `, [pass.student_id, pass.leave_request_id]);

      await logAction({
        userId: guardId,
        userName: req.user.name,
        userEmail: req.user.email,
        action: 'PASS_EXIT_VERIFY',
        details: `Guard registered exit for student ${pass.student_name} (${pass.register_number}). Pass ID: ${passId}`,
        req
      });

      return res.json({
        message: 'Exit marked successfully.',
        pass: { ...pass, status: 'OUT_OF_CAMPUS', exit_time: nowStr }
      });

    } else if (action === 'ENTRY') {
      // Prevent duplicate processing
      if (pass.status !== 'OUT_OF_CAMPUS' || pass.entry_time) {
        return res.status(400).json({ message: 'Duplicate Entry processing. Ingress already registered or student is not out of campus.' });
      }

      let isLate = 0;
      const expectedReturnStr = `${pass.end_date}T${pass.expected_return_time}:00`;
      const expectedReturnDate = new Date(expectedReturnStr);

      if (now > expectedReturnDate) {
        isLate = 1;
      }

      // Update entry flow
      await run(`
        UPDATE qr_passes 
        SET entry_time = ?, status = 'USED', late_return = ?, late_reason = ?, sent_to_guard = 0
        WHERE id = ?
      `, [nowStr, isLate, lateReason || null, pass.id]);

      await run(`
        UPDATE leave_requests
        SET status = 'COMPLETED'
        WHERE id = ?
      `, [pass.leave_request_id]);

      // Automatically update simulated ERP attendance status to "Present"
      await run(`
        UPDATE erp_attendance
        SET status = 'Present', last_updated = ?
        WHERE student_id = ?
      `, [nowStr, pass.student_id]);

      // Notify Warden & Student
      const wardenUser = await queryOne(`SELECT id FROM users WHERE role = 'WARDEN' LIMIT 1`);
      if (wardenUser) {
        await run(`
          INSERT INTO notifications (user_id, title, message, type, leave_request_id)
          VALUES (?, ?, ?, ?, ?)
        `, [
          wardenUser.id,
          isLate ? 'Late Return Alert' : 'Student Checked In',
          isLate
            ? `Student ${pass.student_name} (${pass.register_number}) returned LATE. Reason: ${lateReason || 'Not provided'}`
            : `Student ${pass.student_name} has returned to hostel.`,
          isLate ? 'WARNING' : 'SUCCESS',
          pass.leave_request_id
        ]);
      }

      await run(`
        INSERT INTO notifications (user_id, title, message, type, leave_request_id)
        VALUES (?, 'Welcome Back', 'Your hostel return has been successfully recorded.', 'SUCCESS', ?)
      `, [pass.student_id, pass.leave_request_id]);

      await logAction({
        userId: guardId,
        userName: req.user.name,
        userEmail: req.user.email,
        action: 'PASS_ENTRY_VERIFY',
        details: `Guard registered entry for student ${pass.student_name} (${pass.register_number}). Late: ${isLate}. Pass ID: ${passId}`,
        req
      });

      return res.json({
        message: isLate ? 'Entry marked as LATE return.' : 'Entry marked successfully.',
        pass: { ...pass, status: 'USED', entry_time: nowStr, late_return: isLate, late_reason: lateReason }
      });

    } else if (action === 'REJECT') {
      if (pass.status === 'USED' || pass.status === 'CANCELLED') {
        return res.status(400).json({ message: 'Pass is already resolved or cancelled.' });
      }

      // Update rejection flow (Cancel the pass status)
      await run(`
        UPDATE qr_passes 
        SET status = 'CANCELLED', sent_to_guard = 0 
        WHERE id = ?
      `, [pass.id]);

      // Set leave request status to CANCELLED
      await run(`
        UPDATE leave_requests
        SET status = 'CANCELLED'
        WHERE id = ?
      `, [pass.leave_request_id]);

      // Calculate leave request duration
      const start = new Date(pass.start_date);
      const end = new Date(pass.end_date);
      const diffTime = end - start;
      const durationDays = diffTime < 0 ? 0 : Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Restore student leave balance
      await run(`
        UPDATE students 
        SET leave_balance = leave_balance + ?, leaves_used = leaves_used - ?
        WHERE user_id = ?
      `, [durationDays, durationDays, pass.student_id]);

      // Update student's attendance summary
      await updateStudentAttendanceSummary(pass.student_id);

      // Notify Student
      await run(`
        INSERT INTO notifications (user_id, title, message, type, leave_request_id)
        VALUES (?, 'Gate Pass Rejected', ?, 'DANGER', ?)
      `, [
        pass.student_id,
        `Your gate pass ID: ${passId.slice(0, 8)}... was rejected by security guard.`,
        pass.leave_request_id
      ]);

      await logAction({
        userId: guardId,
        userName: req.user.name,
        userEmail: req.user.email,
        action: 'PASS_REJECT_VERIFY',
        details: `Guard rejected gate pass for student ${pass.student_name} (${pass.register_number}). Pass ID: ${passId}`,
        req
      });

      return res.json({
        message: 'Pass rejected/cancelled successfully.',
        pass: { ...pass, status: 'CANCELLED' }
      });

    } else {
      return res.status(400).json({ message: 'Invalid action.' });
    }

  } catch (err) {
    console.error('Process pass error:', err);
    res.status(500).json({ message: 'Error processing gate pass.' });
  }
}
