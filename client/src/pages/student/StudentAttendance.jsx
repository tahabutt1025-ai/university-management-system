import { useState, useEffect } from 'react';
import { studentsAPI, attendanceAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Calendar } from 'lucide-react';

export default function StudentAttendance() {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [summary, setSummary] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState('');

  useEffect(() => {
    studentsAPI.getMe().then(async res => {
      const s = res.data.student;
      setStudent(s);
      const attRes = await studentsAPI.getAttendanceSummary(s._id);
      setSummary(attRes.data.summary);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (student) {
      attendanceAPI.getAll({ studentId: student._id, courseId: selectedCourse || undefined, limit: 100 })
        .then(res => setRecords(res.data.records))
        .catch(console.error);
    }
  }, [student, selectedCourse]);

  if (loading) return <div className="loading-overlay"><div className="loading-spinner"/></div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>My Attendance</h1><p>Track your class attendance records</p></div>
      </div>

      {/* Summary Cards */}
      <div className="grid-3 mb-24">
        {summary.map((s, i) => {
          const pct = parseFloat(s.attendancePercentage);
          return (
            <div key={i} className="card" style={{ cursor: 'pointer', border: selectedCourse === s.course._id ? '1px solid var(--primary-500)' : '' }}
              onClick={() => setSelectedCourse(selectedCourse === s.course._id ? '' : s.course._id)}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{s.course?.courseName}</div>
                    <div style={{ fontSize: 11, color: 'var(--primary-400)' }}>{s.course?.courseCode}</div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: pct >= 75 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                    {s.attendancePercentage}%
                  </div>
                </div>
                <div className="progress-bar-wrapper" style={{ marginBottom: 10 }}>
                  <div className={`progress-bar-fill ${pct >= 75 ? 'success' : pct >= 60 ? 'warning' : 'danger'}`} style={{ width: `${pct}%` }} />
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                  <span style={{ color: 'var(--success)' }}>✅ {s.present}</span>
                  <span style={{ color: 'var(--danger)' }}>❌ {s.absent}</span>
                  <span style={{ color: 'var(--warning)' }}>⏰ {s.late}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>Total: {s.total}</span>
                </div>
                {pct < 75 && (
                  <div style={{ marginTop: 8, fontSize: 11, padding: '4px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: 6, color: '#f87171' }}>
                    ⚠️ Below 75% — at risk of failing attendance requirement
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Attendance Records */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Attendance History</span>
          <select className="form-select" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
            <option value="">All Courses</option>
            {summary.map(s => <option key={s.course._id} value={s.course._id}>{s.course.courseName}</option>)}
          </select>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Course</th><th>Status</th><th>Remarks</th></tr></thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={4}><div className="empty-state"><Calendar size={32}/><p>No records found</p></div></td></tr>
              ) : records.map(r => (
                <tr key={r._id}>
                  <td style={{ fontSize: 13 }}>{new Date(r.date).toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.course?.courseName}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>({r.course?.courseCode})</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`status-dot ${r.status}`}/>
                      <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                        color: r.status === 'present' ? 'var(--success)' : r.status === 'absent' ? 'var(--danger)' : r.status === 'late' ? 'var(--warning)' : 'var(--info)' }}>
                        {r.status}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
