import { useState, useEffect } from 'react';
import { assignmentsAPI, studentsAPI } from '../../api';
import { ClipboardList, Upload, Loader, Calendar, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [subForm, setSubForm] = useState({ text: '', fileUrl: '' });

  useEffect(() => {
    studentsAPI.getMe().then(res => {
      setStudent(res.data.student);
      return assignmentsAPI.getAll({ limit: 50 });
    }).then(res => {
      setAssignments(res.data.assignments);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!subForm.text && !subForm.fileUrl) { toast.error('Add text or file URL for submission'); return; }
    setSubmitting(selectedAssignment._id);
    try {
      await assignmentsAPI.submit(selectedAssignment._id, subForm);
      toast.success('Assignment submitted! ✅');
      setShowModal(false);
      setSubForm({ text: '', fileUrl: '' });
      const res = await assignmentsAPI.getAll({ limit: 50 });
      setAssignments(res.data.assignments);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally { setSubmitting(null); }
  };

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();

  if (loading) return <div className="loading-overlay"><div className="loading-spinner"/></div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>My Assignments</h1><p>View and submit your assignments</p></div>
      </div>

      {assignments.length === 0 ? (
        <div className="empty-state card" style={{ padding: '60px 0' }}>
          <ClipboardList size={48} style={{ opacity: 0.3, marginBottom: 12 }}/>
          <p>No assignments yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {assignments.map(a => (
            <div key={a._id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: isOverdue(a.dueDate) ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isOverdue(a.dueDate) ? 'var(--danger)' : 'var(--primary-400)', flexShrink: 0 }}>
                    <ClipboardList size={20}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{a.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--primary-400)', fontWeight: 600 }}>{a.course?.courseName} · {a.course?.courseCode}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className={`badge ${isOverdue(a.dueDate) ? 'badge-danger' : 'badge-success'}`}>
                          {isOverdue(a.dueDate) ? '🔴 Overdue' : '🟢 Active'}
                        </span>
                        <span className="badge badge-primary">{a.totalMarks} Marks</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>{a.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={12}/> Due: {format(new Date(a.dueDate), 'MMM d, yyyy · h:mm a')}
                      </span>
                      <button
                        className={`btn btn-sm ${isOverdue(a.dueDate) ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => { setSelectedAssignment(a); setSubForm({ text: '', fileUrl: '' }); setShowModal(true); }}
                        disabled={submitting === a._id}
                      >
                        {submitting === a._id ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }}/> : <Upload size={13}/>}
                        {isOverdue(a.dueDate) ? 'Submit Late' : 'Submit'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && selectedAssignment && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3 style={{ fontSize: 17, fontWeight: 700 }}>Submit Assignment</h3><button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div style={{ padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                <strong>{selectedAssignment.title}</strong> · {selectedAssignment.course?.courseName}
                {isOverdue(selectedAssignment.dueDate) && <div style={{ color: 'var(--warning)', fontSize: 11, marginTop: 4 }}>⚠️ This assignment is overdue. Late submission will be marked.</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Your Answer / Notes</label>
                <textarea className="form-textarea" rows={4} value={subForm.text} onChange={e => setSubForm(f => ({ ...f, text: e.target.value }))} placeholder="Write your answer here..."/>
              </div>
              <div className="form-group">
                <label className="form-label">File URL (Optional)</label>
                <input className="form-input" value={subForm.fileUrl} onChange={e => setSubForm(f => ({ ...f, fileUrl: e.target.value }))} placeholder="https://drive.google.com/..."/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }}/> : <CheckCircle size={14}/>}
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
