import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

// Layout
import AppLayout from './components/layout/AppLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCourses from './pages/admin/AdminCourses';
import AdminFees from './pages/admin/AdminFees';
import AdminAnalytics from './pages/admin/AdminAnalytics';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherGrades from './pages/teacher/TeacherGrades';
import TeacherAssignments from './pages/teacher/TeacherAssignments';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentGrades from './pages/student/StudentGrades';
import StudentFees from './pages/student/StudentFees';
import StudentAssignments from './pages/student/StudentAssignments';

// Shared Pages
import ProfilePage from './pages/shared/ProfilePage';
import NotificationsPage from './pages/shared/NotificationsPage';
import NotFoundPage from './pages/shared/NotFoundPage';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-overlay" style={{ minHeight: '100vh' }}>
        <div className="loading-spinner" />
        <p>Loading UMS...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }
  return children;
};

const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}/dashboard`} replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* App Layout wrapper */}
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        {/* Admin Routes */}
        <Route path="admin/dashboard" element={<PrivateRoute allowedRoles={['admin']}><AdminDashboard /></PrivateRoute>} />
        <Route path="admin/users" element={<PrivateRoute allowedRoles={['admin']}><AdminUsers /></PrivateRoute>} />
        <Route path="admin/courses" element={<PrivateRoute allowedRoles={['admin']}><AdminCourses /></PrivateRoute>} />
        <Route path="admin/fees" element={<PrivateRoute allowedRoles={['admin']}><AdminFees /></PrivateRoute>} />
        <Route path="admin/analytics" element={<PrivateRoute allowedRoles={['admin']}><AdminAnalytics /></PrivateRoute>} />

        {/* Teacher Routes */}
        <Route path="teacher/dashboard" element={<PrivateRoute allowedRoles={['teacher']}><TeacherDashboard /></PrivateRoute>} />
        <Route path="teacher/attendance" element={<PrivateRoute allowedRoles={['teacher']}><TeacherAttendance /></PrivateRoute>} />
        <Route path="teacher/grades" element={<PrivateRoute allowedRoles={['teacher']}><TeacherGrades /></PrivateRoute>} />
        <Route path="teacher/assignments" element={<PrivateRoute allowedRoles={['teacher']}><TeacherAssignments /></PrivateRoute>} />

        {/* Student Routes */}
        <Route path="student/dashboard" element={<PrivateRoute allowedRoles={['student']}><StudentDashboard /></PrivateRoute>} />
        <Route path="student/attendance" element={<PrivateRoute allowedRoles={['student']}><StudentAttendance /></PrivateRoute>} />
        <Route path="student/grades" element={<PrivateRoute allowedRoles={['student']}><StudentGrades /></PrivateRoute>} />
        <Route path="student/fees" element={<PrivateRoute allowedRoles={['student']}><StudentFees /></PrivateRoute>} />
        <Route path="student/assignments" element={<PrivateRoute allowedRoles={['student']}><StudentAssignments /></PrivateRoute>} />

        {/* Shared Routes */}
        <Route path="profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--bg-border)',
              borderRadius: '10px',
              fontSize: '13px'
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
