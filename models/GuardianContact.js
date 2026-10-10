const mongoose = require('mongoose');

const GuardianContactSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  relation: {
    type: String,
    enum: ['Father', 'Mother', 'Guardian', 'Other'],
    default: 'Guardian'
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String
  },
  consentGiven: {
    type: Boolean,
    default: false
  },
  consentDate: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('GuardianContact', GuardianContactSchema);
