/**
 * Alert Rules Engine — Core Evaluation & Dispatch Engine
 * Follows Sections 3, 4, 5 & 8 of UniManage Spec
 */

const AlertRule = require('../models/AlertRule');
const Alert = require('../models/Alert');
const NotificationPreference = require('../models/NotificationPreference');
const Notification = require('../models/Notification');
const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Fee = require('../models/Fee');
const Assignment = require('../models/Assignment');
const Teacher = require('../models/Teacher');
const { DEFAULT_ALERT_RULES } = require('./alertRuleDefaults');
const { draftAlertEmail } = require('./alertAiGenerator');
const { sendAlertEmail } = require('./emailService');

/**
 * Ensures all 10 default rules are initialized in the database
 */
async function initializeAlertRules() {
  for (const def of DEFAULT_ALERT_RULES) {
    const exists = await AlertRule.findOne({ code: def.code });
    if (!exists) {
      await AlertRule.create(def);
      console.log(`[ALERT ENGINE] Initialized default rule: ${def.code}`);
    }
  }
}

/**
 * Check if an alert is currently blocked by a cooldown window
 */
async function isCooldownActive(ruleCode, recipientId, extraKey = null) {
  const query = {
    ruleCode,
    recipient: recipientId,
    status: { $in: ['sent', 'queued'] },
    cooldownUntil: { $gt: new Date() }
  };
  if (extraKey) {
    query['facts.courseCode'] = extraKey;
  }
  const existing = await Alert.findOne(query);
  return !!existing;
}

/**
 * Creates, drafts, and sends a single alert
 */
async function processAndSendAlert({ rule, student = null, recipient, facts, extraCooldownKey = null }) {
  // 1. Check Cooldown
  if (await isCooldownActive(rule.code, recipient._id, extraCooldownKey)) {
    return { skipped: true, reason: 'Cooldown active' };
  }

  // 2. Check User Preferences
  const prefs = await NotificationPreference.findOne({ user: recipient._id });
  if (prefs && (!prefs.emailEnabled || (prefs.disabledCategories && prefs.disabledCategories.includes(rule.code)))) {
    return { skipped: true, reason: 'User opt-out' };
  }

  // 3. Draft via AI with template fallback
  const draft = await draftAlertEmail({ rule, facts });

  // 4. Calculate Cooldown expiration
  const cooldownUntil = new Date(Date.now() + (rule.cooldownDays * 24 * 60 * 60 * 1000));

  // 5. Create Alert record
  const alert = await Alert.create({
    rule: rule._id,
    ruleCode: rule.code,
    student: student ? student._id : null,
    recipient: recipient._id,
    recipientEmail: recipient.email,
    recipientRole: recipient.role,
    facts,
    subject: draft.subject,
    body: draft.body,
    isAiGenerated: draft.isAiGenerated,
    status: 'queued',
    cooldownUntil
  });

  // 6. Deliver Email
  try {
    await sendAlertEmail({
      alert,
      recipientEmail: recipient.email,
      subject: draft.subject,
      body: draft.body
    });

    alert.status = 'sent';
    alert.sentAt = new Date();
    await alert.save();

    // 7. Also create In-Portal Notification
    await Notification.create({
      recipient: recipient._id,
      title: draft.subject,
      message: draft.body,
      type: rule.code,
      priority: rule.tone === 'urgent' ? 'high' : 'medium'
    }).catch(err => console.error('Notification creation failed:', err.message));

    return { success: true, alertId: alert._id };
  } catch (err) {
    alert.status = 'failed';
    alert.failureReason = err.message;
    await alert.save();
    return { success: false, error: err.message, alertId: alert._id };
  }
}

/**
 * Evaluates all enabled rules across the university database
 */
