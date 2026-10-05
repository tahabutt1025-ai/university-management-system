import { useState, useEffect } from 'react';
import { teachersAPI, coursesAPI } from '../../api';
import { LayoutDashboard, BookOpen, Users, BarChart2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [teacher, setTeacher] = useState(null);
  const [overview, setOverview] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teachersAPI.getMe()
      .then(res => {
        setTeacher(res.data.teacher);
        if (res.data.teacher?._id) {
          return teachersAPI.getClassOverview(res.data.teacher._id);
        }
      })
      .then(res => { if (res) setOverview(res.data.overview); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-overlay"><div className="loading-spinner" /><p>Loading...</p></div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Welcome, {user?.name?.split(' ')[0]}! 👋</h1>
          <p>{teacher?.designation} · {teacher?.department}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3 mb-24">
        {[
          { label: 'Assigned Courses', value: teacher?.assignedCourses?.length || 0, icon: <BookOpen size={20}/>, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
          { label: 'Total Students', value: overview.reduce((acc, c) => acc + c.studentCount, 0), icon: <Users size={20}/>, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
          { label: 'Avg Attendance', value: overview.length > 0 ? overview.reduce((acc, c) => acc + parseFloat(c.avgAttendance), 0) / overview.length + '%' : 'N/A', icon: <BarChart2 size={20}/>, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Class Overview */}
      <div className="card">
        <div className="card-header"><span className="card-title">Class Performance Overview</span></div>
        <div className="card-body">
          {overview.length === 0 ? (
            <div className="empty-state"><BookOpen size={36} /><p>No courses assigned yet</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Course</th><th>Students</th><th>Avg Attendance</th><th>Avg Midterm</th></tr></thead>
                <tbody>
                  {overview.map((c, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.course.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--primary-400)' }}>{c.course.code}</div>
                      </td>
                      <td>{c.studentCount}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="progress-bar-wrapper" style={{ width: 80 }}>
                            <div className={`progress-bar-fill ${parseFloat(c.avgAttendance) >= 75 ? 'success' : 'danger'}`} style={{ width: c.avgAttendance }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: parseFloat(c.avgAttendance) >= 75 ? 'var(--success)' : 'var(--danger)' }}>{c.avgAttendance}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{c.avgMidtermGrade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Teacher Profile Card */}
      {teacher && (
        <div className="card mt-24">
          <div className="card-body" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div className="user-avatar" style={{ width: 64, height: 64, fontSize: 22 }}>
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{user?.name}</div>
              <div style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>{teacher.designation}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
                {teacher.department} · ID: {teacher.employeeId} · {teacher.qualification || 'Faculty'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
