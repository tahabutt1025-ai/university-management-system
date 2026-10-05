const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  department: {
    type: String,
    required: true,
    enum: ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
           'English', 'Business Administration', 'Electrical Engineering',
           'Mechanical Engineering', 'Civil Engineering']
  },
  designation: {
    type: String,
    enum: ['Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor'],
    default: 'Lecturer'
  },
  qualification: String,
  specialization: String,
  assignedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  joinDate: {
    type: Date,
    default: Date.now
  },
  officeHours: String,
  officeRoom: String
}, { timestamps: true });

module.exports = mongoose.model('Teacher', TeacherSchema);
