const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Course = require('../models/Course');
const Notification = require('../models/Notification');
const User = require('../models/User');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  RULE-BASED ANALYTICS ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Analyzes attendance patterns for a student
 */
async function analyzeAttendancePatterns(studentId) {
  const records = await Attendance.find({ student: studentId })
    .populate('course', 'courseName courseCode')
    .sort('date');

  if (records.length < 10) {
    return { insufficient_data: true, alerts: [] };
  }

  const alerts = [];

  // 1. Overall attendance rate check
  const absent = records.filter(r => r.status === 'absent');
  const overallRate = ((records.length - absent.length) / records.length) * 100;

  if (overallRate < 75) {
    alerts.push({
      type: 'critical_attendance',
      severity: 'high',
      message: `Overall attendance is critically low at ${overallRate.toFixed(1)}% (minimum 75% required).`,
      recommendation: 'Immediate intervention required. Schedule a meeting with the student.'
    });
  } else if (overallRate < 85) {
    alerts.push({
      type: 'low_attendance',
      severity: 'medium',
      message: `Attendance is below recommended threshold at ${overallRate.toFixed(1)}%.`,
      recommendation: 'Monitor closely and send a warning notification.'
    });
  }

  // 2. Day-of-week pattern detection
  const dayAbsences = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const dayTotal = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  records.forEach(r => {
    const day = new Date(r.date).getDay();
    dayTotal[day] = (dayTotal[day] || 0) + 1;
    if (r.status === 'absent') dayAbsences[day] = (dayAbsences[day] || 0) + 1;
  });

  for (const [day, total] of Object.entries(dayTotal)) {
    if (total >= 3) {
      const absentRate = (dayAbsences[day] / total) * 100;
      if (absentRate > 40) {
        alerts.push({
          type: 'day_pattern',
          severity: 'medium',
          message: `Frequent absences on ${dayNames[day]}s — missed ${dayAbsences[day]} out of ${total} classes (${absentRate.toFixed(0)}% absent rate).`,
          recommendation: `Investigate personal or schedule conflict on ${dayNames[day]}s.`
        });
      }
    }
  }

  // 3. Recent trend (last 2 weeks vs previous)
  const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sortedRecords.slice(0, Math.min(10, Math.floor(records.length / 2)));
  const earlier = sortedRecords.slice(recent.length);

  if (recent.length >= 5 && earlier.length >= 5) {
    const recentRate = (recent.filter(r => r.status !== 'absent').length / recent.length) * 100;
    const earlierRate = (earlier.filter(r => r.status !== 'absent').length / earlier.length) * 100;

    if (earlierRate - recentRate > 20) {
      alerts.push({
        type: 'declining_attendance',
        severity: 'high',
        message: `Attendance has declined significantly in recent weeks (from ${earlierRate.toFixed(0)}% to ${recentRate.toFixed(0)}%).`,
        recommendation: 'Reach out immediately to understand the cause of sudden drop.'
      });
    }
  }

  // 4. Per-course analysis
  const courseMap = {};
  records.forEach(r => {
    const cId = r.course._id.toString();
    if (!courseMap[cId]) courseMap[cId] = { name: r.course.courseName, total: 0, absent: 0 };
    courseMap[cId].total++;
    if (r.status === 'absent') courseMap[cId].absent++;
  });

  for (const [, course] of Object.entries(courseMap)) {
    const rate = ((course.total - course.absent) / course.total) * 100;
    if (rate < 70 && course.total >= 5) {
      alerts.push({
        type: 'course_attendance',
        severity: 'high',
        message: `Very low attendance in "${course.name}" — only ${rate.toFixed(0)}%.`,
        recommendation: `This student may be struggling with or avoiding "${course.name}". Teacher should reach out.`
      });
    }
  }

  return {
    overallRate: overallRate.toFixed(1),
    totalClasses: records.length,
    alerts,
    dayPattern: Object.entries(dayTotal).reduce((acc, [day, total]) => {
      if (total > 0) acc[dayNames[day]] = {
        total,
        absent: dayAbsences[day] || 0,
        rate: (((total - (dayAbsences[day] || 0)) / total) * 100).toFixed(0) + '%'
      };
      return acc;
    }, {})
  };
}

