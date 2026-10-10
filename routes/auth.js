const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { protect } = require('../middleware/auth');

// ── Optional email helper (only active when EMAIL_HOST is set) ──────────────
let transporter = null;
if (process.env.EMAIL_HOST) {
  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST,
      port:   parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth:   { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
  } catch (e) {
    console.warn('[EMAIL] nodemailer not installed:', e.message);
  }
}

async function sendMail({ to, subject, text }) {
  if (!transporter) {
    console.warn('[EMAIL] No transporter configured — would send to:', to, '|', subject);
    return;
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@university.edu',
    to, subject, text
  });
}

// ── Helper: Generate JWT ──────────────────────────────────────────────────────
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '1h'
  });
};

// ── Helper: Send token response ───────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id:     user._id,
      name:   user.name,
      email:  user.email,
      role:   user.role,
      avatar: user.avatar
    }
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['student', 'teacher', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, email, password, role, ...profileData } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, role });

    // Create role-specific profile
    if (role === 'student') {
      const rollNumber = profileData.rollNumber || `STU-${Date.now()}`;
      await Student.create({
        user: user._id,
        rollNumber,
        department: profileData.department || 'Computer Science',
        semester:   profileData.semester   || 1,
        section:    profileData.section    || 'A'
      });
    } else if (role === 'teacher') {
      const employeeId = profileData.employeeId || `EMP-${Date.now()}`;
      await Teacher.create({
        user: user._id,
        employeeId,
        department:  profileData.department  || 'Computer Science',
        designation: profileData.designation || 'Lecturer'
      });
    }

    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated. Contact admin.' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user + profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let profile = null;

    if (user.role === 'student') {
      profile = await Student.findOne({ user: user._id })
        .populate('enrolledCourses', 'courseName courseCode');
    } else if (user.role === 'teacher') {
      profile = await Teacher.findOne({ user: user._id })
        .populate('assignedCourses', 'courseName courseCode');
    }

    res.json({ success: true, user, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/auth/updatepassword
// @desc    Update password (authenticated)
// @access  Private
router.put('/updatepassword', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both currentPassword and newPassword are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/auth/updateprofile
// @desc    Update user profile
// @access  Private
router.put('/updateprofile', protect, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, avatar },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Request a password reset link (does NOT reveal whether email exists)
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  // Always respond the same way to prevent account enumeration
  const genericResponse = { success: true, message: 'If that email is registered, a reset link has been sent.' };

  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (!user || !user.isActive) {
      return res.json(genericResponse); // don't reveal non-existence
    }

    // Generate a raw token, store its hash on the user
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken   = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;

    try {
      await sendMail({
        to:      user.email,
        subject: 'UniManage — Password Reset Request',
        text:    `You requested a password reset.\n\nClick the link below to set a new password (valid for 1 hour):\n\n${resetURL}\n\nIf you did not request this, ignore this email — your password will not change.`
      });
    } catch (mailErr) {
      // Don't fail the request if mail sending fails — just log
      console.error('[EMAIL] Failed to send reset email:', mailErr.message);
      // Clear the token so it can't be exploited without the email being delivered
      user.passwordResetToken   = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: 'Failed to send reset email. Try again later.' });
    }

    res.json(genericResponse);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password using a one-time token from the reset email
// @access  Public
router.post('/reset-password/:token', [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    // Hash the incoming raw token and look it up
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
    }

    // Set new password and clear reset fields
    user.password             = req.body.password;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
