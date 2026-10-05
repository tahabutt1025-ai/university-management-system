const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Course = require('../models/Course');

// @route   POST /api/attendance
// @desc    Mark attendance for a class session
// @access  Teacher
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { courseId, date, records } = req.body;
    // records: [{ studentId, status, remarks }]

    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Teacher profile not found' });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const results = [];
    const errors = [];

    for (const record of records) {
      try {
        const att = await Attendance.findOneAndUpdate(
          { student: record.studentId, course: courseId, date: attendanceDate },
          {
            student: record.studentId,
            course: courseId,
            markedBy: teacher?._id,
            date: attendanceDate,
            status: record.status,
            remarks: record.remarks
          },
          { upsert: true, new: true, runValidators: true }
        );
        results.push(att);
      } catch (e) {
        errors.push({ studentId: record.studentId, error: e.message });
      }
    }

    res.json({
      success: true,
      message: `Attendance marked for ${results.length} students`,
      results,
      errors
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/attendance
// @desc    Get attendance records
// @access  All authenticated
router.get('/', protect, async (req, res) => {
  try {
    const { courseId, studentId, startDate, endDate, status, page = 1, limit = 50 } = req.query;
    let query = {};

    if (courseId) query.course = courseId;
    if (studentId) query.student = studentId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Students can only see their own attendance
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id });
      if (student) query.student = student._id;
    }

    const total = await Attendance.countDocuments(query);
    const records = await Attendance.find(query)
      .populate('student', 'rollNumber')
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .populate('course', 'courseName courseCode')
      .sort('-date')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, total, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/attendance/course/:courseId/date/:date
// @desc    Get attendance for a specific course on a specific date
// @access  Teacher, Admin
router.get('/course/:courseId/date/:date', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const date = new Date(req.params.date);
    date.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      course: req.params.courseId,
      date: { $gte: date, $lte: endDate }
    })
      .populate({ path: 'student', populate: { path: 'user', select: 'name avatar' } });

    // Get all enrolled students
    const course = await Course.findById(req.params.courseId)
      .populate({ path: 'enrolledStudents', populate: { path: 'user', select: 'name avatar' } });

    const markedIds = new Set(records.map(r => r.student._id.toString()));
    const unmarked = course.enrolledStudents.filter(s => !markedIds.has(s._id.toString()));

    res.json({ success: true, records, unmarkedStudents: unmarked, course: { name: course.courseName, code: course.courseCode } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/attendance/:id
// @desc    Update attendance record
// @access  Teacher, Admin
router.put('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const record = await Attendance.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
