const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const AlertRule = require('../models/AlertRule');
const Alert = require('../models/Alert');
const NotificationPreference = require('../models/NotificationPreference');
const AIUsageLog = require('../models/AIUsageLog');
const EmailEvent = require('../models/EmailEvent');
const { runAlertRulesEngine, initializeAlertRules, processAndSendAlert } = require('../utils/alertRulesEngine');
const { draftAlertEmail } = require('../utils/alertAiGenerator');
const { sendAlertEmail } = require('../utils/emailService');

// ─── Ensure rules exist on first access ───────────────────────
router.use(async (req, res, next) => {
  try {
    await initializeAlertRules();
  } catch (e) {}
  next();
});

// @route   GET /api/alert-rules
// @desc    List all 10 alert rules
// @access  Admin
router.get('/rules', protect, authorize('admin'), async (req, res) => {
  try {
    const rules = await AlertRule.find().sort({ code: 1 });
    res.json({ success: true, count: rules.length, rules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/alert-rules/:id
// @desc    Update rule threshold, cooldown, tone, enabled status
// @access  Admin
router.put('/rules/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { threshold, secondaryThreshold, cooldownDays, enabled, tone, fallbackSubjectTemplate, fallbackBodyTemplate } = req.body;

    const rule = await AlertRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    if (threshold !== undefined) rule.threshold = threshold;
    if (secondaryThreshold !== undefined) rule.secondaryThreshold = secondaryThreshold;
    if (cooldownDays !== undefined) rule.cooldownDays = cooldownDays;
    if (enabled !== undefined) rule.enabled = enabled;
    if (tone) rule.tone = tone;
    if (fallbackSubjectTemplate) rule.fallbackSubjectTemplate = fallbackSubjectTemplate;
    if (fallbackBodyTemplate) rule.fallbackBodyTemplate = fallbackBodyTemplate;
    rule.updatedBy = req.user._id;

    await rule.save();
    res.json({ success: true, message: 'Alert rule updated successfully', rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/alerts/run
// @desc    Trigger alert engine run
// @access  Admin
router.post('/run', protect, authorize('admin'), async (req, res) => {
  try {
    const results = await runAlertRulesEngine();
    res.json({ success: true, message: `Alert engine completed. Sent: ${results.sent}, Skipped: ${results.skipped}, Failed: ${results.failed}`, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/alerts
// @desc    Alert history audit trail
// @access  Admin (all), Student/Teacher (own)
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, ruleCode, search } = req.query;
    let query = {};

    if (req.user.role !== 'admin') {
      query.recipient = req.user._id;
    }

    if (status) query.status = status;
    if (ruleCode) query.ruleCode = ruleCode;
    if (search) {
      query.$or = [
        { recipientEmail: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Alert.countDocuments(query);
    const alerts = await Alert.find(query)
      .populate('rule', 'name code')
      .populate('recipient', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      alerts
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/alerts/preview
// @desc    Preview sample AI draft and fallback template for a rule
// @access  Admin
router.post('/preview', protect, authorize('admin'), async (req, res) => {
  try {
    const { ruleCode } = req.body;
    const rule = await AlertRule.findOne({ code: ruleCode });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    const sampleFacts = {
      firstName: 'Taha',
      studentName: 'Taha Butt',
      courseName: 'Database Systems',
      courseCode: 'CS-351',
      attendanceRate: 68.0,
      attendedClasses: 17,
      totalClasses: 25,
      threshold: rule.threshold,
      classesCanMiss: 2,
      amountDue: 45000,
      feeTitle: 'Spring 2026 Tuition',
      dueDate: 'Oct 25, 2026',
      daysRemaining: 7,
      examType: 'Midterm',
      marksObtained: 14,
      totalMarks: 20,
      percentage: 70
    };

    const draft = await draftAlertEmail({ rule, facts: sampleFacts });
    res.json({ success: true, draft, sampleFacts, rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/alerts/:id/retry
// @desc    Re-queue and retry a failed alert
// @access  Admin
router.post('/:id/retry', protect, authorize('admin'), async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });

    alert.status = 'queued';
    alert.retryCount = (alert.retryCount || 0) + 1;
    await alert.save();

    await sendAlertEmail({
      alert,
      recipientEmail: alert.recipientEmail,
      subject: alert.subject,
      body: alert.body
    });

    alert.status = 'sent';
    alert.sentAt = new Date();
    alert.failureReason = null;
    await alert.save();

    res.json({ success: true, message: 'Alert retried and delivered successfully', alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/alerts/test-send
// @desc    Send a test sandbox email to admin's email
// @access  Admin
router.post('/test-send', protect, authorize('admin'), async (req, res) => {
  try {
    const rule = await AlertRule.findOne({ code: 'low_attendance' }) || (await AlertRule.findOne());
    const facts = {
      firstName: req.user.name.split(' ')[0],
      studentName: req.user.name,
      courseName: 'Software Engineering',
      courseCode: 'CS-401',
      attendanceRate: 67.5,
      attendedClasses: 18,
      totalClasses: 27,
      threshold: 75,
      classesCanMiss: 1
    };

    const draft = await draftAlertEmail({ rule, facts });
    const fakeAlert = { _id: new (require('mongoose').Types.ObjectId)(), ruleCode: rule.code, recipient: req.user };

    await sendAlertEmail({
      alert: fakeAlert,
      recipientEmail: req.user.email,
      subject: draft.subject,
      body: draft.body
    });

    res.json({
      success: true,
      message: `Test alert dispatched to ${req.user.email}`,
      draft
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/alerts/stats
// @desc    Aggregate alert & AI usage stats
// @access  Admin
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalSent, totalFailed, totalQueued, monthlySent, aiUsage] = await Promise.all([
      Alert.countDocuments({ status: 'sent' }),
      Alert.countDocuments({ status: 'failed' }),
      Alert.countDocuments({ status: 'queued' }),
      Alert.countDocuments({ status: 'sent', createdAt: { $gte: startOfMonth } }),
      AIUsageLog.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        {
          $group: {
            _id: null,
            totalTokens: { $sum: '$totalTokens' },
            totalCostUSD: { $sum: '$estimatedCostUSD' },
            callCount: { $sum: 1 },
            validationFailedCount: {
              $sum: { $cond: [{ $eq: ['$validationPassed', false] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    const aiStats = aiUsage[0] || { totalTokens: 0, totalCostUSD: 0, callCount: 0, validationFailedCount: 0 };

    res.json({
      success: true,
      stats: {
        totalSent,
        totalFailed,
        totalQueued,
        monthlySent,
        aiCallsThisMonth: aiStats.callCount,
        aiTokensThisMonth: aiStats.totalTokens,
        aiCostUSD: Number(aiStats.totalCostUSD.toFixed(4)),
        validationRejections: aiStats.validationFailedCount,
        sandboxMode: process.env.EMAIL_SANDBOX_MODE === 'true'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/me/notifications
// @desc    Get user's notification preferences
// @access  Any authenticated user
router.get('/preferences/me', protect, async (req, res) => {
  try {
    let prefs = await NotificationPreference.findOne({ user: req.user._id });
    if (!prefs) {
      prefs = await NotificationPreference.create({ user: req.user._id });
    }
    res.json({ success: true, preferences: prefs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/me/notifications
// @desc    Update user's notification preferences
// @access  Any authenticated user
router.put('/preferences/me', protect, async (req, res) => {
  try {
    const { emailEnabled, digestMode, quietHours, language, disabledCategories } = req.body;
    let prefs = await NotificationPreference.findOne({ user: req.user._id });
    if (!prefs) {
      prefs = new NotificationPreference({ user: req.user._id });
    }

    if (emailEnabled !== undefined) prefs.emailEnabled = emailEnabled;
    if (digestMode) prefs.digestMode = digestMode;
    if (quietHours) prefs.quietHours = quietHours;
    if (language) prefs.language = language;
    if (disabledCategories) prefs.disabledCategories = disabledCategories;

    await prefs.save();
    res.json({ success: true, message: 'Preferences updated successfully', preferences: prefs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
