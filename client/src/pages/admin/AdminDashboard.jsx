import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, analyticsAPI } from '../../api';
import { Users, BookOpen, CreditCard, Brain, TrendingUp, AlertTriangle, UserPlus, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const CHART_COLORS = ['#6366f1', '#22d3ee', '#10b981', '#f59e0b', '#ef4444'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminAPI.getDashboard(), analyticsAPI.getSystemOverview()])
      .then(([dashRes, analyticsRes]) => {
        setStats(dashRes.data);
        setOverview(analyticsRes.data.overview);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Students', value: stats?.stats?.totalStudents || 0,
      icon: <Users size={20} />, color: '#6366f1',
      bg: 'rgba(99,102,241,0.12)', change: '+12', path: '/admin/users'
    },
    {
      label: 'Active Courses', value: stats?.stats?.totalCourses || 0,
      icon: <BookOpen size={20} />, color: '#10b981',
      bg: 'rgba(16,185,129,0.12)', change: '+3', path: '/admin/courses'
    },
    {
      label: 'Fees Collected', value: `₹${((stats?.stats?.totalFeesPaid || 0) / 1000).toFixed(0)}K`,
      icon: <CreditCard size={20} />, color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)', change: '+8%', path: '/admin/fees'
    },
    {
      label: 'At-Risk Students', value: stats?.atRiskStudents?.length || 0,
      icon: <AlertTriangle size={20} />, color: '#ef4444',
      bg: 'rgba(239,68,68,0.12)', change: 'Need action', path: '/admin/analytics', isAlert: true
    }
  ];

  const gradeDistData = overview?.gradeDistribution
    ? Object.entries(overview.gradeDistribution).map(([grade, count]) => ({ grade, count }))
    : [];

  const enrollmentData = (overview?.enrollmentTrend || []).reverse().map(item => ({
    name: `${item._id.month}/${item._id.year}`,
    students: item.count
  }));

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Admin Dashboard</h1>
          <p>Welcome back! Here's your university overview.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/users')}>
          <UserPlus size={15} /> Add User
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid-4 mb-24">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(card.path)}
          >
            <div className="stat-icon" style={{ background: card.bg, color: card.color }}>
              {card.icon}
            </div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
            <div className={`stat-change ${card.isAlert ? 'down' : 'up'}`}>
              {card.isAlert ? '⚠️' : '↑'} {card.change}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid-2 mb-24">
        {/* Grade Distribution */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Grade Distribution</span>
            <span className="text-secondary text-sm">All time</span>
          </div>
          <div className="card-body">
            {gradeDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={gradeDistData}>
                  <XAxis dataKey="grade" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 8, fontSize: 12 }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {gradeDistData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <p>No grade data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Enrollment Trend */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Enrollment Trend</span>
            <span className="text-secondary text-sm">Last 6 months</span>
          </div>
          <div className="card-body">
            {enrollmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={enrollmentData}>
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="students" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <p>No enrollment data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-2">
        {/* Recent Students */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Students</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/users')}>
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            {(stats?.recentStudents || []).map((student, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < (stats.recentStudents.length - 1) ? '1px solid var(--bg-border)' : 'none' }}>
                <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                  {student.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{student.user?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{student.rollNumber} · Sem {student.semester}</div>
                </div>
                <span className="badge badge-info">{student.department?.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* At-Risk Students */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ color: '#f87171' }}>⚠️ At-Risk Students</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/analytics')}>
              AI Analysis <ChevronRight size={12} />
            </button>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            {(stats?.atRiskStudents || []).length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <p>No at-risk students detected 🎉</p>
              </div>
            ) : (
              (stats?.atRiskStudents || []).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < (stats.atRiskStudents.length - 1) ? '1px solid var(--bg-border)' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={14} color="#ef4444" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.student?.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.student?.rollNumber}</div>
                  </div>
                  <span className="risk-badge risk-high">{s.attendancePercentage}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* System Overview Stats */}
      {overview && (
        <div className="card mt-24">
          <div className="card-header">
            <span className="card-title">System Overview</span>
            <span className="text-secondary text-sm">Real-time statistics</span>
          </div>
          <div className="card-body">
            <div className="grid-4">
              {[
                { label: 'System Attendance Rate', value: `${overview.systemAttendanceRate}%`, color: parseFloat(overview.systemAttendanceRate) >= 80 ? 'var(--success)' : 'var(--warning)' },
                { label: 'Average Grade', value: `${overview.avgGrade}%`, color: parseFloat(overview.avgGrade) >= 70 ? 'var(--success)' : 'var(--danger)' },
                { label: 'Total Grade Records', value: overview.totalGradesRecorded, color: 'var(--primary-400)' },
                { label: 'Pending Fees', value: `₹${((stats?.stats?.totalFeesPending || 0) / 1000).toFixed(0)}K`, color: 'var(--warning)' }
              ].map((item, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
