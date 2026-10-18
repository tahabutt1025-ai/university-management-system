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
    const { page = 1, department } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    let query = {};
    if (department) query.department = department;

    const total = await Teacher.countDocuments(query);
    const teachers = await Teacher.find(query)
      .populate('user', 'name email phone avatar isActive')
      .populate('assignedCourses', 'courseName courseCode')
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ success: true, count: teachers.length, total, teachers });
  } catch (err) {
    console.error('[teachers/GET]', err);
    res.status(500).json({ success: false, message: 'Failed to load teachers.' });
  }
});

// @route   GET /api/teachers/me
// @desc    Get current teacher's profile
// @access  Teacher
router.get('/me', protect, authorize('teacher'), async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user._id })
      .populate('user', 'name email phone avatar')
      .populate({
        path: 'assignedCourses',
        populate: {
          path: 'enrolledStudents',
          select: 'rollNumber department semester user',
          // N-2 FIX: nested populate user.name so teacher grade/attendance pages show student names
          populate: { path: 'user', select: 'name' }
        }
      });

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }
    res.json({ success: true, teacher });
  } catch (err) {
    console.error('[teachers/me]', err);
    res.status(500).json({ success: false, message: 'Failed to load teacher profile.' });
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
    console.error('[teachers/GET/:id]', err);
    res.status(500).json({ success: false, message: 'Failed to load teacher.' });
  }
});

// @route   PUT /api/teachers/:id
// @desc    Update teacher profile
// @access  Admin (any teacher), Teacher (own profile only, limited fields)
router.put('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    // S-05 FIX: Teachers can only update their own profile
    if (req.user.role === 'teacher') {
      const myTeacher = await Teacher.findOne({ user: req.user._id }).select('_id');
      if (!myTeacher || myTeacher._id.toString() !== teacher._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied: you can only update your own profile.' });
      }
    }

    // S-06 FIX: Allow-list fields — admins can change department/designation; teachers can change office hours/bio
    let allowedUpdate = {};
    if (req.user.role === 'admin') {
      const { department, designation, qualification, specialization, officeHours, bio } = req.body;
      if (department     !== undefined) allowedUpdate.department     = String(department).trim().slice(0, 100);
      if (designation    !== undefined) allowedUpdate.designation    = String(designation).trim().slice(0, 100);
      if (qualification  !== undefined) allowedUpdate.qualification  = String(qualification).trim().slice(0, 200);
      if (specialization !== undefined) allowedUpdate.specialization = String(specialization).trim().slice(0, 200);
      if (officeHours    !== undefined) allowedUpdate.officeHours    = String(officeHours).trim().slice(0, 100);
      if (bio            !== undefined) allowedUpdate.bio            = String(bio).trim().slice(0, 1000);
    } else {
      // Teacher can only update their office hours and bio
      const { officeHours, bio } = req.body;
      if (officeHours !== undefined) allowedUpdate.officeHours = String(officeHours).trim().slice(0, 100);
      if (bio         !== undefined) allowedUpdate.bio         = String(bio).trim().slice(0, 1000);
    }

    const updated = await Teacher.findByIdAndUpdate(req.params.id, allowedUpdate, {
      new: true, runValidators: true
    });
    res.json({ success: true, teacher: updated });
  } catch (err) {
    console.error('[teachers/PUT]', err);
    res.status(500).json({ success: false, message: 'Failed to update teacher profile.' });
  }
});

// @route   GET /api/teachers/:id/class-overview
// @desc    Get performance overview of teacher's class
// @access  Teacher (own), Admin
router.get('/:id/class-overview', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    // S-05 FIX: Teachers can only view their own class overview
    if (req.user.role === 'teacher') {
      const myTeacher = await Teacher.findOne({ user: req.user._id }).select('_id');
      if (!myTeacher || myTeacher._id.toString() !== teacher._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied: you can only view your own class overview.' });
      }
    }

    const courses = await Course.find({ teacher: teacher._id })
      .populate('enrolledStudents', 'rollNumber department semester');

    const overview = await Promise.all(courses.map(async (course) => {
      // B-01 FIX: Use consistent attendance calculation (present + late)
      const totalAttendance = await Attendance.countDocuments({ course: course._id });
      const presentCount = await Attendance.countDocuments({ course: course._id, status: { $in: ['present', 'late'] } });
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
    console.error('[teachers/class-overview]', err);
    res.status(500).json({ success: false, message: 'Failed to load class overview.' });
  }
});

module.exports = router;