async function runAlertRulesEngine() {
  await initializeAlertRules();
  const rules = await AlertRule.find({ enabled: true });
  const results = { totalProcessed: 0, sent: 0, skipped: 0, failed: 0, details: [] };

  const students = await Student.find()
    .populate('user', 'name email role')
    .populate('enrolledCourses', 'courseName courseCode creditHours');

  for (const rule of rules) {
    switch (rule.code) {
      // ─── Rule 1: Low Attendance (< threshold%) ───
      case 'low_attendance': {
        for (const student of students) {
          if (!student.user) continue;

          for (const course of student.enrolledCourses) {
            const records = await Attendance.find({ student: student._id, course: course._id });
            if (records.length < 5) continue; // Minimum baseline sessions

            const absent = records.filter(r => r.status === 'absent').length;
            const attended = records.length - absent;
            const rate = ((attended / records.length) * 100);

            if (rate < rule.threshold) {
              const estimatedSemesterTotal = 32;
              const maxAllowedAbsences = Math.floor(estimatedSemesterTotal * (1 - (rule.threshold / 100)));
              const classesCanMiss = Math.max(0, maxAllowedAbsences - absent);

              const facts = {
                firstName: student.user.name.split(' ')[0],
                studentName: student.user.name,
                rollNumber: student.rollNumber,
                courseName: course.courseName,
                courseCode: course.courseCode,
                attendanceRate: Number(rate.toFixed(1)),
                attendedClasses: attended,
                totalClasses: records.length,
                threshold: rule.threshold,
                classesCanMiss
              };

              results.totalProcessed++;
              const res = await processAndSendAlert({
                rule,
                student,
                recipient: student.user,
                facts,
                extraCooldownKey: course.courseCode
              });

              if (res.success) results.sent++;
              else if (res.skipped) results.skipped++;
              else results.failed++;
            }
          }
        }
        break;
      }

      // ─── Rule 3: Fee Due Soon (in 7 days or 2 days) ───
      case 'fee_due_soon': {
        const now = new Date();
        const futureLimit = new Date(Date.now() + (rule.threshold * 24 * 60 * 60 * 1000));

        const upcomingFees = await Fee.find({
          status: 'pending',
          dueDate: { $gte: now, $lte: futureLimit }
        }).populate({
          path: 'student',
          populate: { path: 'user', select: 'name email role' }
        });

        for (const fee of upcomingFees) {
          if (!fee.student?.user) continue;
          const daysRemaining = Math.max(1, Math.ceil((new Date(fee.dueDate) - now) / (1000 * 60 * 60 * 24)));

          const facts = {
            firstName: fee.student.user.name.split(' ')[0],
            feeTitle: fee.title || 'Semester Tuition Fee',
            amountDue: fee.amount,
            dueDate: new Date(fee.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            daysRemaining
          };

          results.totalProcessed++;
          const res = await processAndSendAlert({
            rule,
            student: fee.student,
            recipient: fee.student.user,
            facts
          });

          if (res.success) results.sent++;
          else if (res.skipped) results.skipped++;
          else results.failed++;
        }
        break;
      }

      // ─── Rule 4: Fee Overdue (past deadline) ───
      case 'fee_overdue': {
        const now = new Date();
        const overdueFees = await Fee.find({
          status: 'pending',
          dueDate: { $lt: now }
        }).populate({
          path: 'student',
          populate: { path: 'user', select: 'name email role' }
        });

        for (const fee of overdueFees) {
          if (!fee.student?.user) continue;

          // Check max occurrences
          const sentCount = await Alert.countDocuments({
            ruleCode: 'fee_overdue',
            recipient: fee.student.user._id,
            'facts.feeId': fee._id.toString()
          });

          if (sentCount >= (rule.maxOccurrences || 3)) continue;

          const daysOverdue = Math.max(1, Math.ceil((now - new Date(fee.dueDate)) / (1000 * 60 * 60 * 24)));

          const facts = {
            firstName: fee.student.user.name.split(' ')[0],
            feeId: fee._id.toString(),
            feeTitle: fee.title || 'Tuition Fee',
            amountDue: fee.amount,
            dueDate: new Date(fee.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            daysOverdue
          };

          results.totalProcessed++;
          const res = await processAndSendAlert({
            rule,
            student: fee.student,
            recipient: fee.student.user,
            facts
          });

          if (res.success) results.sent++;
          else if (res.skipped) results.skipped++;
          else results.failed++;
        }
        break;
      }

      // ─── Rule 7: Upcoming Assignment Deadline (within 3 days) ───
      case 'upcoming_deadline': {
        const now = new Date();
        const deadlineLimit = new Date(Date.now() + (rule.threshold * 24 * 60 * 60 * 1000));

        const upcomingAssignments = await Assignment.find({
          dueDate: { $gte: now, $lte: deadlineLimit }
        }).populate('course', 'courseName courseCode enrolledStudents');

        for (const assignment of upcomingAssignments) {
          if (!assignment.course) continue;

          const daysRemaining = Math.max(1, Math.ceil((new Date(assignment.dueDate) - now) / (1000 * 60 * 60 * 24)));

          for (const student of students) {
            const isEnrolled = student.enrolledCourses.some(c => c._id.toString() === assignment.course._id.toString());
            if (!isEnrolled || !student.user) continue;

            const facts = {
              firstName: student.user.name.split(' ')[0],
              itemType: 'Assignment',
              itemTitle: assignment.title,
              courseName: assignment.course.courseName,
              dueDate: new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              daysRemaining
            };

            results.totalProcessed++;
            const res = await processAndSendAlert({
              rule,
              student,
              recipient: student.user,
              facts,
              extraCooldownKey: assignment._id.toString()
            });

            if (res.success) results.sent++;
            else if (res.skipped) results.skipped++;
            else results.failed++;
          }
        }
        break;
      }

      default:
        // Other rules trigger on specific events (e.g. new result published)
        break;
    }
  }

  return results;
}

module.exports = {
  initializeAlertRules,
  runAlertRulesEngine,
  processAndSendAlert
};
