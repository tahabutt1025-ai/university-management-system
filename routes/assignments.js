const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Assignment = require('../models/Assignment');
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
    res.status(403).json({ success: false, message: 'Access denied: you can only manage assignments for your own courses.' });
    return false;
  }
  return true;
}

// @route   POST /api/assignments
// @desc    Create assignment
// @access  Teacher (own courses), Admin
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { course, title, description, dueDate, totalMarks, instructions } = req.body;

    if (!course || !title || !dueDate) {
      return res.status(400).json({ success: false, message: 'course, title and dueDate are required.' });
    }

    // S-05 FIX: Teacher must teach this course
    if (!(await requireCourseOwner(req, res, course))) return;

    const teacher = await Teacher.findOne({ user: req.user._id });

    // S-06 FIX: Use allow-listed fields, not raw req.body
    const assignment = await Assignment.create({
      course,
      title: String(title).trim().slice(0, 200),
      description: description ? String(description).trim().slice(0, 2000) : undefined,
      instructions: instructions ? String(instructions).trim().slice(0, 5000) : undefined,
      dueDate,
      totalMarks: totalMarks ? Math.max(parseFloat(totalMarks) || 0, 0) : 100,
      createdBy: teacher?._id || req.body.createdBy,
      submissions: []
    });

    res.status(201).json({ success: true, assignment });
  } catch (err) {
    console.error('[assignments/POST]', err);
    res.status(500).json({ success: false, message: 'Failed to create assignment.' });
  }
});

// @route   GET /api/assignments
// @desc    Get assignments
// @access  All authenticated
router.get('/', protect, async (req, res) => {
  try {
    const { courseId, page = 1 } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    let query = {};
    if (courseId) query.course = courseId;

    // H-02 FIX: Students with zero enrollments should see NO assignments (not all)
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id }).select('enrolledCourses');
      // Always scope to enrolled courses — empty array means no assignments shown
      if (!student || student.enrolledCourses.length === 0) {
        return res.json({ success: true, total: 0, assignments: [] });
      }
      query.course = { $in: student.enrolledCourses };
      // Override any explicit courseId filter with enrollment filter for security
    } else if (req.user.role === 'teacher') {
      // Teacher: only show assignments for their own courses
      const teacher = await Teacher.findOne({ user: req.user._id }).select('assignedCourses');
      if (!teacher) return res.json({ success: true, total: 0, assignments: [] });
      if (courseId) {
        // Verify teacher teaches this specific course
        if (!teacher.assignedCourses.map(c => c.toString()).includes(courseId)) {
          return res.status(403).json({ success: false, message: 'Access denied: not your course.' });
        }
      } else {
        query.course = { $in: teacher.assignedCourses };
      }
    }

    const total = await Assignment.countDocuments(query);
    const assignments = await Assignment.find(query)
      .populate('course', 'courseName courseCode')
      .populate({ path: 'createdBy', populate: { path: 'user', select: 'name' } })
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-submissions');  // Don't send all submissions by default

    res.json({ success: true, total, assignments });
  } catch (err) {
    console.error('[assignments/GET]', err);
    res.status(500).json({ success: false, message: 'Failed to load assignments.' });
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
      // Verify student is enrolled in this course
      if (!student || !student.enrolledCourses.map(c => c.toString()).includes(assignment.course._id.toString())) {
        return res.status(403).json({ success: false, message: 'Access denied: you are not enrolled in this course.' });
      }
      const mySubmission = assignment.submissions.find(
        s => s.student._id.toString() === student?._id.toString()
      );
      const result = assignment.toObject();
      result.mySubmission = mySubmission;
      delete result.submissions;
      return res.json({ success: true, assignment: result });
    }

    // Teachers can only see assignments from their own courses
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (!teacher || assignment.course.teacher?.toString() !== teacher._id.toString()) {
        // Fetch course to check teacher
        const course = await Course.findById(assignment.course._id).select('teacher');
        if (!course || course.teacher?.toString() !== teacher?._id.toString()) {
          return res.status(403).json({ success: false, message: 'Access denied: not your course.' });
        }
      }
    }

    res.json({ success: true, assignment });
  } catch (err) {
    console.error('[assignments/GET/:id]', err);
    res.status(500).json({ success: false, message: 'Failed to load assignment.' });
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

    // Verify student is enrolled in this course
    if (!student.enrolledCourses.map(c => c.toString()).includes(assignment.course.toString())) {
      return res.status(403).json({ success: false, message: 'Access denied: you are not enrolled in this course.' });
    }

    const existingSubmission = assignment.submissions.findIndex(
      s => s.student.toString() === student._id.toString()
    );

    const isLate = new Date() > new Date(assignment.dueDate);
    const submission = {
      student: student._id,
      submittedAt: new Date(),
      // S-06 FIX: Allow-list submission fields
      fileUrl: req.body.fileUrl ? String(req.body.fileUrl).trim().slice(0, 2000) : undefined,
      text: req.body.text ? String(req.body.text).trim().slice(0, 10000) : undefined,
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
    console.error('[assignments/submit]', err);
    res.status(500).json({ success: false, message: 'Failed to submit assignment.' });
  }
});

// @route   PUT /api/assignments/:id/grade/:studentId
// @desc    Grade a submission
// @access  Teacher (own course), Admin
router.put('/:id/grade/:studentId', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    // S-05 FIX: Teacher must teach this course
    if (!(await requireCourseOwner(req, res, assignment.course.toString()))) return;

    const subIdx = assignment.submissions.findIndex(
      s => s.student.toString() === req.params.studentId
    );

    if (subIdx === -1) return res.status(404).json({ success: false, message: 'Submission not found' });

    // S-06 FIX: Allow-list grading fields with validation
    const { marksObtained, feedback } = req.body;
    const marks = parseFloat(marksObtained);
    if (isNaN(marks) || marks < 0 || marks > (assignment.totalMarks || 100)) {
      return res.status(400).json({ success: false, message: `Marks must be between 0 and ${assignment.totalMarks || 100}.` });
    }

    assignment.submissions[subIdx].marksObtained = marks;
    assignment.submissions[subIdx].feedback = feedback ? String(feedback).slice(0, 1000) : undefined;
    assignment.submissions[subIdx].status = 'graded';
    await assignment.save();

    res.json({ success: true, message: 'Grade recorded' });
  } catch (err) {
    console.error('[assignments/grade]', err);
    res.status(500).json({ success: false, message: 'Failed to grade submission.' });
  }
});

// @route   DELETE /api/assignments/:id
// @desc    Delete assignment
// @access  Teacher (own course), Admin
router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    // S-05 FIX: Teacher must teach this course
    if (!(await requireCourseOwner(req, res, assignment.course.toString()))) return;

    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (err) {
    console.error('[assignments/DELETE]', err);
    res.status(500).json({ success: false, message: 'Failed to delete assignment.' });
  }
});

module.exports = router;
