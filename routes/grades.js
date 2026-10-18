const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Grade = require('../models/Grade');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Course = require('../models/Course');

// ── Helper: verify teacher teaches this course ────────────────────────────────
async function requireCourseOwner(req, res, courseId) {
  if (req.user.role === 'admin') return true;
  const teacher = await Teacher.findOne({ user: req.user._id });
  if (!teacher) {
    res.status(403).json({ success: false, message: 'Teacher profile not found.' });
    return false;
  }
  const course = await Course.findById(courseId).select('teacher');
  if (!course) {
    res.status(404).json({ success: false, message: 'Course not found.' });
    return false;
  }
  if (course.teacher?.toString() !== teacher._id.toString()) {
    res.status(403).json({ success: false, message: 'Access denied: you can only manage grades for your own courses.' });
    return false;
  }
  return true;
}

// ── Helper: compute letter grade ─────────────────────────────────────────────
// B-03 FIX: single consistent grading scale used everywhere
function computeLetterGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'A-';
  if (percentage >= 75) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 65) return 'B-';
  if (percentage >= 60) return 'C+';
  if (percentage >= 55) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

// @route   POST /api/grades
// @desc    Upload/add a grade
// @access  Teacher (own courses), Admin
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { student, course, examType, marksObtained, totalMarks, weightage, remarks, examDate } = req.body;

    if (!student || !course || !examType || marksObtained === undefined || !totalMarks) {
      return res.status(400).json({ success: false, message: 'student, course, examType, marksObtained and totalMarks are required.' });
    }

    // S-05 FIX: Teacher must teach this course
    if (!(await requireCourseOwner(req, res, course))) return;

    // B-03 FIX: Validate marks cannot exceed total
    const obtainedNum = parseFloat(marksObtained);
    const totalNum = parseFloat(totalMarks);
    if (isNaN(obtainedNum) || isNaN(totalNum) || obtainedNum < 0 || totalNum <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid marks values.' });
    }
    if (obtainedNum > totalNum) {
      return res.status(400).json({ success: false, message: 'Marks obtained cannot exceed total marks.' });
    }

    const teacher = await Teacher.findOne({ user: req.user._id });
    const percentage = (obtainedNum / totalNum) * 100;
    const letterGrade = computeLetterGrade(percentage);

    const grade = await Grade.create({
      student,
      course,
      examType: String(examType).trim().slice(0, 50),
      marksObtained: obtainedNum,
      totalMarks: totalNum,
      weightage: weightage !== undefined ? Math.min(Math.max(parseFloat(weightage) || 0, 0), 100) : undefined,
      letterGrade,
      remarks: remarks ? String(remarks).slice(0, 500) : undefined,
      examDate: examDate || new Date(),
      gradedBy: teacher?._id || req.body.gradedBy
    });

    res.status(201).json({ success: true, grade });
  } catch (err) {
    console.error('[grades/POST]', err);
    res.status(500).json({ success: false, message: 'Failed to save grade.' });
  }
});

// @route   POST /api/grades/bulk
// @desc    Upload grades in bulk
// @access  Teacher (own courses), Admin
router.post('/bulk', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { grades } = req.body;
    if (!Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ success: false, message: 'grades array is required.' });
    }

    const teacher = await Teacher.findOne({ user: req.user._id });
    const processed = [];
    const errors = [];

    for (const g of grades) {
      // S-05 FIX: Verify ownership for each course
      if (req.user.role !== 'admin') {
        const course = await Course.findById(g.course).select('teacher');
        if (!course || course.teacher?.toString() !== teacher?._id.toString()) {
          errors.push({ ...g, error: 'You do not teach this course.' });
          continue;
        }
      }

      const obtainedNum = parseFloat(g.marksObtained);
      const totalNum = parseFloat(g.totalMarks);
      if (isNaN(obtainedNum) || isNaN(totalNum) || obtainedNum > totalNum || obtainedNum < 0 || totalNum <= 0) {
        errors.push({ ...g, error: 'Invalid marks values.' });
        continue;
      }

      const percentage = (obtainedNum / totalNum) * 100;
      processed.push({
        student: g.student,
        course: g.course,
        examType: String(g.examType || '').trim().slice(0, 50),
        marksObtained: obtainedNum,
        totalMarks: totalNum,
        weightage: g.weightage,
        letterGrade: computeLetterGrade(percentage),
        remarks: g.remarks ? String(g.remarks).slice(0, 500) : undefined,
        examDate: g.examDate || new Date(),
        gradedBy: teacher?._id || g.gradedBy
      });
    }

    if (processed.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid grades to insert.', errors });
    }

    const result = await Grade.insertMany(processed, { ordered: false });
    res.status(201).json({ success: true, count: result.length, errors });
  } catch (err) {
    console.error('[grades/bulk]', err);
    res.status(500).json({ success: false, message: 'Failed to save bulk grades.' });
  }
});

