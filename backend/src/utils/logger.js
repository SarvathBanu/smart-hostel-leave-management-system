import { run } from '../db/db.js';

/**
 * Log user actions to audit_logs table
 * @param {object} param0 
 * @param {number} param0.userId
 * @param {string} param0.userName
 * @param {string} param0.userEmail
 * @param {string} param0.action
 * @param {string} param0.details
 * @param {object} param0.req - Express Request Object (to extract headers)
 */
export async function logAction({ userId, userName, userEmail, action, details, req }) {
  try {
    let ipAddress = 'Unknown';
    let browser = 'Unknown';
    let device = 'Unknown';

    if (req) {
      ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
      const userAgent = req.headers['user-agent'] || '';

      // Simple browser parsing
      if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Chrome')) browser = 'Chrome';
      else if (userAgent.includes('Safari')) browser = 'Safari';
      else if (userAgent.includes('Edge')) browser = 'Edge';
      else browser = 'Other';

      // Simple device parsing
      if (userAgent.includes('Mobi')) device = 'Mobile';
      else if (userAgent.includes('Tablet')) device = 'Tablet';
      else device = 'Desktop';
    }

    await run(`
      INSERT INTO audit_logs (user_id, user_name, user_email, action, details, ip_address, device, browser)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, userName, userEmail, action, details, ipAddress, device, browser]);
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}
