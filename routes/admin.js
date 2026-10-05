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
    res.status(500).json({ success: false, message: err.message });
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
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Admin
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    let query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort('-createdAt');

    res.json({ success: true, total, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (activate/deactivate, change role, etc.)
// @access  Admin
router.put('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, isActive },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Admin
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Remove profile
    if (user.role === 'student') await Student.findOneAndDelete({ user: user._id });
    if (user.role === 'teacher') await Teacher.findOneAndDelete({ user: user._id });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
