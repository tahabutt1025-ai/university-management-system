const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');

// @route   GET /api/teachers
// @desc    Get all teachers
// @access  Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, department } = req.query;
    let query = {};
    if (department) query.department = department;

    const total = await Teacher.countDocuments(query);
    const teachers = await Teacher.find(query)
      .populate('user', 'name email phone avatar isActive')
      .populate('assignedCourses', 'courseName courseCode')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, count: teachers.length, total, teachers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/teachers/me
// @desc    Get current teacher's profile
// @access  Teacher
router.get('/me', protect, authorize('teacher'), async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user._id })
      .populate('user', 'name email phone avatar')
      .populate({ path: 'assignedCourses', populate: { path: 'enrolledStudents', select: 'rollNumber department semester' } });

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }
    res.json({ success: true, teacher });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/teachers/:id
// @desc    Get teacher by ID
// @access  Admin, Teacher
router.get('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('user', 'name email phone avatar')
      .populate('assignedCourses', 'courseName courseCode');

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    res.json({ success: true, teacher });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/teachers/:id
// @desc    Update teacher profile
// @access  Admin, Teacher (own)
router.put('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    res.json({ success: true, teacher });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/teachers/:id/class-overview
// @desc    Get performance overview of teacher's class
// @access  Teacher, Admin
router.get('/:id/class-overview', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    const courses = await Course.find({ teacher: teacher._id })
      .populate('enrolledStudents', 'rollNumber department semester');

    const overview = await Promise.all(courses.map(async (course) => {
      const studentIds = course.enrolledStudents.map(s => s._id);
      
      // Attendance stats
      const totalAttendance = await Attendance.countDocuments({ course: course._id });
      const presentCount = await Attendance.countDocuments({ course: course._id, status: 'present' });
      const avgAttendance = totalAttendance > 0 ? ((presentCount / totalAttendance) * 100).toFixed(1) : '0.0';

      // Grade stats
      const grades = await Grade.find({ course: course._id, examType: 'Midterm' });
      const avgGrade = grades.length > 0 
        ? (grades.reduce((acc, g) => acc + (g.marksObtained / g.totalMarks * 100), 0) / grades.length).toFixed(1)
        : null;

      return {
        course: { id: course._id, name: course.courseName, code: course.courseCode },
        studentCount: course.enrolledStudents.length,
        avgAttendance: `${avgAttendance}%`,
        avgMidtermGrade: avgGrade ? `${avgGrade}%` : 'N/A'
      };
    }));

    res.json({ success: true, overview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
