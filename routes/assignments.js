const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Assignment = require('../models/Assignment');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

// @route   POST /api/assignments
// @desc    Create assignment
// @access  Teacher, Admin
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user._id });
    const assignment = await Assignment.create({
      ...req.body,
      createdBy: teacher?._id || req.body.createdBy
    });
    res.status(201).json({ success: true, assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/assignments
// @desc    Get assignments
// @access  All authenticated
router.get('/', protect, async (req, res) => {
  try {
    const { courseId, page = 1, limit = 20 } = req.query;
    let query = {};
    if (courseId) query.course = courseId;

    // Students: get assignments for enrolled courses
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id });
      if (student && student.enrolledCourses.length > 0) {
        query.course = { $in: student.enrolledCourses };
      }
    }

    const total = await Assignment.countDocuments(query);
    const assignments = await Assignment.find(query)
      .populate('course', 'courseName courseCode')
      .populate({ path: 'createdBy', populate: { path: 'user', select: 'name' } })
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-submissions');  // Don't send all submissions by default

    res.json({ success: true, total, assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/assignments/:id
// @desc    Get assignment by ID
// @access  All authenticated
router.get('/:id', protect, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('course', 'courseName courseCode')
      .populate({ path: 'createdBy', populate: { path: 'user', select: 'name' } })
      .populate({ path: 'submissions.student', populate: { path: 'user', select: 'name' } });

    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    // Students only see their own submission
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id });
      const mySubmission = assignment.submissions.find(
        s => s.student._id.toString() === student?._id.toString()
      );
      const result = assignment.toObject();
      result.mySubmission = mySubmission;
      delete result.submissions;
      return res.json({ success: true, assignment: result });
    }

    res.json({ success: true, assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/assignments/:id/submit
// @desc    Submit assignment
// @access  Student
router.post('/:id/submit', protect, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    const existingSubmission = assignment.submissions.findIndex(
      s => s.student.toString() === student._id.toString()
    );

    const isLate = new Date() > new Date(assignment.dueDate);
    const submission = {
      student: student._id,
      submittedAt: new Date(),
      fileUrl: req.body.fileUrl,
      text: req.body.text,
      status: isLate ? 'late' : 'submitted'
    };

    if (existingSubmission >= 0) {
      assignment.submissions[existingSubmission] = submission;
    } else {
      assignment.submissions.push(submission);
    }

    await assignment.save();
    res.json({ success: true, message: isLate ? 'Submitted (Late)' : 'Submitted successfully', submission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/assignments/:id/grade/:studentId
// @desc    Grade a submission
// @access  Teacher, Admin
router.put('/:id/grade/:studentId', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { marksObtained, feedback } = req.body;
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    const subIdx = assignment.submissions.findIndex(
      s => s.student.toString() === req.params.studentId
    );

    if (subIdx === -1) return res.status(404).json({ success: false, message: 'Submission not found' });

    assignment.submissions[subIdx].marksObtained = marksObtained;
    assignment.submissions[subIdx].feedback = feedback;
    assignment.submissions[subIdx].status = 'graded';
    await assignment.save();

    res.json({ success: true, message: 'Grade recorded' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/assignments/:id
// @desc    Delete assignment
// @access  Teacher, Admin
router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
