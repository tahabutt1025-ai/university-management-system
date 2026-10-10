const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  rule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AlertRule',
    required: true
  },
  ruleCode: {
    type: String,
    required: true,
    index: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipientEmail: {
    type: String,
    required: true
  },
  recipientRole: {
    type: String,
    enum: ['student', 'teacher', 'admin', 'parent'],
    default: 'student'
  },
  facts: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  isAiGenerated: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['queued', 'sent', 'failed', 'skipped'],
    default: 'queued',
    index: true
  },
  failureReason: {
    type: String
  },
  retryCount: {
    type: Number,
    default: 0
  },
  sentAt: {
    type: Date
  },
  cooldownUntil: {
    type: Date,
    index: true
  },
  openedAt: {
    type: Date
  }
}, { timestamps: true });

// Composite index to prevent duplicates inside the cooldown window
AlertSchema.index({ ruleCode: 1, recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', AlertSchema);
