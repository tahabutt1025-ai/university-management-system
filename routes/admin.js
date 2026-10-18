const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const Fee = require('../models/Fee');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Admin
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    const [
      totalStudents,
      totalTeachers,
      totalCourses,
      totalFeesPaid,
      totalFeesPending,
      recentStudents,
      lowAttendanceStudents
    ] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments(),
      Course.countDocuments({ isActive: true }),
      Fee.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
      Fee.aggregate([{ $match: { status: 'unpaid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Student.find().sort('-createdAt').limit(5).populate('user', 'name email avatar'),
      getAtRiskStudents()
    ]);

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalTeachers,
        totalCourses,
        totalFeesPaid: totalFeesPaid[0]?.total || 0,
        totalFeesPending: totalFeesPending[0]?.total || 0
      },
      recentStudents,
      atRiskStudents: lowAttendanceStudents
    });
  } catch (err) {
    console.error('[admin/dashboard]', err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard data.' });
  }
});

async function getAtRiskStudents() {
  const students = await Student.find().populate('user', 'name email').limit(100);
  const atRisk = [];

  for (const student of students) {
    const total = await Attendance.countDocuments({ student: student._id });
    if (total === 0) continue;
    const present = await Attendance.countDocuments({ student: student._id, status: { $in: ['present', 'late'] } });
    const pct = (present / total) * 100;
    if (pct < 75) {
      atRisk.push({
        student: { id: student._id, name: student.user?.name, rollNumber: student.rollNumber },
        attendancePercentage: pct.toFixed(1)
      });
    }
  }
  return atRisk.slice(0, 10);
}

// @route   POST /api/admin/users
// @desc    Create a user (admin, teacher, student)
// @access  Admin
router.post('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, email, password, role, ...profileData } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const user = await User.create({ name, email, password, role });

    let profile = null;
    if (role === 'student') {
      profile = await Student.create({
        user: user._id,
        rollNumber: profileData.rollNumber || `STU-${Date.now()}`,
        department: profileData.department || 'Computer Science',
        semester: profileData.semester || 1,
        section: profileData.section || 'A',
        guardianName: profileData.guardianName,
        guardianPhone: profileData.guardianPhone
      });
    } else if (role === 'teacher') {
      profile = await Teacher.create({
        user: user._id,
        employeeId: profileData.employeeId || `EMP-${Date.now()}`,
        department: profileData.department || 'Computer Science',
        designation: profileData.designation || 'Lecturer',
        qualification: profileData.qualification,
        specialization: profileData.specialization
      });
    }

    res.status(201).json({ success: true, user, profile });
  } catch (err) {
    console.error('[admin/users/POST]', err);
    res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Admin
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { role, page = 1 } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const search = req.query.search;
    let query = {};
    if (role) query.role = role;
    if (search) {
      // H-08 FIX: escape special regex characters
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort('-createdAt');

    res.json({ success: true, total, users });
  } catch (err) {
    console.error('[admin/users/GET]', err);
    res.status(500).json({ success: false, message: 'Failed to load users.' });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (activate/deactivate, change role, etc.)
// @access  Admin
router.put('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    // S-07 FIX: Guard against demoting or deactivating the last active admin (same as DELETE)
    const { name, email, role, isActive } = req.body;
    const isBeingDeactivated = isActive === false || isActive === 'false';
    const isBeingDemoted = role && role !== 'admin' && target.role === 'admin';

    if (target.role === 'admin' && (isBeingDeactivated || isBeingDemoted)) {
      // Prevent self-demotion
      if (req.params.id === req.user._id.toString()) {
        return res.status(400).json({ success: false, message: 'You cannot demote or deactivate your own admin account.' });
      }
      const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot deactivate or demote the last active admin account.' });
      }
    }

    // S-06 FIX: Allow-list updatable fields
    const allowedUpdate = {};
    if (name     !== undefined) allowedUpdate.name     = String(name).trim().slice(0, 100);
    if (email    !== undefined) allowedUpdate.email    = String(email).trim().toLowerCase();
    if (role     !== undefined && ['student', 'teacher', 'admin'].includes(role)) allowedUpdate.role = role;
    if (isActive !== undefined) allowedUpdate.isActive = Boolean(isActive === true || isActive === 'true');

    const user = await User.findByIdAndUpdate(
      req.params.id,
      allowedUpdate,
      { new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    console.error('[admin/users/PUT]', err);
    res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Deactivate a user (soft delete — preserves all academic records)
// @access  Admin
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    // Guard: admin cannot deactivate their own account
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Guard: prevent removing the last active admin
    if (user.role === 'admin') {
      const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot deactivate the last admin account.' });
      }
    }

    // Soft delete — preserve all student/teacher records
    user.isActive = false;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'User deactivated. All academic records are preserved.' });
  } catch (err) {
    console.error('[admin/users/DELETE]', err);
    res.status(500).json({ success: false, message: 'Failed to deactivate user.' });
  }
});

// @route   GET /api/admin/reports/department
// @desc    Get department-wise statistics
// @access  Admin
router.get('/reports/department', protect, authorize('admin'), async (req, res) => {
  try {
    const deptStats = await Student.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({ success: true, stats: deptStats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/admin/reports/fees
// @desc    Get fee collection report
// @access  Admin
router.get('/reports/fees', protect, authorize('admin'), async (req, res) => {
  try {
    const feeStats = await Fee.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          paidAmount: { $sum: '$paidAmount' }
        }
      }
    ]);

    const monthlyCollection = await Fee.aggregate([
      { $match: { status: 'paid' } },
      {
        $group: {
          _id: { month: { $month: '$paidDate' }, year: { $year: '$paidDate' } },
          total: { $sum: '$paidAmount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({ success: true, feeStats, monthlyCollection });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
