const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Course = require('../models/Course');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

// @route   GET /api/courses
// @desc    Get all courses
// @access  All authenticated
router.get('/', protect, async (req, res) => {
  try {
    const { department, semester, isActive = true, page = 1, limit = 20 } = req.query;
    let query = {};
    if (department) query.department = department;
    if (semester) query.semester = parseInt(semester);
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const total = await Course.countDocuments(query);
    const courses = await Course.find(query)
      .populate({ path: 'teacher', populate: { path: 'user', select: 'name email' } })
      .populate('enrolledStudents', 'rollNumber')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, total, courses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/courses
// @desc    Create a new course
// @access  Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.create(req.body);

    // Assign to teacher
    if (req.body.teacher) {
      await Teacher.findByIdAndUpdate(req.body.teacher, {
        $addToSet: { assignedCourses: course._id }
      });
    }

    res.status(201).json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/courses/:id
// @desc    Get course by ID
// @access  All authenticated
router.get('/:id', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate({ path: 'teacher', populate: { path: 'user', select: 'name email phone' } })
      .populate({ path: 'enrolledStudents', populate: { path: 'user', select: 'name email' } });

    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete course
// @access  Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/courses/:id/enroll
// @desc    Enroll a student in a course
// @access  Admin, Teacher
router.post('/:id/enroll', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { studentId } = req.body;
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { enrolledStudents: studentId } },
      { new: true }
    );
    await Student.findByIdAndUpdate(studentId, {
      $addToSet: { enrolledCourses: course._id }
    });
    res.json({ success: true, message: 'Student enrolled', course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/courses/:id/enroll/:studentId
// @desc    Remove student from course
// @access  Admin
router.delete('/:id/enroll/:studentId', protect, authorize('admin'), async (req, res) => {
  try {
    await Course.findByIdAndUpdate(req.params.id, {
      $pull: { enrolledStudents: req.params.studentId }
    });
    await Student.findByIdAndUpdate(req.params.studentId, {
      $pull: { enrolledCourses: req.params.id }
    });
    res.json({ success: true, message: 'Student removed from course' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
