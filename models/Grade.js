const mongoose = require('mongoose');

const GradeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  examType: {
    type: String,
    enum: ['Quiz', 'Assignment', 'Midterm', 'Final', 'Lab', 'Project', 'Presentation'],
    required: true
  },
  marksObtained: {
    type: Number,
    required: true,
    min: 0
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 1
  },
  weightage: {
    type: Number, // percentage contribution to final grade
    default: 0
  },
  remarks: String,
  examDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Virtual for percentage
GradeSchema.virtual('percentage').get(function() {
  return ((this.marksObtained / this.totalMarks) * 100).toFixed(2);
});

// Virtual for letter grade
GradeSchema.virtual('letterGrade').get(function() {
  const pct = (this.marksObtained / this.totalMarks) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 85) return 'A';
  if (pct >= 80) return 'A-';
  if (pct >= 75) return 'B+';
  if (pct >= 70) return 'B';
  if (pct >= 65) return 'B-';
  if (pct >= 60) return 'C+';
  if (pct >= 55) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
});

GradeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Grade', GradeSchema);
