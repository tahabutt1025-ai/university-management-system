const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Fee = require('../models/Fee');
const Assignment = require('../models/Assignment');

// ── Helper: resolve caller's own student ID ────────────────
async function getCallerStudentId(req) {
  if (req.user.role === 'student') {
    const s = await Student.findOne({ user: req.user._id }).select('_id');
    return s ? s._id.toString() : null;
  }
  return null; // admins/teachers have no student ID
}

// ── Helper: enforce data-ownership for student endpoints ──
// Admins and teachers may view any student.
// Students may only view their own record.
async function enforceOwnership(req, res, requestedStudentId) {
  if (req.user.role === 'admin' || req.user.role === 'teacher') return true;

  const ownId = await getCallerStudentId(req);
  if (!ownId || ownId !== requestedStudentId.toString()) {
    res.status(403).json({ success: false, message: 'Access denied: you can only view your own records.' });
    return false;
  }
  return true;
}

// @route   GET /api/students
// @desc    Get all students (paginated, searchable)
// @access  Admin, Teacher
router.get('/', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { page = 1, department, semester, search } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // H-08 FIX: cap at 100
    let query = {};

    if (department) query.department = department;
    if (semester) query.semester = parseInt(semester);

    if (search) {
      // H-08 FIX: escape special regex characters to prevent ReDoS
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const users = await User.find({
        $or: [
          { name: { $regex: escaped, $options: 'i' } },
          { email: { $regex: escaped, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = users.map(u => u._id);
      query.$or = [
        { user: { $in: userIds } },
        { rollNumber: { $regex: escaped, $options: 'i' } }
      ];
    }

    const total = await Student.countDocuments(query);
    const result = await Student.find(query)
      .populate('user', 'name email phone avatar isActive')
      .populate('enrolledCourses', 'courseName courseCode')
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      count: result.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      students: result
    });
  } catch (err) {
    console.error('[students/GET]', err);
    res.status(500).json({ success: false, message: 'Failed to load students.' });
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
// @access  Admin, Teacher — OR Student (own record only)
router.get('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('user', 'name email phone avatar createdAt')
      .populate('enrolledCourses', 'courseName courseCode creditHours');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Ownership check — students may only fetch their own record
    if (!(await enforceOwnership(req, res, student._id))) return;

    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/students/:id
// @desc    Update student profile
// @access  Admin — OR Student (own record only, limited fields)
router.put('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Ownership check
    if (!(await enforceOwnership(req, res, student._id))) return;

    let allowedUpdate;
    if (req.user.role === 'student') {
      // S-03 FIX: Students can only update safe personal info — never CGPA, roll no, department, user link
      const { guardianName, guardianPhone, address, dateOfBirth, bloodGroup } = req.body;
      allowedUpdate = {};
      if (guardianName  !== undefined) allowedUpdate.guardianName  = String(guardianName).trim().slice(0, 100);
      if (guardianPhone !== undefined) allowedUpdate.guardianPhone = String(guardianPhone).trim().slice(0, 20);
      if (address       !== undefined) allowedUpdate.address       = String(address).trim().slice(0, 300);
      if (dateOfBirth   !== undefined) allowedUpdate.dateOfBirth   = dateOfBirth;
      if (bloodGroup    !== undefined) allowedUpdate.bloodGroup    = String(bloodGroup).trim().slice(0, 5);
    } else {
      // Admin: broader but explicit allow-list — cgpa is still server-computed
      const { rollNumber, department, semester, section, guardianName, guardianPhone, address, dateOfBirth, bloodGroup } = req.body;
      allowedUpdate = {};
      if (rollNumber    !== undefined) allowedUpdate.rollNumber    = String(rollNumber).trim().slice(0, 50);
      if (department    !== undefined) allowedUpdate.department    = String(department).trim().slice(0, 100);
      if (semester      !== undefined) allowedUpdate.semester      = parseInt(semester) || 1;
      if (section       !== undefined) allowedUpdate.section       = String(section).trim().slice(0, 5);
      if (guardianName  !== undefined) allowedUpdate.guardianName  = String(guardianName).trim().slice(0, 100);
      if (guardianPhone !== undefined) allowedUpdate.guardianPhone = String(guardianPhone).trim().slice(0, 20);
      if (address       !== undefined) allowedUpdate.address       = String(address).trim().slice(0, 300);
      if (dateOfBirth   !== undefined) allowedUpdate.dateOfBirth   = dateOfBirth;
      if (bloodGroup    !== undefined) allowedUpdate.bloodGroup    = String(bloodGroup).trim().slice(0, 5);
    }

    const updated = await Student.findByIdAndUpdate(req.params.id, allowedUpdate, {
      new: true, runValidators: true
    }).populate('user', 'name email');

    res.json({ success: true, student: updated });
  } catch (err) {
    console.error('[students/PUT]', err);
    res.status(500).json({ success: false, message: 'Failed to update student record.' });
  }
});

// @route   GET /api/students/:id/attendance-summary
// @desc    Get attendance summary for a student
// @access  Admin, Teacher — OR Student (own record only)
router.get('/:id/attendance-summary', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('_id');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    if (!(await enforceOwnership(req, res, student._id))) return;

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
        summary[cId] = { course: record.course, total: 0, present: 0, absent: 0, late: 0, excused: 0 };
      }
      summary[cId].total++;
      summary[cId][record.status]++;
    });

    const result = Object.values(summary).map(s => ({
      ...s,
      attendancePercentage: s.total > 0 ? ((s.present + s.late) / s.total * 100).toFixed(1) : '0.0'
    }));

    res.json({ success: true, summary: result });
  } catch (err) {
    console.error('[students/attendance-summary]', err);
    res.status(500).json({ success: false, message: 'Failed to load attendance summary.' });
  }
});

// @route   GET /api/students/:id/grades-summary
// @desc    Get grades summary for a student
// @access  Admin, Teacher — OR Student (own record only)
router.get('/:id/grades-summary', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('_id');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    if (!(await enforceOwnership(req, res, student._id))) return;

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
    console.error('[students/grades-summary]', err);
    res.status(500).json({ success: false, message: 'Failed to load grades summary.' });
  }
});

module.exports = router;
