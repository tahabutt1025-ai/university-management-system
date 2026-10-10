const mongoose = require('mongoose');

const NotificationPreferenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  emailEnabled: {
    type: Boolean,
    default: true
  },
  digestMode: {
    type: String,
    enum: ['instant', 'daily_digest'],
    default: 'instant'
  },
  quietHours: {
    enabled: { type: Boolean, default: false },
    startHour: { type: Number, default: 22 }, // 10 PM
    endHour: { type: Number, default: 7 }     // 7 AM
  },
  language: {
    type: String,
    enum: ['en', 'ur'],
    default: 'en'
  },
  // Specific category opt-outs (academic alerts vs marketing vs reminders)
  disabledCategories: [{
    type: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('NotificationPreference', NotificationPreferenceSchema);
