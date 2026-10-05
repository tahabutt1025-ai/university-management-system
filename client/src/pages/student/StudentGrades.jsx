import { useState, useEffect } from 'react';
import { studentsAPI, gradesAPI } from '../../api';
import { Star, TrendingUp } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';

export default function StudentGrades() {
  const [student, setStudent] = useState(null);
  const [summary, setSummary] = useState([]);
  const [allGrades, setAllGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState('');

  useEffect(() => {
    studentsAPI.getMe().then(async res => {
      const s = res.data.student;
      setStudent(s);
      const [sumRes, gradesRes] = await Promise.all([
        studentsAPI.getGradesSummary(s._id),
        gradesAPI.getAll({ limit: 200 })
      ]);
      setSummary(sumRes.data.summary);
      setAllGrades(gradesRes.data.grades);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-overlay"><div className="loading-spinner"/></div>;

  const radarData = summary.map(s => ({
    subject: s.course?.courseCode || s.course?.courseName?.slice(0, 10),
    score: parseFloat(s.overallPercentage)
  }));

  const letterGrade = (pct) => pct >= 90 ? 'A+' : pct >= 85 ? 'A' : pct >= 80 ? 'A-' : pct >= 75 ? 'B+' : pct >= 70 ? 'B' : pct >= 65 ? 'B-' : pct >= 60 ? 'C+' : pct >= 55 ? 'C' : pct >= 50 ? 'D' : 'F';
  const gradeColor = (pct) => pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';

  const filteredGrades = selectedCourse ? allGrades.filter(g => g.course?._id === selectedCourse) : allGrades;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left"><h1>My Grades</h1><p>View your academic performance and grade records</p></div>
      </div>

      <div className="grid-2 mb-24">
        {/* Radar Chart */}
        <div className="card">
          <div className="card-header"><span className="card-title">Performance Overview</span></div>
          <div className="card-body">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)"/>
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}/>
                  <Radar name="Score" dataKey="score" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2}/>
                </RadarChart>
              </ResponsiveContainer>
            ) : <div className="empty-state"><p>No grade data yet</p></div>}
          </div>
        </div>

        {/* Course Summaries */}
        <div className="card">
          <div className="card-header"><span className="card-title">Course Grades</span></div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            {summary.map((s, i) => {
              const pct = parseFloat(s.overallPercentage);
              return (
                <div key={i} style={{ padding: '12px 0', borderBottom: i < summary.length - 1 ? '1px solid var(--bg-border)' : 'none', cursor: 'pointer' }}
                  onClick={() => setSelectedCourse(selectedCourse === s.course?._id ? '' : s.course?._id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.course?.courseName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.grades?.length} assessments</div>
                    </div>
                    <div style={{ display: 'flex', align: 'center', gap: 10 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: gradeColor(pct) }}>{letterGrade(pct)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.overallPercentage}%</div>
                      </div>
                    </div>
                  </div>
                  <div className="progress-bar-wrapper">
                    <div className={`progress-bar-fill ${pct >= 70 ? 'success' : pct >= 50 ? 'warning' : 'danger'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {summary.length === 0 && <div className="empty-state"><p>No grades yet</p></div>}
          </div>
        </div>
      </div>

      {/* Detailed Grades Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Detailed Grade Records {selectedCourse && '(Filtered)'}</span>
          {selectedCourse && <button className="btn btn-ghost btn-sm" onClick={() => setSelectedCourse('')}>Clear filter</button>}
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Course</th><th>Exam Type</th><th>Marks</th><th>%</th><th>Grade</th><th>Date</th></tr></thead>
            <tbody>
              {filteredGrades.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><Star size={32}/><p>No grade records</p></div></td></tr>
              ) : filteredGrades.map(g => {
                const pct = ((g.marksObtained / g.totalMarks) * 100).toFixed(1);
                return (
                  <tr key={g._id}>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{g.course?.courseName}</div>
                      <div style={{ fontSize: 11, color: 'var(--primary-400)' }}>{g.course?.courseCode}</div>
                    </td>
                    <td><span className="badge badge-primary">{g.examType}</span></td>
                    <td style={{ fontWeight: 600 }}>{g.marksObtained} / {g.totalMarks}</td>
                    <td style={{ fontWeight: 700, color: gradeColor(parseFloat(pct)) }}>{pct}%</td>
                    <td><span style={{ fontSize: 16, fontWeight: 900, color: gradeColor(parseFloat(pct)) }}>{letterGrade(parseFloat(pct))}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(g.examDate).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
