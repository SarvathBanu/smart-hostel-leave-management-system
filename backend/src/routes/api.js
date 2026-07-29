import express from 'express';
import { login, getProfile, changePassword, updateProfile } from '../controllers/authController.js';
import { applyLeave, getStudentLeaves, getFacultyLeaves, reviewLeave, respondToClarification, predictLeaveAttendance, applyExtension } from '../controllers/leaveController.js';
import { scanQR, getActivePass, sendToGuard, getPendingPasses, processPass } from '../controllers/qrController.js';
import { getAnalytics, getUsers, getAuditLogs, updateSystemSettings, resetSemester, resetIndividualStudent, resetAllDemoData } from '../controllers/adminController.js';
import { getAttendance } from '../controllers/attendanceController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { query, run } from '../db/db.js';

const router = express.Router();

// --- Auth Routes ---
router.post('/auth/login', login);
router.get('/auth/profile', authenticateToken, getProfile);
router.put('/auth/profile', authenticateToken, updateProfile);
router.post('/auth/change-password', authenticateToken, changePassword);

// --- Leave Workflow Routes ---
router.post('/leaves/apply', authenticateToken, authorizeRoles('STUDENT'), applyLeave);
router.post('/leaves/extend', authenticateToken, authorizeRoles('STUDENT'), applyExtension);
router.get('/leaves/student', authenticateToken, authorizeRoles('STUDENT'), getStudentLeaves);
router.get('/leaves/faculty', authenticateToken, authorizeRoles('CC', 'HOD', 'DEAN', 'WARDEN'), getFacultyLeaves);
router.post('/leaves/review', authenticateToken, authorizeRoles('CC', 'HOD', 'DEAN', 'WARDEN'), reviewLeave);
router.post('/leaves/clarify', authenticateToken, authorizeRoles('STUDENT'), respondToClarification);
router.post('/leaves/predict', authenticateToken, authorizeRoles('STUDENT'), predictLeaveAttendance);

// --- QR Pass & Security Scanning Routes ---
router.post('/passes/scan', authenticateToken, authorizeRoles('GUARD'), scanQR);
router.get('/passes/active', authenticateToken, authorizeRoles('STUDENT'), getActivePass);
router.post('/passes/send-to-guard', authenticateToken, authorizeRoles('STUDENT'), sendToGuard);
router.get('/passes/pending', authenticateToken, authorizeRoles('GUARD'), getPendingPasses);
router.post('/passes/process', authenticateToken, authorizeRoles('GUARD'), processPass);

// --- Admin & Audit Logging Routes ---
router.get('/admin/analytics', authenticateToken, authorizeRoles('ADMIN'), getAnalytics);
router.get('/admin/users', authenticateToken, authorizeRoles('ADMIN'), getUsers);
router.get('/admin/logs', authenticateToken, authorizeRoles('ADMIN'), getAuditLogs);
router.post('/admin/settings', authenticateToken, authorizeRoles('ADMIN'), updateSystemSettings);
router.post('/admin/reset-semester', authenticateToken, authorizeRoles('ADMIN'), resetSemester);
router.post('/admin/reset-student', authenticateToken, authorizeRoles('ADMIN'), resetIndividualStudent);
router.post('/admin/reset-all-demo', authenticateToken, authorizeRoles('ADMIN'), resetAllDemoData);

// --- Attendance Simulation Route ---
router.get('/attendance', authenticateToken, authorizeRoles('CC'), getAttendance);

// --- Notifications Endpoints (defined inline for simplicity) ---
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const list = await query(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 30
    `, [req.user.id]);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving notifications.' });
  }
});

router.post('/notifications/read', authenticateToken, async (req, res) => {
  try {
    await run(`UPDATE notifications SET read = 1 WHERE user_id = ?`, [req.user.id]);
    res.json({ message: 'Notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating notifications.' });
  }
});

export default router;
