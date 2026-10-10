import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Topbar from './Topbar';
import {
  LayoutDashboard, Users, BookOpen, CreditCard, Brain,
  ClipboardList, Star, Calendar, FileText, GraduationCap,
  Settings, LogOut, ChevronRight
} from 'lucide-react';

const adminNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { label: 'Users', icon: Users, path: '/admin/users' },
  { label: 'Courses', icon: BookOpen, path: '/admin/courses' },
  { label: 'Fee Management', icon: CreditCard, path: '/admin/fees' },
  { label: 'Analytics', icon: Brain, path: '/admin/analytics' }
];

const teacherNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/teacher/dashboard' },
  { label: 'Attendance', icon: Calendar, path: '/teacher/attendance' },
  { label: 'Grades', icon: Star, path: '/teacher/grades' },
  { label: 'Assignments', icon: ClipboardList, path: '/teacher/assignments' }
];

const studentNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard' },
  { label: 'My Attendance', icon: Calendar, path: '/student/attendance' },
  { label: 'My Grades', icon: Star, path: '/student/grades' },
  { label: 'Assignments', icon: ClipboardList, path: '/student/assignments' },
  { label: 'Fee Status', icon: CreditCard, path: '/student/fees' }
];

const navMap = { admin: adminNav, teacher: teacherNav, student: studentNav };

const roleColors = {
  admin: '#a78bfa',
  teacher: '#34d399',
  student: '#60a5fa'
};

const roleLabels = {
  admin: 'Administrator',
  teacher: 'Faculty',
  student: 'Student'
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = navMap[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <GraduationCap size={22} color="white" />
          </div>
          <h1>UniManage</h1>
          <p>University Management System</p>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}

          <div className="nav-section-label" style={{ marginTop: 16 }}>Account</div>
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={16} />
            Profile & Settings
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar" style={{ background: `linear-gradient(135deg, ${roleColors[user?.role] || '#6366f1'}, #312e81)` }}>
              {user?.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : initials}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: roleColors[user?.role] || 'var(--text-secondary)' }}>{roleLabels[user?.role]}</div>
            </div>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm btn-icon" title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <Topbar />
        <div id="main-content" className="page-container animate-fadeIn">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
