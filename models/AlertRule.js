const mongoose = require('mongoose');

const AlertRuleSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'low_attendance',
      'attendance_drop',
      'fee_due_soon',
      'fee_overdue',
      'new_result_published',
      'grade_trend_warning',
      'upcoming_deadline',
      'new_notice',
      'at_risk_digest',
      'admin_daily_summary'
    ]
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  threshold: {
    type: Number,
    default: 75 // e.g. 75% for attendance, 7 days for fee, 15 points for drop
  },
  secondaryThreshold: {
    type: Number,
    default: 2 // e.g. 2 days before fee, 3 days for deadline
  },
  cooldownDays: {
    type: Number,
    default: 7 // Days before same alert can be sent to same recipient
  },
  maxOccurrences: {
    type: Number,
    default: 3 // e.g. fee overdue max 3 times
  },
  audience: {
    type: String,
    enum: ['student', 'teacher', 'admin', 'parent', 'all'],
    default: 'student'
  },
  schedule: {
    type: String,
    default: 'daily' // 'daily', 'weekly', 'on_event'
  },
  enabled: {
    type: Boolean,
    default: true
  },
  tone: {
    type: String,
    enum: ['friendly', 'informative', 'firm_warning', 'urgent'],
    default: 'informative'
  },
  fallbackSubjectTemplate: {
    type: String,
    required: true
  },
  fallbackBodyTemplate: {
    type: String,
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('AlertRule', AlertRuleSchema);
