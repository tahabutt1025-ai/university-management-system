import { useState, useEffect } from 'react';
import { assignmentsAPI, coursesAPI } from '../../api';
import { ClipboardList, Plus, Trash2, Users, Loader, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function TeacherAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ course: '', title: '', description: '', dueDate: '', totalMarks: 20 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignRes, coursesRes] = await Promise.all([
        assignmentsAPI.getAll({ limit: 30 }),
        coursesAPI.getAll({ isActive: 'true' })
      ]);
      setAssignments(assignRes.data.assignments);
      setCourses(coursesRes.data.courses);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!form.course || !form.title || !form.dueDate) { toast.error('Fill all required fields'); return; }
    setSaving(true);
    try {
      await assignmentsAPI.create(form);
      toast.success('Assignment created! 📋');
      setShowModal(false);
      setForm({ course: '', title: '', description: '', dueDate: '', totalMarks: 20 });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try { await assignmentsAPI.delete(id); toast.success('Deleted'); fetchData(); }
    catch { toast.error('Failed to delete'); }
  };

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Assignments</h1><p>Create and manage assignments for your courses</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15}/> Create Assignment</button>
      </div>

      {loading ? <div className="loading-overlay"><div className="loading-spinner"/></div> : (
        <div className="grid-2">
          {assignments.map(a => (
            <div key={a._id} className="card" style={{ position: 'relative' }}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)', flexShrink: 0 }}>
                      <ClipboardList size={18}/>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--primary-400)', fontWeight: 600 }}>{a.course?.courseCode}</div>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(a._id, a.title)}><Trash2 size={13} color="var(--danger)"/></button>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                  {a.description?.slice(0, 120)}{a.description?.length > 120 ? '...' : ''}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className={`badge ${isOverdue(a.dueDate) ? 'badge-danger' : 'badge-success'}`}>
                    <Calendar size={10}/> {isOverdue(a.dueDate) ? 'Overdue' : 'Active'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Due: {format(new Date(a.dueDate), 'MMM d, yyyy')}</span>
                  <span className="badge badge-primary">{a.totalMarks} Marks</span>
                </div>
              </div>
            </div>
          ))}
          {assignments.length === 0 && (
            <div style={{ gridColumn: '1/-1' }}>
              <div className="empty-state card"><ClipboardList size={40}/><p>No assignments yet. Create one above.</p></div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3 style={{ fontSize: 17, fontWeight: 700 }}>Create Assignment</h3><button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Course *</label>
                <select className="form-select" value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))}>
                  <option value="">Select course...</option>
                  {courses.map(c => <option key={c._id} value={c._id}>{c.courseName} ({c.courseCode})</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Assignment title..." />
              </div>
              <div className="form-group"><label className="form-label">Description</label>
                <textarea className="form-textarea" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the assignment..." />
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Due Date *</label>
                  <input className="form-input" type="datetime-local" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div className="form-group"><label className="form-label">Total Marks</label>
                  <input className="form-input" type="number" value={form.totalMarks} onChange={e => setForm(f => ({ ...f, totalMarks: parseInt(e.target.value) }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }}/> : <Plus size={14}/>}
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
