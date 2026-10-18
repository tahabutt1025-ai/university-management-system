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
    const { department, semester, isActive = true, page = 1 } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    let query = {};
    if (department) query.department = department;
    if (semester) query.semester = parseInt(semester);
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const total = await Course.countDocuments(query);
    const courses = await Course.find(query)
      .populate({ path: 'teacher', populate: { path: 'user', select: 'name email' } })
      // H-01 FIX: Only return count of enrolled students, not their names/emails
      .select('-enrolledStudents')
      .skip((page - 1) * limit)
      .limit(limit);

    // Append enrollment count without exposing student details
    const result = await Course.find(query)
      .populate({ path: 'teacher', populate: { path: 'user', select: 'name email' } })
      .select('courseName courseCode department semester creditHours teacher schedule isActive maxStudents description')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Add student count per course
    const courseIds = result.map(c => c._id);
    const enrollmentCounts = await Course.aggregate([
      { $match: { _id: { $in: courseIds } } },
      { $project: { studentCount: { $size: '$enrolledStudents' } } }
    ]);
    const countMap = {};
    enrollmentCounts.forEach(e => { countMap[e._id.toString()] = e.studentCount; });
    result.forEach(c => { c.enrolledStudentCount = countMap[c._id.toString()] || 0; });

    res.json({ success: true, total, courses: result });
  } catch (err) {
    console.error('[courses/GET]', err);
    res.status(500).json({ success: false, message: 'Failed to load courses.' });
  }
});

// @route   POST /api/courses
// @desc    Create a new course
// @access  Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    // S-06 FIX: Allow-list fields
    const { courseName, courseCode, department, semester, creditHours, teacher, description, maxStudents, schedule } = req.body;

    if (!courseName || !courseCode) {
      return res.status(400).json({ success: false, message: 'courseName and courseCode are required.' });
    }

    const course = await Course.create({
      courseName: String(courseName).trim().slice(0, 200),
      courseCode: String(courseCode).trim().slice(0, 20).toUpperCase(),
      department: department ? String(department).trim().slice(0, 100) : 'Computer Science',
      semester: semester ? parseInt(semester) : 1,
      creditHours: creditHours ? parseInt(creditHours) : 3,
      teacher: teacher || undefined,
      description: description ? String(description).trim().slice(0, 2000) : undefined,
      maxStudents: maxStudents ? Math.max(parseInt(maxStudents) || 0, 1) : 50,
      schedule: Array.isArray(schedule) ? schedule : undefined
    });

    // B-06 FIX: Keep two-way reference in sync
    if (teacher) {
      await Teacher.findByIdAndUpdate(teacher, {
        $addToSet: { assignedCourses: course._id }
      });
    }

    res.status(201).json({ success: true, course });
  } catch (err) {
    console.error('[courses/POST]', err);
    res.status(500).json({ success: false, message: 'Failed to create course.' });
  }
});

