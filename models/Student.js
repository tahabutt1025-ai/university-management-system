const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    enum: ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 
           'English', 'Business Administration', 'Electrical Engineering', 
           'Mechanical Engineering', 'Civil Engineering']
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  section: {
    type: String,
    default: 'A'
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  enrolledCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  guardianName: String,
  guardianPhone: String,
  address: String,
  dateOfBirth: Date,
  cgpa: {
    type: Number,
    default: 0,
    min: 0,
    max: 4
  }
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);
