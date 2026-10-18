const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true
  },
  description: {
    type: String,
    // N-4 FIX: was required: true which caused a generic 500 when omitted;
    // route-level validation provides the user-friendly 400 message instead
    required: false
  },
  // N-4 FIX: instructions field was in allow-list but not in schema
  instructions: { type: String, maxlength: 5000 },
  dueDate: {
    type: Date,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true,
    default: 100
  },
  fileUrl: String, // Attachment URL
  submissions: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    fileUrl: String,
    text: String,
    marksObtained: Number,
    feedback: String,
    status: {
      type: String,
      enum: ['submitted', 'late', 'graded'],
      default: 'submitted'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Assignment', AssignmentSchema);
