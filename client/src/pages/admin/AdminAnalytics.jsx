import { useState, useEffect } from 'react';
import { analyticsAPI } from '../../api';
import { Brain, AlertTriangle, TrendingDown, CheckCircle, Loader, RefreshCw, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export default function AdminAnalytics() {
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [systemOverview, setSystemOverview] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAnalytics, setStudentAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingStudentAnalytics, setLoadingStudentAnalytics] = useState(false);
  const [sendingAlerts, setSendingAlerts] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [atRiskRes, overviewRes] = await Promise.all([
        analyticsAPI.getAtRisk({ threshold: 75 }),
        analyticsAPI.getSystemOverview()
      ]);
      setAtRiskStudents(atRiskRes.data.atRiskStudents);
      setSystemOverview(overviewRes.data.overview);
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const fetchStudentAnalytics = async (studentId) => {
    setLoadingStudentAnalytics(true);
    setSelectedStudent(studentId);
    try {
      const res = await analyticsAPI.getStudentAnalytics(studentId);
      setStudentAnalytics(res.data.analytics);
    } catch (err) {
      toast.error('Failed to load student analytics');
    } finally {
      setLoadingStudentAnalytics(false);
    }
  };

  const handleSendAlerts = async () => {
    setSendingAlerts(true);
    try {
      const res = await analyticsAPI.sendAlerts();
      toast.success(`✅ ${res.data.message}`);
    } catch (err) {
      toast.error('Failed to send alerts');
    } finally {
      setSendingAlerts(false);
    }
  };

  const severityColor = { high: '#ef4444', critical: '#dc2626', medium: '#f59e0b', positive: '#10b981', low: '#3b82f6' };

  const radarData = systemOverview ? [
    { subject: 'Attendance', value: parseFloat(systemOverview.systemAttendanceRate) },
    { subject: 'Avg Grade', value: parseFloat(systemOverview.avgGrade) },
    { subject: 'At-Risk', value: 100 - (atRiskStudents.length / Math.max(1, systemOverview.totalStudents)) * 100 },
    { subject: 'Fee Rate', value: 70 },
    { subject: 'Enrollment', value: 85 }
  ] : [];

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Brain size={28} color="var(--primary-400)" /> Analytics
          </h1>
          <p>Student performance insights &amp; at-risk detection (rules-based)</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={fetchData}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={handleSendAlerts} disabled={sendingAlerts}>
            {sendingAlerts ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={14} />}
            {sendingAlerts ? 'Sending...' : 'Send Alerts'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner" /><p>Running AI analysis...</p></div>
      ) : (
        <>
          {/* System Health Radar + Stats */}
          <div className="grid-2 mb-24" style={{ gridTemplateColumns: '1fr 2fr' }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">System Health</span>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-surface)', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{systemOverview?.systemAttendanceRate}%</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Avg Attendance</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-surface)', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-400)' }}>{systemOverview?.avgGrade}%</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Avg Grade</div>
                  </div>
                </div>
              </div>
            </div>

            {/* At-Risk Students List */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">⚠️ At-Risk Students ({atRiskStudents.length})</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Click to view AI analysis</span>
              </div>
              <div className="card-body" style={{ paddingTop: 12 }}>
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {atRiskStudents.length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px 0' }}>
                      <CheckCircle size={32} color="var(--success)" />
                      <p style={{ marginTop: 8 }}>No at-risk students detected! 🎉</p>
                    </div>
                  ) : atRiskStudents.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                        borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                        background: selectedStudent === s.student.id ? 'rgba(99,102,241,0.1)' : 'var(--bg-surface)',
                        border: `1px solid ${selectedStudent === s.student.id ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                        transition: 'all 0.2s'
                      }}
                      onClick={() => fetchStudentAnalytics(s.student.id)}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <AlertTriangle size={16} color="#ef4444" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{s.student.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {s.student.rollNumber} · {s.student.department}
                        </div>
                        <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {s.riskFactors.map((f, j) => (
                            <span key={j} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(239,68,68,0.1)', color: '#f87171', borderRadius: 4 }}>
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: parseFloat(s.attendanceRate) < 60 ? '#ef4444' : '#f59e0b' }}>
                          {s.attendanceRate}%
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center' }}>attendance</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Student Analytics Deep Dive */}
          {(loadingStudentAnalytics || studentAnalytics) && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  🔍 Deep Analysis: {studentAnalytics?.student?.name || 'Loading...'}
                </span>
                {studentAnalytics && (
                  <span className={`risk-badge ${studentAnalytics.riskLevel === 'high' ? 'risk-high' : studentAnalytics.riskLevel === 'medium' ? 'risk-medium' : 'risk-low'}`}>
                    {studentAnalytics.riskLevel?.toUpperCase()} RISK
                  </span>
                )}
              </div>
              <div className="card-body">
                {loadingStudentAnalytics ? (
                  <div className="loading-overlay" style={{ minHeight: 150 }}>
                    <div className="loading-spinner" />
                    <p>Analyzing patterns...</p>
                  </div>
                ) : studentAnalytics ? (
                  <div>
                    {/* AI Insight */}
                    {studentAnalytics.aiInsight && (
                      <div style={{
                        padding: '16px 20px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(6,182,212,0.08))',
                        border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, marginBottom: 20
                      }}>
                        <div style={{ fontSize: 11, color: 'var(--primary-400)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          📊 Insight <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>(rules-based calculation)</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                          {studentAnalytics.aiInsight}
                        </p>
                      </div>
                    )}

                    <div className="grid-2">
                      {/* Attendance Alerts */}
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          📅 Attendance Analysis ({studentAnalytics.attendance?.overallRate}% overall)
                        </h4>
                        {(studentAnalytics.attendance?.alerts || []).length === 0 ? (
                          <div style={{ padding: 16, background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', fontSize: 13, color: 'var(--success)' }}>
                            ✅ No attendance concerns detected
                          </div>
                        ) : (studentAnalytics.attendance?.alerts || []).map((alert, i) => (
                          <div key={i} className={`alert-item severity-${alert.severity}`}>
                            <div style={{ fontSize: 18, flexShrink: 0 }}>
                              {alert.severity === 'positive' ? '✅' : alert.severity === 'critical' ? '🚨' : '⚠️'}
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3, color: severityColor[alert.severity] }}>
                                {alert.type.replace(/_/g, ' ').toUpperCase()}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>{alert.message}</div>
                              {alert.recommendation && (
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                                  💡 {alert.recommendation}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Grade Alerts */}
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          📊 Grade Analysis ({studentAnalytics.grades?.overallAverage}% avg)
                        </h4>
                        {(studentAnalytics.grades?.alerts || []).length === 0 ? (
                          <div style={{ padding: 16, background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', fontSize: 13, color: 'var(--success)' }}>
                            ✅ No grade concerns detected
                          </div>
                        ) : (studentAnalytics.grades?.alerts || []).map((alert, i) => (
                          <div key={i} className={`alert-item severity-${alert.severity}`}>
                            <div style={{ fontSize: 18, flexShrink: 0 }}>
                              {alert.severity === 'positive' ? '🌟' : alert.severity === 'critical' ? '🚨' : '⚠️'}
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3, color: severityColor[alert.severity] }}>
                                {alert.type.replace(/_/g, ' ').toUpperCase()}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>{alert.message}</div>
                              {alert.recommendation && (
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                                  💡 {alert.recommendation}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Course breakdown */}
                        {(studentAnalytics.grades?.courseBreakdown || []).length > 0 && (
                          <div style={{ marginTop: 16 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>Course Breakdown</div>
                            {studentAnalytics.grades.courseBreakdown.map((c, i) => (
                              <div key={i} style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>{c.course}</span>
                                  <span style={{ fontWeight: 700, color: parseFloat(c.average) >= 70 ? 'var(--success)' : parseFloat(c.average) >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                                    {c.average}%
                                  </span>
                                </div>
                                <div className="progress-bar-wrapper">
                                  <div
                                    className={`progress-bar-fill ${parseFloat(c.average) >= 70 ? 'success' : parseFloat(c.average) >= 50 ? 'warning' : 'danger'}`}
                                    style={{ width: `${c.average}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
