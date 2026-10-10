import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../api';

const pageNames = {
  '/admin/dashboard': { title: 'Dashboard', sub: 'Overview of your university' },
  '/admin/users': { title: 'User Management', sub: 'Manage students, teachers, and admins' },
  '/admin/courses': { title: 'Course Management', sub: 'Manage academic courses & schedules' },
  '/admin/fees': { title: 'Fee Management', sub: 'Track payments and fee records' },
  '/admin/analytics': { title: 'Analytics', sub: 'Student performance insights & at-risk detection' },
  '/teacher/dashboard': { title: 'Dashboard', sub: 'Your teaching overview' },
  '/teacher/attendance': { title: 'Mark Attendance', sub: 'Record daily class attendance' },
  '/teacher/grades': { title: 'Grades Management', sub: 'Upload and manage student grades' },
  '/teacher/assignments': { title: 'Assignments', sub: 'Create and manage assignments' },
  '/student/dashboard': { title: 'My Dashboard', sub: 'Your academic overview' },
  '/student/attendance': { title: 'My Attendance', sub: 'Track your class attendance' },
  '/student/grades': { title: 'My Grades', sub: 'View your academic performance' },
  '/student/assignments': { title: 'My Assignments', sub: 'Manage your assignments' },
  '/student/fees': { title: 'Fee Status', sub: 'View your fee payment status' },
  '/profile': { title: 'Profile', sub: 'Manage your account settings' },
  '/notifications': { title: 'Notifications', sub: 'Your alerts and messages' }
};

export default function Topbar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const pageInfo = pageNames[location.pathname] || { title: 'UniManage', sub: '' };

  useEffect(() => {
    notificationsAPI.getAll({ limit: 1 })
      .then(res => setUnreadCount(res.data.unreadCount || 0))
      .catch(() => {});
  }, [location.pathname]);

  return (
    <div className="topbar">
      <div className="topbar-left">
        <h2>{pageInfo.title}</h2>
        {pageInfo.sub && <p>{pageInfo.sub}</p>}
      </div>
      <div className="topbar-right">
        <button
          className="notif-btn"
          onClick={() => navigate('/notifications')}
          title="Notifications"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="notif-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', background: 'var(--bg-hover)',
          borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-border)',
          cursor: 'pointer'
        }} onClick={() => navigate('/profile')}>
          <div className="user-avatar" style={{ width: 26, height: 26, fontSize: 11 }}>
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {user?.name?.split(' ')[0]}
          </span>
        </div>
      </div>
    </div>
  );
}