/**
 * Analyzes grade trends for a student
 */
async function analyzeGradeTrends(studentId) {
  const grades = await Grade.find({ student: studentId })
    .populate('course', 'courseName courseCode')
    .sort('examDate');

  if (grades.length < 3) return { insufficient_data: true, alerts: [] };

  const alerts = [];

  // Group grades by course
  const courseGrades = {};
  grades.forEach(g => {
    const cId = g.course._id.toString();
    if (!courseGrades[cId]) courseGrades[cId] = { name: g.course.courseName, exams: [] };
    courseGrades[cId].exams.push({
      type: g.examType,
      percentage: (g.marksObtained / g.totalMarks) * 100,
      date: g.examDate
    });
  });

  // Trend analysis per course
  for (const [, course] of Object.entries(courseGrades)) {
    const exams = course.exams;
    if (exams.length < 2) continue;

    const sortedExams = [...exams].sort((a, b) => new Date(a.date) - new Date(b.date));
    const avg = sortedExams.reduce((acc, e) => acc + e.percentage, 0) / sortedExams.length;

    // Check for failing grades
    if (avg < 50) {
      alerts.push({
        type: 'failing_grade',
        severity: 'critical',
        message: `Failing average in "${course.name}" — ${avg.toFixed(1)}% overall.`,
        recommendation: 'Immediate tutoring or remedial sessions needed.'
      });
    } else if (avg < 65) {
      alerts.push({
        type: 'low_grade',
        severity: 'medium',
        message: `Below-average performance in "${course.name}" — ${avg.toFixed(1)}% average.`,
        recommendation: 'Student needs additional support in this subject.'
      });
    }

    // Declining trend detection
    if (sortedExams.length >= 3) {
      const first = sortedExams.slice(0, Math.floor(sortedExams.length / 2));
      const last = sortedExams.slice(Math.ceil(sortedExams.length / 2));
      const firstAvg = first.reduce((acc, e) => acc + e.percentage, 0) / first.length;
      const lastAvg = last.reduce((acc, e) => acc + e.percentage, 0) / last.length;

      if (firstAvg - lastAvg > 15) {
        alerts.push({
          type: 'declining_performance',
          severity: 'high',
          message: `Performance declining in "${course.name}": earlier avg ${firstAvg.toFixed(0)}% vs recent ${lastAvg.toFixed(0)}%.`,
          recommendation: `Significant drop detected in ${course.name}. Check for external stressors or topic difficulty.`
        });
      }
    }
  }

  // Check for consistent high performance (positive alert)
  const allPercentages = grades.map(g => (g.marksObtained / g.totalMarks) * 100);
  const overallAvg = allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length;

  if (overallAvg >= 85 && grades.length >= 5) {
    alerts.push({
      type: 'high_achiever',
      severity: 'positive',
      message: `Consistently high performer with ${overallAvg.toFixed(1)}% overall average.`,
      recommendation: 'Consider nominating for academic honors or advanced coursework.'
    });
  }

  return {
    overallAverage: overallAvg.toFixed(1),
    courseBreakdown: Object.entries(courseGrades).map(([, c]) => ({
      course: c.name,
      exams: c.exams.length,
      average: (c.exams.reduce((acc, e) => acc + e.percentage, 0) / c.exams.length).toFixed(1)
    })),
    alerts
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  OPENAI INTEGRATION (Optional)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getOpenAIInsights(studentData) {
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const https = require('https');
    const prompt = `You are an academic advisor AI analyzing a university student's performance.

Student Data:
- Name: ${studentData.name}
- Department: ${studentData.department}
- Semester: ${studentData.semester}
- Overall Attendance: ${studentData.attendance?.overallRate}%
- Overall Grade Average: ${studentData.grades?.overallAverage}%
- Attendance Alerts: ${JSON.stringify(studentData.attendance?.alerts?.map(a => a.message) || [])}
- Grade Alerts: ${JSON.stringify(studentData.grades?.alerts?.map(a => a.message) || [])}

Provide a concise (3-4 sentence) natural language analysis with:
1. Student risk assessment (at-risk / moderate / good standing)
2. Key concern to address first
3. One specific actionable recommendation

Be empathetic but factual. Response in plain text (no bullet points).`;

    const requestBody = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.7
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.choices?.[0]?.message?.content || null);
          } catch { resolve(null); }
        });
      });

      req.on('error', () => resolve(null));
      req.setTimeout(10000, () => { req.destroy(); resolve(null); });
      req.write(requestBody);
      req.end();
    });
  } catch {
    return null;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ROUTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// @route   GET /api/analytics/student/:studentId
// @desc    Full analytics for a specific student
// @access  Admin, Teacher, Student (own)
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId)
      .populate('user', 'name email')
      .populate('enrolledCourses', 'courseName courseCode');

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const [attendanceAnalysis, gradeAnalysis] = await Promise.all([
      analyzeAttendancePatterns(student._id),
      analyzeGradeTrends(student._id)
    ]);

    // Determine overall risk level
    const allAlerts = [
      ...(attendanceAnalysis.alerts || []),
      ...(gradeAnalysis.alerts || [])
    ];
    const criticalAlerts = allAlerts.filter(a => a.severity === 'critical' || a.severity === 'high');
    const riskLevel = criticalAlerts.length >= 2 ? 'high' :
                      criticalAlerts.length === 1 ? 'medium' : 'low';

    // Get AI insights (if OpenAI key available)
    const aiInsight = await getOpenAIInsights({
      name: student.user?.name,
      department: student.department,
      semester: student.semester,
      attendance: attendanceAnalysis,
      grades: gradeAnalysis
    });

    const result = {
      student: {
        id: student._id,
        name: student.user?.name,
        email: student.user?.email,
        rollNumber: student.rollNumber,
        department: student.department,
        semester: student.semester
      },
      riskLevel,
      totalAlerts: allAlerts.length,
      attendance: attendanceAnalysis,
      grades: gradeAnalysis,
      aiInsight,
      generatedAt: new Date()
    };

    res.json({ success: true, analytics: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/analytics/at-risk
// @desc    Get list of all at-risk students
// @access  Admin, Teacher
router.get('/at-risk', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { threshold = 75, limit = 50 } = req.query;
    const students = await Student.find()
      .populate('user', 'name email')
      .limit(parseInt(limit));

    const atRiskStudents = [];

    for (const student of students) {
      const totalRecords = await Attendance.countDocuments({ student: student._id });
      if (totalRecords < 5) continue;

      const presentRecords = await Attendance.countDocuments({
        student: student._id,
        status: { $in: ['present', 'late'] }
      });

      const attendanceRate = (presentRecords / totalRecords) * 100;

      // Grade check
      const recentGrades = await Grade.find({ student: student._id }).sort('-examDate').limit(5);
      const avgGrade = recentGrades.length > 0
        ? recentGrades.reduce((acc, g) => acc + (g.marksObtained / g.totalMarks) * 100, 0) / recentGrades.length
        : null;

      const isAtRisk = attendanceRate < parseInt(threshold) || (avgGrade !== null && avgGrade < 50);

      if (isAtRisk) {
        atRiskStudents.push({
          student: {
            id: student._id,
            name: student.user?.name,
            email: student.user?.email,
            rollNumber: student.rollNumber,
            department: student.department,
            semester: student.semester
          },
          attendanceRate: attendanceRate.toFixed(1),
          avgGrade: avgGrade ? avgGrade.toFixed(1) : 'N/A',
          riskFactors: [
            ...(attendanceRate < parseInt(threshold) ? [`Low attendance: ${attendanceRate.toFixed(0)}%`] : []),
            ...(avgGrade !== null && avgGrade < 50 ? [`Failing grade average: ${avgGrade.toFixed(0)}%`] : [])
          ]
        });
      }
    }

    // Sort by most at-risk first
    atRiskStudents.sort((a, b) => parseFloat(a.attendanceRate) - parseFloat(b.attendanceRate));

    res.json({
      success: true,
      count: atRiskStudents.length,
      atRiskStudents
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/analytics/system-overview
// @desc    System-wide analytics overview
// @access  Admin
router.get('/system-overview', protect, authorize('admin'), async (req, res) => {
  try {
    const [
      totalStudents,
      totalAttendance,
      presentAttendance,
      allGrades,
      courseEnrollments
    ] = await Promise.all([
      Student.countDocuments(),
      Attendance.countDocuments(),
      Attendance.countDocuments({ status: { $in: ['present', 'late'] } }),
      Grade.find().select('marksObtained totalMarks examType'),
      Course.aggregate([
        { $project: { courseName: 1, studentCount: { $size: '$enrolledStudents' } } },
        { $sort: { studentCount: -1 } },
        { $limit: 5 }
      ])
    ]);

    const systemAttendanceRate = totalAttendance > 0
      ? ((presentAttendance / totalAttendance) * 100).toFixed(1)
      : '0.0';

    const avgGrade = allGrades.length > 0
      ? (allGrades.reduce((acc, g) => acc + (g.marksObtained / g.totalMarks) * 100, 0) / allGrades.length).toFixed(1)
      : '0.0';

    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    allGrades.forEach(g => {
      const pct = (g.marksObtained / g.totalMarks) * 100;
      if (pct >= 80) gradeDistribution.A++;
      else if (pct >= 70) gradeDistribution.B++;
      else if (pct >= 60) gradeDistribution.C++;
      else if (pct >= 50) gradeDistribution.D++;
      else gradeDistribution.F++;
    });

    // Monthly enrollment trend
    const enrollmentTrend = await Student.aggregate([
      {
        $group: {
          _id: { month: { $month: '$enrollmentDate' }, year: { $year: '$enrollmentDate' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 }
    ]);

    res.json({
      success: true,
      overview: {
        totalStudents,
        systemAttendanceRate,
        avgGrade,
        totalGradesRecorded: allGrades.length,
        gradeDistribution,
        topEnrolledCourses: courseEnrollments,
        enrollmentTrend
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/analytics/send-alerts
// @desc    Run AI analysis and send alerts for all at-risk students
// @access  Admin
router.post('/send-alerts', protect, authorize('admin'), async (req, res) => {
  try {
    const students = await Student.find().populate('user', 'name email _id');
    const alertsSent = [];

    for (const student of students) {
      if (!student.user) continue;

      const attendance = await analyzeAttendancePatterns(student._id);
      const highAlerts = attendance.alerts?.filter(a => a.severity === 'high' || a.severity === 'critical');

      if (highAlerts && highAlerts.length > 0) {
        // Notify student
        await Notification.create({
          recipient: student.user._id,
          title: '⚠️ Attendance Alert',
          message: highAlerts[0].message,
          type: 'attendance_alert',
          priority: 'high'
        });

        // Find admin users and notify them
        const adminUsers = await User.find({ role: 'admin' }).select('_id').limit(3);
        for (const admin of adminUsers) {
          await Notification.create({
            recipient: admin._id,
            title: `⚠️ At-Risk Student: ${student.user.name}`,
            message: `${student.user.name} (${student.rollNumber}) - ${highAlerts[0].message}`,
            type: 'ai_insight',
            priority: 'high'
          });
        }

        alertsSent.push({ student: student.user.name, alerts: highAlerts.length });
      }
    }

    res.json({
      success: true,
      message: `Alerts sent for ${alertsSent.length} at-risk students`,
      alertsSent
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