// @route   GET /api/grades
// @desc    Get grades
// @access  All authenticated
router.get('/', protect, async (req, res) => {
  try {
    const { courseId, examType, page = 1 } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    let query = {};

    if (courseId) query.course = courseId;
    if (examType) query.examType = examType;

    // Students can only see own grades (H-02 FIX)
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id });
      if (!student) return res.json({ success: true, total: 0, grades: [] });
      query.student = student._id;
    } else if (req.query.studentId) {
      query.student = req.query.studentId;
    }

    const total = await Grade.countDocuments(query);
    const grades = await Grade.find(query)
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .populate('student', 'rollNumber')
      .populate('course', 'courseName courseCode')
      .sort('-examDate')
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ success: true, total, grades });
  } catch (err) {
    console.error('[grades/GET]', err);
    res.status(500).json({ success: false, message: 'Failed to load grades.' });
  }
});

// @route   PUT /api/grades/:id
// @desc    Update a grade
// @access  Teacher (own course), Admin
router.put('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const grade = await Grade.findById(req.params.id);
    if (!grade) return res.status(404).json({ success: false, message: 'Grade not found' });

    // S-05 FIX: Teacher must teach this course
    if (!(await requireCourseOwner(req, res, grade.course.toString()))) return;

    // S-06 FIX: Allow-list and validate
    const { marksObtained, totalMarks, weightage, remarks, examDate, examType } = req.body;
    const allowedUpdate = {};

    const obtainedNum = marksObtained !== undefined ? parseFloat(marksObtained) : grade.marksObtained;
    const totalNum = totalMarks !== undefined ? parseFloat(totalMarks) : grade.totalMarks;

    if (isNaN(obtainedNum) || isNaN(totalNum) || obtainedNum > totalNum || obtainedNum < 0) {
      return res.status(400).json({ success: false, message: 'Marks obtained cannot exceed total marks.' });
    }

    if (marksObtained !== undefined) allowedUpdate.marksObtained = obtainedNum;
    if (totalMarks    !== undefined) allowedUpdate.totalMarks    = totalNum;
    if (weightage     !== undefined) allowedUpdate.weightage     = Math.min(Math.max(parseFloat(weightage) || 0, 0), 100);
    if (remarks       !== undefined) allowedUpdate.remarks       = String(remarks).slice(0, 500);
    if (examDate      !== undefined) allowedUpdate.examDate      = examDate;
    if (examType      !== undefined) allowedUpdate.examType      = String(examType).trim().slice(0, 50);

    // Recompute letter grade
    allowedUpdate.letterGrade = computeLetterGrade((obtainedNum / totalNum) * 100);

    const updated = await Grade.findByIdAndUpdate(req.params.id, allowedUpdate, {
      new: true, runValidators: true
    });
    res.json({ success: true, grade: updated });
  } catch (err) {
    console.error('[grades/PUT]', err);
    res.status(500).json({ success: false, message: 'Failed to update grade.' });
  }
});

// @route   DELETE /api/grades/:id
// @desc    Delete a grade
// @access  Teacher (own course), Admin
router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const grade = await Grade.findById(req.params.id);
    if (!grade) return res.status(404).json({ success: false, message: 'Grade not found' });

    // S-05 FIX: Teacher must teach this course
    if (!(await requireCourseOwner(req, res, grade.course.toString()))) return;

    await Grade.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Grade deleted' });
  } catch (err) {
    console.error('[grades/DELETE]', err);
    res.status(500).json({ success: false, message: 'Failed to delete grade.' });
  }
});

// @route   GET /api/grades/course/:courseId/stats
// @desc    Get statistics for a course's grades
// @access  Teacher (own), Admin
router.get('/course/:courseId/stats', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    // S-05 FIX: Teacher must teach this course
    if (!(await requireCourseOwner(req, res, req.params.courseId))) return;

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

    // B-03 FIX: Use consistent grade scale (same as computeLetterGrade)
    const distribution = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    percentages.forEach(p => {
      if (p >= 90) distribution['A+']++;
      else if (p >= 80) distribution['A']++;
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
    console.error('[grades/stats]', err);
    res.status(500).json({ success: false, message: 'Failed to load grade statistics.' });
  }
});

module.exports = router;
