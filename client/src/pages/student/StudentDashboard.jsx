import { useState, useEffect } from 'react';
import { studentsAPI, feesAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Calendar, Star, CreditCard, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [gradesSummary, setGradesSummary] = useState([]);
  const [fees, setFees] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentsAPI.getMe().then(async (res) => {
      const s = res.data.student;
      setStudent(s);
      const [attRes, gradesRes, feesRes] = await Promise.all([
        studentsAPI.getAttendanceSummary(s._id),
        studentsAPI.getGradesSummary(s._id),
        feesAPI.getStudentSummary(s._id)
      ]);
      setAttendanceSummary(attRes.data.summary);
      setGradesSummary(gradesRes.data.summary);
      setFees(feesRes.data.summary);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-overlay"><div className="loading-spinner"/><p>Loading your dashboard...</p></div>;

  const overallAttendance = attendanceSummary.length > 0
    ? (attendanceSummary.reduce((acc, s) => acc + parseFloat(s.attendancePercentage), 0) / attendanceSummary.length).toFixed(1)
    : 0;

  const overallGrade = gradesSummary.length > 0
    ? (gradesSummary.reduce((acc, s) => acc + parseFloat(s.overallPercentage), 0) / gradesSummary.length).toFixed(1)
    : 0;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Welcome, {user?.name?.split(' ')[0]}! 🎓</h1>
          <p>{student?.rollNumber} · {student?.department} · Semester {student?.semester}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4 mb-24">
        {[
          { label: 'Enrolled Courses', value: student?.enrolledCourses?.length || 0, icon: <BookOpen size={20}/>, color: '#6366f1', bg: 'rgba(99,102,241,0.12)', path: '/student/attendance' },
          { label: 'Overall Attendance', value: `${overallAttendance}%`, icon: <Calendar size={20}/>, color: parseFloat(overallAttendance) >= 75 ? '#10b981' : '#ef4444', bg: parseFloat(overallAttendance) >= 75 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', path: '/student/attendance' },
          { label: 'Overall Grade Avg', value: `${overallGrade}%`, icon: <Star size={20}/>, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', path: '/student/grades' },
          { label: 'Pending Fees', value: `₹${((fees?.totalPending || 0) / 1000).toFixed(0)}K`, icon: <CreditCard size={20}/>, color: fees?.totalPending > 0 ? '#ef4444' : '#10b981', bg: fees?.totalPending > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', path: '/student/fees' }
        ].map(card => (
          <div key={card.label} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate(card.path)}>
            <div className="stat-icon" style={{ background: card.bg, color: card.color }}>{card.icon}</div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Low attendance warning */}
      {parseFloat(overallAttendance) < 75 && overallAttendance > 0 && (
        <div style={{ padding: '16px 20px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: '#f87171' }}>Low Attendance Warning</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Your attendance is {overallAttendance}%, below the required 75%. Please attend your classes regularly.</div>
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Course Attendance */}
        <div className="card">
          <div className="card-header"><span className="card-title">Attendance by Subject</span></div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            {attendanceSummary.length === 0 ? (
              <div className="empty-state"><p>No attendance records yet</p></div>
            ) : attendanceSummary.map((s, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s.course?.courseName}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>({s.course?.courseCode})</span>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 13, color: parseFloat(s.attendancePercentage) >= 75 ? 'var(--success)' : 'var(--danger)' }}>
                    {s.attendancePercentage}%
                  </span>
                </div>
                <div className="progress-bar-wrapper">
                  <div className={`progress-bar-fill ${parseFloat(s.attendancePercentage) >= 75 ? 'success' : parseFloat(s.attendancePercentage) >= 60 ? 'warning' : 'danger'}`} style={{ width: `${s.attendancePercentage}%` }} />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>✅ {s.present} present</span>
                  <span>❌ {s.absent} absent</span>
                  <span>🕐 {s.late} late</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grade Summary */}
        <div className="card">
          <div className="card-header"><span className="card-title">Grade Summary</span></div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            {gradesSummary.length === 0 ? (
              <div className="empty-state"><p>No grades recorded yet</p></div>
            ) : gradesSummary.map((s, i) => {
              const pct = parseFloat(s.overallPercentage);
              const letterGrade = pct >= 90 ? 'A+' : pct >= 85 ? 'A' : pct >= 80 ? 'A-' : pct >= 75 ? 'B+' : pct >= 70 ? 'B' : pct >= 65 ? 'B-' : pct >= 60 ? 'C+' : pct >= 55 ? 'C' : pct >= 50 ? 'D' : 'F';
              const gradeColor = pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
              return (
                <div key={i} style={{ padding: '10px 0', borderBottom: i < gradesSummary.length - 1 ? '1px solid var(--bg-border)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.course?.courseName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.grades?.length || 0} assessments</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: gradeColor }}>{letterGrade}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.overallPercentage}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Enrolled Courses */}
      {student?.enrolledCourses?.length > 0 && (
        <div className="card mt-24">
          <div className="card-header"><span className="card-title">My Courses</span></div>
          <div className="card-body">
            <div className="grid-3">
              {student.enrolledCourses.map(course => (
                <div key={course._id} style={{ padding: '14px 16px', background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--bg-border)' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)', flexShrink: 0 }}>
                      <BookOpen size={14}/>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{course.courseName}</div>
                      <div style={{ fontSize: 10, color: 'var(--primary-400)' }}>{course.courseCode}</div>
                    </div>
                  </div>
                  {course.schedule?.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      📅 {course.schedule.map(s => s.day.slice(0, 3)).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
