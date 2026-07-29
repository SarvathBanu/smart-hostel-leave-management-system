import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne, run } from '../db/db.js';
import { logAction } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyhlmsjwt2026';

export async function login(req, res) {
  const { identifier, password } = req.body; // email or register_number

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Email/Register number and password are required.' });
  }

  try {
    // Search user by email or register_number
    const user = await queryOne(`
      SELECT * FROM users 
      WHERE email = ? OR register_number = ? OR email = ?
    `, [identifier, identifier, `${identifier}@college.edu`]);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. User not found.' });
    }

    // Verify password
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials. Incorrect password.' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Write audit log
    await logAction({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      action: 'LOGIN',
      details: `Successful login with identifier: ${identifier}`,
      req
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        phone: user.phone,
        register_number: user.register_number
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal Server Error during login.' });
  }
}

export async function getProfile(req, res) {
  try {
    const userId = req.user.id;
    const user = await queryOne(`SELECT id, email, register_number, role, name, phone, created_at FROM users WHERE id = ?`, [userId]);

    if (!user) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    let profileData = { ...user };

    // If student, pull extra fields
    if (user.role === 'STUDENT') {
      const studentData = await queryOne(`SELECT * FROM students WHERE user_id = ?`, [userId]);
      profileData.studentDetails = studentData;

      let attendanceSummary = await queryOne(`SELECT * FROM attendance_summary WHERE student_id = ?`, [userId]);
      if (!attendanceSummary) {
        // Initialize default attendance summary
        await run(`
          INSERT INTO attendance_summary (student_id, current_attendance, approved_leave_days, remaining_safe_leave_days, working_days_conducted, conducted_periods, attendance_status)
          VALUES (?, 100.0, 0, 11, 45, 405, 'Safe')
        `, [userId]);
        attendanceSummary = await queryOne(`SELECT * FROM attendance_summary WHERE student_id = ?`, [userId]);
      }
      profileData.attendanceSummary = attendanceSummary;
    }

    res.json(profileData);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Error retrieving user profile.' });
  }
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required.' });
  }

  try {
    const user = await queryOne(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isPasswordValid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Incorrect current password.' });
    }

    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
    await run(`UPDATE users SET password_hash = ? WHERE id = ?`, [hashedNewPassword, userId]);

    await logAction({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      action: 'CHANGE_PASSWORD',
      details: 'User successfully updated password',
      req
    });

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ message: 'Error updating password.' });
  }
}

export async function updateProfile(req, res) {
  const { name, phone } = req.body;
  const userId = req.user.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name is required.' });
  }

  try {
    const user = await queryOne(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const updatedName = name.trim();
    const updatedPhone = phone ? phone.trim() : user.phone;

    await run(`UPDATE users SET name = ?, phone = ? WHERE id = ?`, [updatedName, updatedPhone, userId]);

    await logAction({
      userId: user.id,
      userName: updatedName,
      userEmail: user.email,
      action: 'UPDATE_PROFILE',
      details: `User updated profile. Name changed from "${user.name}" to "${updatedName}"`,
      req
    });

    const updatedProfile = await queryOne(`SELECT id, email, register_number, role, name, phone, created_at FROM users WHERE id = ?`, [userId]);
    
    let profileData = { ...updatedProfile };
    if (updatedProfile.role === 'STUDENT') {
      const studentData = await queryOne(`SELECT * FROM students WHERE user_id = ?`, [userId]);
      profileData.studentDetails = studentData;
    }

    res.json(profileData);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Error updating user profile.' });
  }
}

