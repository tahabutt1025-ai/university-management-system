import { useState, useEffect } from 'react';
import { attendanceAPI, teachersAPI, coursesAPI } from '../../api';
import { Calendar, CheckCircle, XCircle, Clock, Save, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TeacherAttendance() {
  const [teacher, setTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [courseData, setCourseData] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    teachersAPI.getMe().then(res => {
      setTeacher(res.data.teacher);
      return coursesAPI.getAll({ isActive: 'true' });
    }).then(res => {
      setCourses(res.data.courses);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const fetchCourseAttendance = async () => {
    if (!selectedCourse || !date) return;
    setFetching(true);
    try {
      const res = await attendanceAPI.getByDate(selectedCourse, date);
      setCourseData(res.data);
      // Initialize attendance state
      const initial = {};
      const marked = res.data.records || [];
      const unmarked = res.data.unmarkedStudents || [];
      marked.forEach(r => { initial[r.student._id] = r.status; });
      unmarked.forEach(s => { if (!initial[s._id]) initial[s._id] = 'present'; });
      setAttendance(initial);
    } catch (err) {
      toast.error('Failed to load attendance data');
    } finally { setFetching(false); }
  };

  useEffect(() => { if (selectedCourse && date) fetchCourseAttendance(); }, [selectedCourse, date]);

  const handleSave = async () => {
    if (!selectedCourse || !date) { toast.error('Select course and date'); return; }
    const records = Object.entries(attendance).map(([studentId, status]) => ({ studentId, status }));
    if (records.length === 0) { toast.error('No students to mark'); return; }
    setSaving(true);
    try {
      await attendanceAPI.mark({ courseId: selectedCourse, date, records });
      toast.success(`✅ Attendance saved for ${records.length} students`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const allStudents = [
    ...(courseData?.records?.map(r => r.student) || []),
    ...(courseData?.unmarkedStudents || [])
  ].filter((s, i, arr) => arr.findIndex(x => x._id === s._id) === i);

  const presentCount = Object.values(attendance).filter(s => s === 'present').length;
  const absentCount = Object.values(attendance).filter(s => s === 'absent').length;
  const lateCount = Object.values(attendance).filter(s => s === 'late').length;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Mark Attendance</h1><p>Record daily class attendance for your students</p></div>
        {allStudents.length > 0 && (
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }}/> : <Save size={14}/>}
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="card mb-20">
        <div className="card-body" style={{ paddingTop: 16, paddingBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">Select Course</label>
              <select className="form-select" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
                <option value="">— Choose a course —</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.courseName} ({c.courseCode})</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={date} max={new Date().toISOString().split('T')[0]} onChange={e => setDate(e.target.value)} />
            </div>
            {allStudents.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button className="btn btn-success btn-sm" onClick={() => setAttendance(Object.fromEntries(allStudents.map(s => [s._id, 'present'])))}>
                  All Present
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setAttendance(Object.fromEntries(allStudents.map(s => [s._id, 'absent'])))}>
                  All Absent
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {allStudents.length > 0 && (
        <div className="grid-3 mb-20">
          {[
            { label: 'Present', value: presentCount, color: 'var(--success)', icon: <CheckCircle size={18}/> },
            { label: 'Absent', value: absentCount, color: 'var(--danger)', icon: <XCircle size={18}/> },
            { label: 'Late', value: lateCount, color: 'var(--warning)', icon: <Clock size={18}/> }
          ].map(s => (
            <div key={s.label} style={{ padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: s.color }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Student List */}
      {fetching ? (
        <div className="loading-overlay"><div className="loading-spinner"/><p>Loading students...</p></div>
      ) : !selectedCourse ? (
        <div className="empty-state card" style={{ padding: '60px 0' }}>
          <Calendar size={48} style={{ opacity: 0.3, marginBottom: 12 }}/>
          <p>Select a course and date to mark attendance</p>
        </div>
      ) : allStudents.length === 0 ? (
        <div className="empty-state card"><p>No students enrolled in this course</p></div>
      ) : (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Students — {courseData?.course?.name} ({allStudents.length} total)</span>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allStudents.map((student, i) => (
                <div key={student._id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                  background: 'var(--bg-surface)', borderRadius: 10,
                  border: `1px solid ${attendance[student._id] === 'present' ? 'rgba(16,185,129,0.2)' : attendance[student._id] === 'absent' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  transition: 'all 0.2s'
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, width: 28, textAlign: 'center', color: 'var(--text-muted)' }}>{i + 1}</div>
                  <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                    {student.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'S'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{student.user?.name || 'Unknown'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{student.rollNumber}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['present', 'late', 'absent', 'excused'].map(status => (
                      <button
                        key={status}
                        className={`btn btn-sm ${attendance[student._id] === status ? (status === 'present' ? 'btn-success' : status === 'absent' ? 'btn-danger' : 'btn-secondary') : 'btn-ghost'}`}
                        onClick={() => setAttendance(a => ({ ...a, [student._id]: status }))}
                        style={{ minWidth: 64, fontSize: 11 }}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
