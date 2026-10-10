const mongoose = require('mongoose');

const EmailEventSchema = new mongoose.Schema({
  alert: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert',
    required: true,
    index: true
  },
  recipientEmail: {
    type: String,
    required: true
  },
  event: {
    type: String,
    enum: ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'],
    required: true,
    index: true
  },
  provider: {
    type: String,
    default: 'smtp'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  occurredAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('EmailEvent', EmailEventSchema);
