/**
 * Database Seeder — Seeds the UMS database with realistic demo data
 * Run: node seed.js
 * Clear: node seed.js --clear
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const Course = require('./models/Course');
const Attendance = require('./models/Attendance');
const Grade = require('./models/Grade');
const Assignment = require('./models/Assignment');
const Fee = require('./models/Fee');
const Notification = require('./models/Notification');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');
};

const clearDB = async () => {
  await Promise.all([
    User.deleteMany({}),
    Student.deleteMany({}),
    Teacher.deleteMany({}),
    Course.deleteMany({}),
    Attendance.deleteMany({}),
    Grade.deleteMany({}),
    Assignment.deleteMany({}),
    Fee.deleteMany({}),
    Notification.deleteMany({})
  ]);
  console.log('🗑️  Database cleared');
};

const departments = ['Computer Science', 'Mathematics', 'Physics', 'Electrical Engineering', 'Business Administration'];
const designations = ['Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor'];
const examTypes = ['Quiz', 'Assignment', 'Midterm', 'Final', 'Lab'];
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const seed = async () => {
  await connectDB();

  if (process.argv.includes('--clear')) {
    await clearDB();
    process.exit(0);
  }

  await clearDB();
  console.log('🌱 Starting seed...');

  // ─── Admin ───
  const adminUser = await User.create({
    name: 'Dr. Sarah Ahmed',
    email: 'admin@university.edu',
    password: 'Admin@123',
    role: 'admin',
    phone: '+92-300-1234567',
    isActive: true
  });
  console.log('✅ Admin created');

  // ─── Teachers ───
  const teacherData = [
    { name: 'Prof. Ali Hassan', email: 'ali@university.edu', dept: 'Computer Science', designation: 'Professor', specialization: 'Machine Learning', employeeId: 'EMP-001' },
    { name: 'Dr. Fatima Khan', email: 'fatima@university.edu', dept: 'Mathematics', designation: 'Associate Professor', specialization: 'Linear Algebra', employeeId: 'EMP-002' },
    { name: 'Mr. Usman Malik', email: 'usman@university.edu', dept: 'Computer Science', designation: 'Assistant Professor', specialization: 'Web Development', employeeId: 'EMP-003' },
    { name: 'Dr. Ayesha Raza', email: 'ayesha@university.edu', dept: 'Physics', designation: 'Associate Professor', specialization: 'Quantum Physics', employeeId: 'EMP-004' },
    { name: 'Prof. Bilal Ahmed', email: 'bilal@university.edu', dept: 'Electrical Engineering', designation: 'Professor', specialization: 'Digital Electronics', employeeId: 'EMP-005' }
  ];

  const teachers = [];
  for (const td of teacherData) {
    const user = await User.create({ name: td.name, email: td.email, password: 'Teacher@123', role: 'teacher', isActive: true });
    const teacher = await Teacher.create({
      user: user._id, employeeId: td.employeeId, department: td.dept,
      designation: td.designation, specialization: td.specialization, qualification: 'PhD'
    });
    teachers.push({ user, teacher });
  }
  console.log(`✅ ${teachers.length} teachers created`);

  // ─── Courses ───
  const courseData = [
    { name: 'Data Structures & Algorithms', code: 'CS-301', dept: 'Computer Science', credits: 3, sem: 3, teacherIdx: 0, days: ['Monday', 'Wednesday'], time: ['09:00', '10:30'] },
    { name: 'Calculus II', code: 'MATH-202', dept: 'Mathematics', credits: 3, sem: 2, teacherIdx: 1, days: ['Tuesday', 'Thursday'], time: ['11:00', '12:30'] },
    { name: 'Web Engineering', code: 'CS-421', dept: 'Computer Science', credits: 3, sem: 4, teacherIdx: 2, days: ['Monday', 'Thursday'], time: ['14:00', '15:30'] },
    { name: 'Physics of Waves', code: 'PHY-201', dept: 'Physics', credits: 3, sem: 2, teacherIdx: 3, days: ['Wednesday', 'Friday'], time: ['10:00', '11:30'] },
    { name: 'Digital Logic Design', code: 'EE-201', dept: 'Electrical Engineering', credits: 3, sem: 2, teacherIdx: 4, days: ['Tuesday', 'Friday'], time: ['08:00', '09:30'] },
    { name: 'Operating Systems', code: 'CS-401', dept: 'Computer Science', credits: 3, sem: 5, teacherIdx: 0, days: ['Monday', 'Wednesday', 'Friday'], time: ['10:00', '11:00'] },
    { name: 'Linear Algebra', code: 'MATH-301', dept: 'Mathematics', credits: 3, sem: 3, teacherIdx: 1, days: ['Tuesday', 'Thursday'], time: ['09:00', '10:30'] },
    { name: 'Database Systems', code: 'CS-351', dept: 'Computer Science', credits: 3, sem: 4, teacherIdx: 2, days: ['Wednesday', 'Friday'], time: ['14:00', '15:30'] }
  ];

  const courses = [];
  for (const cd of courseData) {
    const course = await Course.create({
      courseName: cd.name,
      courseCode: cd.code,
      department: cd.dept,
      creditHours: cd.credits,
      semester: cd.sem,
      teacher: teachers[cd.teacherIdx].teacher._id,
      schedule: cd.days.map(day => ({ day, startTime: cd.time[0], endTime: cd.time[1], room: `Room-${randomBetween(101, 210)}` })),
      maxStudents: 50,
      isActive: true
    });
    await Teacher.findByIdAndUpdate(teachers[cd.teacherIdx].teacher._id, { $push: { assignedCourses: course._id } });
    courses.push(course);
  }
  console.log(`✅ ${courses.length} courses created`);

  // ─── Students ───
  const studentNames = [
    'Ahmed Ali', 'Sara Khan', 'Bilal Raza', 'Fatima Noor', 'Usman Qureshi',
    'Aisha Malik', 'Hassan Javed', 'Zara Ahmed', 'Omar Farooq', 'Maryam Shah',
    'Tariq Mahmood', 'Sana Butt', 'Imran Iqbal', 'Nadia Akhtar', 'Raza Hussain',
    'Hina Baig', 'Kamran Arif', 'Laila Siddiqui', 'Junaid Mirza', 'Amna Sheikh'
  ];

  const students = [];
  for (let i = 0; i < studentNames.length; i++) {
    const rollNum = `CS-${2021 + Math.floor(i / 8)}-${String(i + 1).padStart(3, '0')}`;
    const dept = randomFrom(departments);
    const sem = randomBetween(1, 6);
    const email = `${studentNames[i].split(' ')[0].toLowerCase()}${i + 1}@student.edu`;

    const user = await User.create({ name: studentNames[i], email, password: 'Student@123', role: 'student', isActive: true });

    // Assign 2-4 courses based on department and semester
    const matchingCourses = courses.filter(c => c.department === dept || c.department === 'Computer Science').slice(0, randomBetween(2, 4));
    const enrolledCourseIds = matchingCourses.map(c => c._id);

    const student = await Student.create({
      user: user._id,
      rollNumber: rollNum,
      department: dept,
      semester: sem,
      section: randomFrom(['A', 'B', 'C']),
      enrolledCourses: enrolledCourseIds,
      enrollmentDate: randomDate(new Date('2021-01-01'), new Date('2024-01-01'))
    });

    // Update courses with enrolled student
    for (const courseId of enrolledCourseIds) {
      await Course.findByIdAndUpdate(courseId, { $push: { enrolledStudents: student._id } });
    }

    students.push({ user, student, enrolledCourses: matchingCourses });
  }
  console.log(`✅ ${students.length} students created`);

  // ─── Attendance ───
  console.log('🔄 Generating attendance records...');
  const startDate = new Date('2024-09-01');
  const today = new Date();
  let attendanceCount = 0;

  for (const { student, enrolledCourses } of students) {
    for (const course of enrolledCourses) {
      const teacher = teachers.find(t => t.teacher._id.toString() === course.teacher.toString());
      if (!teacher) continue;

      let current = new Date(startDate);
      while (current <= today) {
        const dayName = days[current.getDay() - 1];
        const hasClass = course.schedule?.some(s => s.day === dayName);

        if (hasClass && current.getDay() >= 1 && current.getDay() <= 5) {
          // Simulate some students being at-risk (higher absence rate)
          const isAtRiskStudent = students.indexOf(students.find(s => s.student._id.toString() === student._id.toString())) < 4;
          const absenceRate = isAtRiskStudent ? 0.4 : 0.15;

          // Monday absence pattern for at-risk students
          const isMondayProne = isAtRiskStudent && current.getDay() === 1;
          const rand = Math.random();
          let status;
          if (isMondayProne && rand < 0.6) status = 'absent';
          else if (rand < absenceRate) status = 'absent';
          else if (rand < absenceRate + 0.08) status = 'late';
          else status = 'present';

          try {
            const attDate = new Date(current);
            attDate.setHours(0, 0, 0, 0);
            await Attendance.create({
              student: student._id,
              course: course._id,
              markedBy: teacher.teacher._id,
              date: attDate,
              status
            });
            attendanceCount++;
          } catch (e) { /* Skip duplicates */ }
        }

        current.setDate(current.getDate() + 1);
      }
    }
  }
  console.log(`✅ ${attendanceCount} attendance records created`);

  // ─── Grades ───
  console.log('🔄 Generating grades...');
  let gradeCount = 0;
  const gradeExamTypes = ['Quiz', 'Assignment', 'Midterm', 'Final'];
  const gradeWeightages = { Quiz: 5, Assignment: 10, Midterm: 35, Final: 50 };

  for (const { student, enrolledCourses } of students) {
    for (const course of enrolledCourses) {
      const teacher = teachers.find(t => t.teacher._id.toString() === course.teacher.toString());
      if (!teacher) continue;

      const isAtRiskStudent = students.indexOf(students.find(s => s.student._id.toString() === student._id.toString())) < 4;

      for (const examType of gradeExamTypes) {
        const totalMarks = examType === 'Final' ? 100 : examType === 'Midterm' ? 60 : examType === 'Assignment' ? 20 : 15;
        
        // At-risk students get lower marks, potentially declining
        let baseMarks = isAtRiskStudent ? randomBetween(20, 50) : randomBetween(55, 95);
        const marksObtained = Math.min(baseMarks, totalMarks);

        try {
          await Grade.create({
            student: student._id,
            course: course._id,
            gradedBy: teacher.teacher._id,
            examType,
            marksObtained,
            totalMarks,
            weightage: gradeWeightages[examType] || 0,
            examDate: randomDate(new Date('2024-09-15'), today)
          });
          gradeCount++;
        } catch (e) { /* Skip */ }
      }
    }
  }
  console.log(`✅ ${gradeCount} grade records created`);

  // ─── Assignments ───
  const assignmentTitles = [
    'Implement a Binary Search Tree', 'Integration by Parts Practice', 
    'Build a REST API with Node.js', 'Wave Propagation Simulation',
    'Logic Gate Circuit Design', 'Sorting Algorithm Analysis',
    'Matrix Operations in MATLAB', 'Responsive Portfolio Website'
  ];

  for (let i = 0; i < courses.length; i++) {
    const teacher = teachers.find(t => t.teacher._id.toString() === courses[i].teacher.toString());
    if (!teacher) continue;
    await Assignment.create({
      course: courses[i]._id,
      createdBy: teacher.teacher._id,
      title: assignmentTitles[i] || `Assignment ${i + 1}`,
      description: `Complete the ${assignmentTitles[i] || 'assignment'} as per the given specifications and submit before the deadline.`,
      dueDate: randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      totalMarks: 20
    });
  }
  console.log(`✅ ${courses.length} assignments created`);

  // ─── Fees ───
  let feeCount = 0;
  for (const { student } of students) {
    const feeTypes = ['Tuition', 'Library', 'Examination'];
    for (const feeType of feeTypes) {
      const amount = feeType === 'Tuition' ? 50000 : feeType === 'Library' ? 2000 : 3000;
      const isPaid = Math.random() > 0.3;
      await Fee.create({
        student: student._id,
        feeType,
        amount,
        dueDate: new Date('2024-10-31'),
        status: isPaid ? 'paid' : 'unpaid',
        paidAmount: isPaid ? amount : 0,
        paidDate: isPaid ? randomDate(new Date('2024-09-01'), new Date()) : undefined,
        semester: student.semester,
        academicYear: '2024-2025',
        paymentMethod: isPaid ? randomFrom(['Cash', 'Bank Transfer', 'Online']) : undefined
      });
      feeCount++;
    }
  }
  console.log(`✅ ${feeCount} fee records created`);

  // ─── Notifications ───
  const adminNotifications = [
    { title: '🤖 AI Alert: At-Risk Students Detected', message: '4 students flagged with attendance below 75%. Review analytics dashboard.', type: 'ai_insight', priority: 'high' },
    { title: '💰 Fee Collection Update', message: 'Monthly fee collection report is ready. 70% collection rate for October 2024.', type: 'fee_reminder', priority: 'medium' },
    { title: '📊 System Report Ready', message: 'Monthly academic performance report has been generated.', type: 'announcement', priority: 'low' }
  ];

  for (const notif of adminNotifications) {
    await Notification.create({ recipient: adminUser._id, ...notif });
  }

  // Student notifications
  for (const { user: studentUser } of students.slice(0, 5)) {
    await Notification.create({
      recipient: studentUser._id,
      title: '📋 New Assignment Posted',
      message: 'Your teacher has posted a new assignment. Due in 7 days.',
      type: 'assignment',
      priority: 'medium'
    });
  }
  console.log('✅ Notifications created');

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 LOGIN CREDENTIALS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👑 Admin:   admin@university.edu / Admin@123');
  console.log('👨‍🏫 Teacher: ali@university.edu  / Teacher@123');
  console.log('👨‍🎓 Student: ahmed1@student.edu  / Student@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
};

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
