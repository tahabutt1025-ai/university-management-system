const mongoose = require('mongoose');

const AIUsageLogSchema = new mongoose.Schema({
  alert: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert'
  },
  ruleCode: {
    type: String,
    required: true
  },
  model: {
    type: String,
    default: 'gpt-3.5-turbo'
  },
  promptTokens: {
    type: Number,
    default: 0
  },
  completionTokens: {
    type: Number,
    default: 0
  },
  totalTokens: {
    type: Number,
    default: 0
  },
  estimatedCostUSD: {
    type: Number,
    default: 0
  },
  latencyMs: {
    type: Number,
    default: 0
  },
  validationPassed: {
    type: Boolean,
    default: true
  },
  rejectionReason: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('AIUsageLog', AIUsageLogSchema);