// @route   GET /api/courses/:id
// @desc    Get course by ID
// @access  All authenticated
router.get('/:id', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate({ path: 'teacher', populate: { path: 'user', select: 'name email phone' } });

    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    // H-01 FIX: Only populate student details for admin/teacher
    let result;
    if (req.user.role === 'admin' || req.user.role === 'teacher') {
      result = await Course.findById(req.params.id)
        .populate({ path: 'teacher', populate: { path: 'user', select: 'name email phone' } })
        .populate({ path: 'enrolledStudents', populate: { path: 'user', select: 'name' } }); // no email for students
    } else {
      // Students only see non-PII course info
      result = course;
    }

    res.json({ success: true, course: result });
  } catch (err) {
    console.error('[courses/GET/:id]', err);
    res.status(500).json({ success: false, message: 'Failed to load course.' });
  }
});

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { courseName, courseCode, department, semester, creditHours, teacher, description, maxStudents, schedule, isActive } = req.body;

    // S-06 FIX: Allow-list fields
    const allowedUpdate = {};
    if (courseName   !== undefined) allowedUpdate.courseName   = String(courseName).trim().slice(0, 200);
    if (courseCode   !== undefined) allowedUpdate.courseCode   = String(courseCode).trim().slice(0, 20).toUpperCase();
    if (department   !== undefined) allowedUpdate.department   = String(department).trim().slice(0, 100);
    if (semester     !== undefined) allowedUpdate.semester     = parseInt(semester);
    if (creditHours  !== undefined) allowedUpdate.creditHours  = parseInt(creditHours);
    if (teacher      !== undefined) allowedUpdate.teacher      = teacher || null;
    if (description  !== undefined) allowedUpdate.description  = String(description).trim().slice(0, 2000);
    if (maxStudents  !== undefined) allowedUpdate.maxStudents  = Math.max(parseInt(maxStudents) || 0, 1);
    if (schedule     !== undefined) allowedUpdate.schedule     = schedule;
    if (isActive     !== undefined) allowedUpdate.isActive     = Boolean(isActive);

    const oldCourse = await Course.findById(req.params.id);
    if (!oldCourse) return res.status(404).json({ success: false, message: 'Course not found' });

    // B-06 FIX: Sync teacher references when teacher changes
    if (teacher !== undefined && teacher !== oldCourse.teacher?.toString()) {
      // Remove from old teacher
      if (oldCourse.teacher) {
        await Teacher.findByIdAndUpdate(oldCourse.teacher, {
          $pull: { assignedCourses: oldCourse._id }
        });
      }
      // Add to new teacher
      if (teacher) {
        await Teacher.findByIdAndUpdate(teacher, {
          $addToSet: { assignedCourses: oldCourse._id }
        });
      }
    }

    const course = await Course.findByIdAndUpdate(req.params.id, allowedUpdate, {
      new: true, runValidators: true
    });
    res.json({ success: true, course });
  } catch (err) {
    console.error('[courses/PUT]', err);
    res.status(500).json({ success: false, message: 'Failed to update course.' });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Soft-delete course (sets isActive=false)
// @access  Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    // B-06 FIX: Soft delete — preserve attendance, grades, assignments
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, message: 'Course deactivated. All records are preserved.' });
  } catch (err) {
    console.error('[courses/DELETE]', err);
    res.status(500).json({ success: false, message: 'Failed to deactivate course.' });
  }
});

// @route   POST /api/courses/:id/enroll
// @desc    Enroll a student in a course
// @access  Admin only (S-05 fix: teachers shouldn't enroll students arbitrarily)
router.post('/:id/enroll', protect, authorize('admin'), async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId is required.' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    if (!course.isActive) return res.status(400).json({ success: false, message: 'Course is not active.' });

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    // B-05 FIX: Check capacity
    if (course.enrolledStudents.length >= (course.maxStudents || 50)) {
      return res.status(400).json({ success: false, message: `Course is full (max ${course.maxStudents} students).` });
    }

    // B-05 FIX: Check duplicate enrollment
    if (course.enrolledStudents.includes(studentId)) {
      return res.status(400).json({ success: false, message: 'Student is already enrolled in this course.' });
    }

    await Course.findByIdAndUpdate(req.params.id, { $addToSet: { enrolledStudents: studentId } });
    await Student.findByIdAndUpdate(studentId, { $addToSet: { enrolledCourses: course._id } });

    res.json({ success: true, message: 'Student enrolled successfully.' });
  } catch (err) {
    console.error('[courses/enroll]', err);
    res.status(500).json({ success: false, message: 'Failed to enroll student.' });
  }
});

// @route   POST /api/courses/:id/enroll-bulk
// @desc    Enroll multiple students in a course
// @access  Admin
router.post('/:id/enroll-bulk', protect, authorize('admin'), async (req, res) => {
  try {
    const { studentIds } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'studentIds array is required.' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    if (!course.isActive) return res.status(400).json({ success: false, message: 'Course is not active.' });

    const results = { enrolled: [], skipped: [], errors: [] };

    for (const studentId of studentIds) {
      try {
        if (course.enrolledStudents.includes(studentId)) {
          results.skipped.push(studentId);
          continue;
        }
        if (course.enrolledStudents.length + results.enrolled.length >= (course.maxStudents || 50)) {
          results.errors.push({ studentId, error: 'Course is full.' });
          continue;
        }
        await Course.findByIdAndUpdate(req.params.id, { $addToSet: { enrolledStudents: studentId } });
        await Student.findByIdAndUpdate(studentId, { $addToSet: { enrolledCourses: course._id } });
        results.enrolled.push(studentId);
      } catch (e) {
        results.errors.push({ studentId, error: 'Failed to enroll.' });
      }
    }

    res.json({ success: true, message: `Enrolled ${results.enrolled.length} students.`, results });
  } catch (err) {
    console.error('[courses/enroll-bulk]', err);
    res.status(500).json({ success: false, message: 'Failed to bulk enroll students.' });
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
    res.json({ success: true, message: 'Student removed from course.' });
  } catch (err) {
    console.error('[courses/unenroll]', err);
    res.status(500).json({ success: false, message: 'Failed to remove student.' });
  }
});

module.exports = router;
