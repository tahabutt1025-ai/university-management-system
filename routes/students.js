const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Fee = require('../models/Fee');
const Assignment = require('../models/Assignment');

// @route   GET /api/students
// @desc    Get all students
// @access  Admin, Teacher
router.get('/', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { page = 1, limit = 20, department, semester, search } = req.query;
    let query = {};

    if (department) query.department = department;
    if (semester) query.semester = parseInt(semester);

    let students = Student.find(query).populate('user', 'name email phone avatar isActive');

    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = users.map(u => u._id);
      query.$or = [
        { user: { $in: userIds } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
      students = Student.find(query).populate('user', 'name email phone avatar isActive');
    }

    const total = await Student.countDocuments(query);
    const result = await students
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('enrolledCourses', 'courseName courseCode');

    res.json({
      success: true,
      count: result.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      students: result
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/students/me
// @desc    Get current student's profile
// @access  Student
router.get('/me', protect, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id })
      .populate('user', 'name email phone avatar')
      .populate('enrolledCourses', 'courseName courseCode creditHours schedule teacher')
      .populate({ path: 'enrolledCourses', populate: { path: 'teacher', populate: { path: 'user', select: 'name' } } });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/students/:id
// @desc    Get student by ID
// @access  Admin, Teacher, Student (own)
router.get('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('user', 'name email phone avatar createdAt')
      .populate('enrolledCourses', 'courseName courseCode creditHours');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/students/:id
// @desc    Update student profile
// @access  Admin, Student (own)
router.put('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    }).populate('user', 'name email');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/students/:id/attendance-summary
// @desc    Get attendance summary for a student
// @access  Student (own), Teacher, Admin
router.get('/:id/attendance-summary', protect, async (req, res) => {
  try {
    const { courseId } = req.query;
    let matchQuery = { student: req.params.id };
    if (courseId) matchQuery.course = courseId;

    const attendance = await Attendance.find(matchQuery)
      .populate('course', 'courseName courseCode');

    // Group by course
    const summary = {};
    attendance.forEach(record => {
      const cId = record.course._id.toString();
      if (!summary[cId]) {
        summary[cId] = {
          course: record.course,
          total: 0, present: 0, absent: 0, late: 0, excused: 0
        };
      }
      summary[cId].total++;
      summary[cId][record.status]++;
    });

    // Calculate percentages
    const result = Object.values(summary).map(s => ({
      ...s,
      attendancePercentage: s.total > 0 ? ((s.present + s.late) / s.total * 100).toFixed(1) : '0.0'
    }));

    res.json({ success: true, summary: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/students/:id/grades-summary
// @desc    Get grades summary for a student
// @access  Student (own), Teacher, Admin
router.get('/:id/grades-summary', protect, async (req, res) => {
  try {
    const grades = await Grade.find({ student: req.params.id })
      .populate('course', 'courseName courseCode')
      .sort('-examDate');

    const summary = {};
    grades.forEach(g => {
      const cId = g.course._id.toString();
      if (!summary[cId]) {
        summary[cId] = { course: g.course, grades: [], totalWeightedScore: 0, totalWeightage: 0 };
      }
      const pct = (g.marksObtained / g.totalMarks) * 100;
      summary[cId].grades.push({
        examType: g.examType,
        marksObtained: g.marksObtained,
        totalMarks: g.totalMarks,
        percentage: pct.toFixed(1),
        letterGrade: g.letterGrade,
        examDate: g.examDate
      });
      if (g.weightage) {
        summary[cId].totalWeightedScore += pct * g.weightage;
        summary[cId].totalWeightage += g.weightage;
      }
    });

    const result = Object.values(summary).map(s => ({
      ...s,
      overallPercentage: s.totalWeightage > 0 
        ? (s.totalWeightedScore / s.totalWeightage).toFixed(1) 
        : s.grades.length > 0
          ? (s.grades.reduce((acc, g) => acc + parseFloat(g.percentage), 0) / s.grades.length).toFixed(1)
          : '0.0'
    }));

    res.json({ success: true, summary: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
