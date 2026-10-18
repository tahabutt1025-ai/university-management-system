const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { protect } = require('../middleware/auth');

// ── Shared email service (single source of truth) ──────────────────────────
const emailService = require('../utils/emailService');

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

// ── Password strength validator ───────────────────────────────────────────────
const passwordPolicy = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter')
  .matches(/[0-9]/).withMessage('Password must contain at least one number');

// @route   POST /api/auth/register
// @desc    Register a new student account (public — student role only)
// @access  Public
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  passwordPolicy,
  // Role is ignored — public registration always creates a student
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, email, password, ...profileData } = req.body;
    // S-01 FIX: Public registration creates students only, never admin/teacher
    const role = 'student';

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, role });

    const rollNumber = profileData.rollNumber || `STU-${Date.now()}`;
    await Student.create({
      user: user._id,
      rollNumber,
      department: profileData.department || 'Computer Science',
      semester:   profileData.semester   || 1,
      section:    profileData.section    || 'A'
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +failedLoginCount +lockUntil');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Account lockout check
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(401).json({
        success: false,
        message: `Account locked. Try again in ${minutesLeft} minute(s).`
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment failed login count
      user.failedLoginCount = (user.failedLoginCount || 0) + 1;
      if (user.failedLoginCount >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 minutes
        user.failedLoginCount = 0;
      }
      await user.save({ validateBeforeSave: false });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated. Contact admin.' });
    }

    // Reset failed login count on success
    user.failedLoginCount = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
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
    console.error('[auth/me]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
});

// @route   PUT /api/auth/updatepassword
// @desc    Update password (authenticated)
// @access  Private
router.put('/updatepassword', protect, [
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const user = await User.findById(req.user._id).select('+password');
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both currentPassword and newPassword are required.' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('[auth/updatepassword]', err);
    res.status(500).json({ success: false, message: 'Failed to update password.' });
  }
});

// @route   PUT /api/auth/updateprofile
// @desc    Update user profile (allow-listed fields only)
// @access  Private
router.put('/updateprofile', protect, async (req, res) => {
  try {
    // S-06 FIX: Allow-list updatable fields — never pass raw req.body
    const { name, phone, avatar } = req.body;
    const allowedUpdates = {};
    if (name !== undefined) allowedUpdates.name = String(name).trim().slice(0, 100);
    if (phone !== undefined) allowedUpdates.phone = String(phone).trim().slice(0, 20);
    if (avatar !== undefined) allowedUpdates.avatar = String(avatar).trim().slice(0, 500);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      allowedUpdates,
      { new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    console.error('[auth/updateprofile]', err);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Request a password reset link
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  // Always respond the same way to prevent account enumeration
  const genericResponse = { success: true, message: 'If that email is registered, a reset link has been sent.' };

  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !user.isActive) {
      return res.json(genericResponse); // don't reveal non-existence
    }

    // Generate a raw token, store its hash on the user
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken   = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetURL = `${frontendUrl}/reset-password/${rawToken}`;

    try {
      await emailService.sendMail({
        to:      user.email,
        subject: 'UniManage — Password Reset Request',
        text:    `You requested a password reset.\n\nClick the link below to set a new password (valid for 1 hour):\n\n${resetURL}\n\nIf you did not request this, ignore this email — your password will not change.`,
        html:    `<p>You requested a password reset.</p><p><a href="${resetURL}">Reset your password</a> (valid for 1 hour)</p><p>If you did not request this, ignore this email.</p>`
      });
    } catch (mailErr) {
      console.error('[EMAIL] Failed to send reset email:', mailErr.message);
      user.passwordResetToken   = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: 'Failed to send reset email. Try again later.' });
    }

    res.json(genericResponse);
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password using a one-time token
// @access  Public
router.post('/reset-password/:token', [
  passwordPolicy
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
    }

    user.password             = req.body.password;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    user.failedLoginCount     = 0;
    user.lockUntil            = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('[auth/reset-password]', err);
    res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
});

module.exports = router;
