import { useState, useEffect } from 'react';
import { coursesAPI, studentsAPI } from '../../api';
import { Users, UserPlus, UserMinus, Search, BookOpen, Loader, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminEnrollment() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseLoading, setCourseLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    Promise.all([
      coursesAPI.getAll({ isActive: 'true', limit: 100 }),
      studentsAPI.getAll({ limit: 100 })
    ]).then(([coursesRes, studentsRes]) => {
      setCourses(coursesRes.data.courses || []);
      setStudents(studentsRes.data.students || []);
    }).catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const loadCourseEnrollment = async (course) => {
    setSelectedCourse(course);
    setCourseLoading(true);
    try {
      const res = await coursesAPI.getById(course._id);
      const enrolled = res.data.course.enrolledStudents || [];
      const enrolledIds = new Set(enrolled.map(s => s._id));
      setEnrolledStudents(enrolled);
      setAvailableStudents(students.filter(s => !enrolledIds.has(s._id)));
    } catch {
      toast.error('Failed to load enrollment data');
    } finally {
      setCourseLoading(false);
    }
  };

  const handleEnroll = async (studentId, studentName) => {
    if (enrolledStudents.length >= (selectedCourse.maxStudents || 50)) {
      toast.error(`Course is full (max ${selectedCourse.maxStudents} students)`);
      return;
    }
    setActionLoading(prev => ({ ...prev, [studentId]: 'enrolling' }));
    try {
      await coursesAPI.enroll(selectedCourse._id, studentId);
      toast.success(`${studentName} enrolled successfully`);
      // Optimistically update UI
      const student = availableStudents.find(s => s._id === studentId);
      if (student) {
        setEnrolledStudents(prev => [...prev, student]);
        setAvailableStudents(prev => prev.filter(s => s._id !== studentId));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to enroll student');
    } finally {
      setActionLoading(prev => ({ ...prev, [studentId]: undefined }));
    }
  };

  const handleUnenroll = async (studentId, studentName) => {
    if (!window.confirm(`Remove ${studentName} from this course? Their grades and attendance will be preserved.`)) return;
    setActionLoading(prev => ({ ...prev, [studentId]: 'removing' }));
    try {
      await coursesAPI.unenroll(selectedCourse._id, studentId);
      toast.success(`${studentName} removed from course`);
      const student = enrolledStudents.find(s => s._id === studentId);
      if (student) {
        setAvailableStudents(prev => [...prev, student]);
        setEnrolledStudents(prev => prev.filter(s => s._id !== studentId));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove student');
    } finally {
      setActionLoading(prev => ({ ...prev, [studentId]: undefined }));
    }
  };

  const filteredAvailable = availableStudents.filter(s =>
    !search ||
    s.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEnrolled = enrolledStudents.filter(s =>
    !search ||
    s.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const capacity = selectedCourse ? `${enrolledStudents.length} / ${selectedCourse.maxStudents || 50}` : '—';
  const isFull = selectedCourse && enrolledStudents.length >= (selectedCourse.maxStudents || 50);

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Course Enrollment</h1>
          <p>Manage student enrollment for each course</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner"/></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>

          {/* Course List */}
          <div className="card" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="card-header"><span className="card-title">Courses ({courses.length})</span></div>
            <div style={{ padding: '8px 0' }}>
              {courses.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}><BookOpen size={32}/><p>No active courses</p></div>
              ) : courses.map(c => (
                <div
                  key={c._id}
                  onClick={() => loadCourseEnrollment(c)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer',
                    background: selectedCourse?._id === c._id ? 'rgba(99,102,241,0.1)' : 'transparent',
                    borderLeft: selectedCourse?._id === c._id ? '3px solid var(--primary-400)' : '3px solid transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.courseName}</div>
                  <div style={{ fontSize: 11, color: 'var(--primary-400)' }}>{c.courseCode} · {c.department}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {c.enrolledStudentCount || 0} / {c.maxStudents || 50} students
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enrollment Panel */}
          <div>
            {!selectedCourse ? (
              <div className="card">
                <div className="empty-state" style={{ padding: '80px 0' }}>
                  <BookOpen size={48} style={{ opacity: 0.3 }}/>
                  <p>Select a course to manage enrollment</p>
                </div>
              </div>
            ) : courseLoading ? (
              <div className="loading-overlay"><div className="loading-spinner"/></div>
            ) : (
              <>
                {/* Course Info */}
                <div className="card mb-20">
                  <div className="card-body" style={{ paddingTop: 16, paddingBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedCourse.courseName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {selectedCourse.courseCode} · {selectedCourse.department} · Semester {selectedCourse.semester}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: isFull ? 'var(--danger)' : 'var(--success)' }}>{capacity}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Enrolled / Capacity</div>
                        </div>
                        {isFull && <span className="badge badge-danger">FULL</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div style={{ marginBottom: 16, position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
                  <input
                    className="form-input"
                    style={{ paddingLeft: 36 }}
                    placeholder="Search by name or roll number..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Available Students */}
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Available Students</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{filteredAvailable.length}</span>
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 0' }}>
                      {filteredAvailable.length === 0 ? (
                        <div className="empty-state" style={{ padding: '30px 0' }}><p>No students available</p></div>
                      ) : filteredAvailable.map(s => (
                        <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', transition: 'background 0.15s' }}>
                          <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                            {s.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{s.user?.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.rollNumber} · Sem {s.semester}</div>
                          </div>
                          <button
                            className="btn btn-success btn-sm btn-icon"
                            onClick={() => handleEnroll(s._id, s.user?.name)}
                            disabled={isFull || actionLoading[s._id]}
                            title="Enroll"
                          >
                            {actionLoading[s._id] === 'enrolling'
                              ? <Loader size={12} style={{ animation: 'spin 0.8s linear infinite' }}/>
                              : <UserPlus size={12}/>}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Enrolled Students */}
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Enrolled Students</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{filteredEnrolled.length}</span>
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 0' }}>
                      {filteredEnrolled.length === 0 ? (
                        <div className="empty-state" style={{ padding: '30px 0' }}><CheckCircle size={28} style={{ opacity: 0.3 }}/><p>No students enrolled</p></div>
                      ) : filteredEnrolled.map(s => (
                        <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', transition: 'background 0.15s' }}>
                          <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 10, background: 'linear-gradient(135deg, #34d399, #065f46)' }}>
                            {(s.user?.name || s.rollNumber || 'S')?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{s.user?.name || '—'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.rollNumber} · Sem {s.semester}</div>
                          </div>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => handleUnenroll(s._id, s.user?.name || s.rollNumber)}
                            disabled={actionLoading[s._id]}
                            title="Remove from course"
                          >
                            {actionLoading[s._id] === 'removing'
                              ? <Loader size={12} style={{ animation: 'spin 0.8s linear infinite' }}/>
                              : <UserMinus size={12} color="var(--danger)"/>}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
