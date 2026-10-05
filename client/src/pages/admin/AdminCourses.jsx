import { useState, useEffect } from 'react';
import { coursesAPI, teachersAPI } from '../../api';
import { Plus, Search, Edit2, Trash2, BookOpen, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const DEPARTMENTS = ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Business Administration', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering'];

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ courseName: '', courseCode: '', department: 'Computer Science', creditHours: 3, semester: 1, teacher: '', description: '', maxStudents: 50 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesRes, teachersRes] = await Promise.all([
        coursesAPI.getAll({ isActive: 'true' }),
        teachersAPI.getAll({})
      ]);
      setCourses(coursesRes.data.courses);
      setTeachers(teachersRes.data.teachers);
    } catch (err) { toast.error('Failed to load courses'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.courseName || !form.courseCode) { toast.error('Course name and code required'); return; }
    setSaving(true);
    try {
      if (editCourse) {
        await coursesAPI.update(editCourse._id, form);
        toast.success('Course updated');
      } else {
        await coursesAPI.create(form);
        toast.success('Course created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save course');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete course "${name}"?`)) return;
    try { await coursesAPI.delete(id); toast.success('Course deleted'); fetchData(); }
    catch { toast.error('Failed to delete'); }
  };

  const openCreate = () => {
    setEditCourse(null);
    setForm({ courseName: '', courseCode: '', department: 'Computer Science', creditHours: 3, semester: 1, teacher: '', description: '', maxStudents: 50 });
    setShowModal(true);
  };

  const openEdit = (course) => {
    setEditCourse(course);
    setForm({ courseName: course.courseName, courseCode: course.courseCode, department: course.department, creditHours: course.creditHours, semester: course.semester, teacher: course.teacher?._id || '', description: course.description || '', maxStudents: course.maxStudents });
    setShowModal(true);
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Course Management</h1>
          <p>Manage academic courses, schedules and assignments</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add Course</button>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner" /></div>
      ) : (
        <div className="grid-3">
          {courses.map(course => (
            <div key={course._id} className="card" style={{ transition: 'all 0.25s' }}>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
                    <BookOpen size={20} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(course)}><Edit2 size={13} /></button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(course._id, course.courseName)}><Trash2 size={13} color="var(--danger)" /></button>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{course.courseName}</div>
                <div style={{ fontSize: 11, color: 'var(--primary-400)', fontWeight: 600, marginBottom: 8 }}>{course.courseCode}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>{course.department}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="badge badge-info">Sem {course.semester}</span>
                  <span className="badge badge-primary">{course.creditHours} Credits</span>
                  <span className="badge badge-success">{course.enrolledStudents?.length || 0}/{course.maxStudents}</span>
                </div>
                {course.teacher?.user?.name && (
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#34d399' }}>
                      {course.teacher.user.name.split(' ')[0][0]}
                    </div>
                    {course.teacher.user.name}
                  </div>
                )}
                {course.schedule?.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                    📅 {course.schedule.map(s => `${s.day} ${s.startTime}`).join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <div style={{ gridColumn: '1/-1' }}>
              <div className="empty-state card">
                <BookOpen size={40} /><p>No courses found. Create one to get started.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>{editCourse ? 'Edit Course' : 'Create Course'}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Course Name *</label>
                  <input className="form-input" value={form.courseName} onChange={e => setForm(f => ({ ...f, courseName: e.target.value }))} placeholder="Data Structures" />
                </div>
                <div className="form-group">
                  <label className="form-label">Course Code *</label>
                  <input className="form-input" value={form.courseCode} onChange={e => setForm(f => ({ ...f, courseCode: e.target.value }))} placeholder="CS-301" />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-select" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assign Teacher</label>
                  <select className="form-select" value={form.teacher} onChange={e => setForm(f => ({ ...f, teacher: e.target.value }))}>
                    <option value="">— None —</option>
                    {teachers.map(t => <option key={t._id} value={t._id}>{t.user?.name} ({t.department})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Credit Hours</label>
                  <select className="form-select" value={form.creditHours} onChange={e => setForm(f => ({ ...f, creditHours: parseInt(e.target.value) }))}>
                    {[1,2,3,4,5,6].map(h => <option key={h} value={h}>{h} Hours</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Semester</label>
                  <select className="form-select" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: parseInt(e.target.value) }))}>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Course description..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
                {saving ? 'Saving...' : editCourse ? 'Update' : 'Create Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
