import { useState, useEffect } from 'react';
import { gradesAPI, coursesAPI, studentsAPI, teachersAPI } from '../../api';
import { Plus, Star, BarChart2, Loader, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const EXAM_TYPES = ['Quiz', 'Assignment', 'Midterm', 'Final', 'Lab', 'Project', 'Presentation'];
const WEIGHTAGES = { Quiz: 5, Assignment: 10, Midterm: 35, Final: 50, Lab: 15, Project: 20, Presentation: 10 };

export default function TeacherGrades() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({ student: '', course: '', examType: 'Quiz', marksObtained: '', totalMarks: 100, weightage: 5, remarks: '' });

  useEffect(() => {
    coursesAPI.getAll({ isActive: 'true' })
      .then(res => setCourses(res.data.courses))
      .catch(console.error);
  }, []);

  const fetchGrades = async (courseId) => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [gradesRes, courseRes, statsRes] = await Promise.all([
        gradesAPI.getAll({ courseId }),
        coursesAPI.getById(courseId),
        gradesAPI.getCourseStats(courseId)
      ]);
      setGrades(gradesRes.data.grades);
      setStudents(courseRes.data.course.enrolledStudents || []);
      setStats(statsRes.data.stats);
    } catch { toast.error('Failed to load grades'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGrades(selectedCourse); }, [selectedCourse]);

  const handleSave = async () => {
    const { student, course, examType, marksObtained, totalMarks } = form;
    if (!student || !course || !marksObtained || !totalMarks) { toast.error('Fill all required fields'); return; }
    if (parseFloat(marksObtained) > parseFloat(totalMarks)) { toast.error('Marks cannot exceed total marks'); return; }
    setSaving(true);
    try {
      await gradesAPI.add(form);
      toast.success('Grade uploaded! ✅');
      setShowModal(false);
      fetchGrades(selectedCourse);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const openModal = () => {
    setForm({ student: '', course: selectedCourse, examType: 'Quiz', marksObtained: '', totalMarks: 15, weightage: 5, remarks: '' });
    setShowModal(true);
  };

  const letterGrade = (pct) => {
    if (pct >= 90) return { g: 'A+', c: 'var(--success)' };
    if (pct >= 80) return { g: 'A', c: '#34d399' };
    if (pct >= 70) return { g: 'B+', c: 'var(--primary-400)' };
    if (pct >= 60) return { g: 'B', c: '#60a5fa' };
    if (pct >= 50) return { g: 'C', c: 'var(--warning)' };
    return { g: 'F', c: 'var(--danger)' };
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>Grade Management</h1><p>Upload and manage student grades</p></div>
        {selectedCourse && <button className="btn btn-primary" onClick={openModal}><Plus size={15}/> Add Grade</button>}
      </div>

      {/* Course Selector */}
      <div className="card mb-20">
        <div className="card-body" style={{ paddingTop: 16, paddingBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Select Course</label>
              <select className="form-select" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
                <option value="">— Choose a course —</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.courseName} ({c.courseCode})</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid-4 mb-20">
          {[
            { label: 'Total Entries', value: stats.count, color: 'var(--primary-400)' },
            { label: 'Class Average', value: `${stats.average}%`, color: parseFloat(stats.average) >= 70 ? 'var(--success)' : 'var(--warning)' },
            { label: 'Highest Score', value: `${stats.highest}%`, color: 'var(--success)' },
            { label: 'Pass Rate', value: `${stats.passRate}%`, color: parseFloat(stats.passRate) >= 80 ? 'var(--success)' : 'var(--danger)' }
          ].map(s => (
            <div key={s.label} style={{ padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Grades Table */}
      <div className="card">
        <div className="card-header"><span className="card-title">Grade Records</span><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{grades.length} records</span></div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Student</th><th>Exam Type</th><th>Marks</th><th>%</th><th>Grade</th><th>Date</th><th>Remarks</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7}><div className="loading-overlay" style={{ minHeight: 100 }}><div className="loading-spinner"/></div></td></tr>
              : !selectedCourse ? <tr><td colSpan={7}><div className="empty-state"><p>Select a course to view grades</p></div></td></tr>
              : grades.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><Star size={32}/><p>No grades recorded yet</p></div></td></tr>
              : grades.map(g => {
                const pct = ((g.marksObtained / g.totalMarks) * 100).toFixed(1);
                const { gr: grd, c } = letterGrade(parseFloat(pct)) || {};
                const lg = letterGrade(parseFloat(pct));
                return (
                  <tr key={g._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{g.student?.user?.name || 'N/A'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{g.student?.rollNumber}</div>
                    </td>
                    <td><span className="badge badge-primary">{g.examType}</span></td>
                    <td style={{ fontWeight: 600 }}>{g.marksObtained} / {g.totalMarks}</td>
                    <td style={{ fontWeight: 700, color: parseFloat(pct) >= 70 ? 'var(--success)' : parseFloat(pct) >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{pct}%</td>
                    <td><span style={{ fontWeight: 800, fontSize: 14, color: lg?.c }}>{lg?.g}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(g.examDate).toLocaleDateString()}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{g.remarks || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Grade Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3 style={{ fontSize: 17, fontWeight: 700 }}>Upload Grade</h3><button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Student *</label>
                <select className="form-select" value={form.student} onChange={e => setForm(f => ({ ...f, student: e.target.value }))}>
                  <option value="">Select student...</option>
                  {students.map(s => <option key={s._id} value={s._id}>{s.user?.name} ({s.rollNumber})</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Exam Type</label>
                  <select className="form-select" value={form.examType} onChange={e => setForm(f => ({ ...f, examType: e.target.value, weightage: WEIGHTAGES[e.target.value] || 0, totalMarks: e.target.value === 'Final' ? 100 : e.target.value === 'Midterm' ? 60 : e.target.value === 'Assignment' ? 20 : 15 }))}>
                    {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Weightage (%)</label>
                  <input className="form-input" type="number" value={form.weightage} onChange={e => setForm(f => ({ ...f, weightage: parseInt(e.target.value) }))} />
                </div>
                <div className="form-group"><label className="form-label">Marks Obtained *</label>
                  <input className="form-input" type="number" value={form.marksObtained} onChange={e => setForm(f => ({ ...f, marksObtained: e.target.value }))} />
                </div>
                <div className="form-group"><label className="form-label">Total Marks *</label>
                  <input className="form-input" type="number" value={form.totalMarks} onChange={e => setForm(f => ({ ...f, totalMarks: e.target.value }))} />
                </div>
              </div>
              {form.marksObtained && form.totalMarks && (
                <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.1)', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                  Preview: <strong style={{ color: 'var(--primary-400)' }}>{((parseFloat(form.marksObtained) / parseFloat(form.totalMarks)) * 100).toFixed(1)}%</strong>
                  &nbsp;· Grade: <strong style={{ color: letterGrade((parseFloat(form.marksObtained) / parseFloat(form.totalMarks)) * 100)?.c }}>{letterGrade((parseFloat(form.marksObtained) / parseFloat(form.totalMarks)) * 100)?.g}</strong>
                </div>
              )}
              <div className="form-group"><label className="form-label">Remarks</label>
                <input className="form-input" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional feedback..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }}/> : <Upload size={14}/>}
                {saving ? 'Saving...' : 'Upload Grade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
