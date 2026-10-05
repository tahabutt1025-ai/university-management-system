const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Grade = require('../models/Grade');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

// @route   POST /api/grades
// @desc    Upload/add a grade
// @access  Teacher, Admin
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user._id });
    const gradeData = {
      ...req.body,
      gradedBy: teacher?._id || req.body.gradedBy
    };

    const grade = await Grade.create(gradeData);
    res.status(201).json({ success: true, grade });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/grades/bulk
// @desc    Upload grades in bulk
// @access  Teacher, Admin
router.post('/bulk', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { grades } = req.body;
    const teacher = await Teacher.findOne({ user: req.user._id });

    const gradesWithTeacher = grades.map(g => ({
      ...g,
      gradedBy: teacher?._id || g.gradedBy
    }));

    const result = await Grade.insertMany(gradesWithTeacher, { ordered: false });
    res.status(201).json({ success: true, count: result.length, grades: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/grades
// @desc    Get grades
// @access  All authenticated
router.get('/', protect, async (req, res) => {
  try {
    const { courseId, studentId, examType, page = 1, limit = 50 } = req.query;
    let query = {};

    if (courseId) query.course = courseId;
    if (examType) query.examType = examType;

    // Students can only see own grades
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id });
      if (student) query.student = student._id;
    } else if (studentId) {
      query.student = studentId;
    }

    const total = await Grade.countDocuments(query);
    const grades = await Grade.find(query)
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .populate('student', 'rollNumber')
      .populate('course', 'courseName courseCode')
      .sort('-examDate')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, total, grades });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/grades/:id
// @desc    Update a grade
// @access  Teacher, Admin
router.put('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const grade = await Grade.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!grade) return res.status(404).json({ success: false, message: 'Grade not found' });
    res.json({ success: true, grade });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/grades/:id
// @desc    Delete a grade
// @access  Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Grade.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Grade deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/grades/course/:courseId/stats
// @desc    Get statistics for a course's grades
// @access  Teacher, Admin
router.get('/course/:courseId/stats', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { examType } = req.query;
    let query = { course: req.params.courseId };
    if (examType) query.examType = examType;

    const grades = await Grade.find(query);
    if (grades.length === 0) {
      return res.json({ success: true, stats: null, message: 'No grades found' });
    }

    const percentages = grades.map(g => (g.marksObtained / g.totalMarks) * 100);
    const avg = percentages.reduce((a, b) => a + b, 0) / percentages.length;
    const max = Math.max(...percentages);
    const min = Math.min(...percentages);

    const distribution = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    percentages.forEach(p => {
      if (p >= 80) distribution['A']++;
      else if (p >= 70) distribution['B']++;
      else if (p >= 60) distribution['C']++;
      else if (p >= 50) distribution['D']++;
      else distribution['F']++;
    });

    res.json({
      success: true,
      stats: {
        count: grades.length,
        average: avg.toFixed(1),
        highest: max.toFixed(1),
        lowest: min.toFixed(1),
        passRate: ((percentages.filter(p => p >= 50).length / percentages.length) * 100).toFixed(1),
        distribution
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
