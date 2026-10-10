import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_TITLES = {
  '/login':               'Login — UniManage',
  '/admin/dashboard':     'Admin Dashboard — UniManage',
  '/admin/users':         'User Management — UniManage',
  '/admin/courses':       'Course Management — UniManage',
  '/admin/fees':          'Fee Management — UniManage',
  '/admin/analytics':     'Analytics — UniManage',
  '/teacher/dashboard':   'Teacher Dashboard — UniManage',
  '/teacher/attendance':  'Mark Attendance — UniManage',
  '/teacher/grades':      'Grades Management — UniManage',
  '/teacher/assignments': 'Assignments — UniManage',
  '/student/dashboard':   'My Dashboard — UniManage',
  '/student/attendance':  'My Attendance — UniManage',
  '/student/grades':      'My Grades — UniManage',
  '/student/assignments': 'My Assignments — UniManage',
  '/student/fees':        'Fee Status — UniManage',
  '/profile':             'Profile & Settings — UniManage',
  '/notifications':       'Notifications — UniManage',
};

/**
 * Sets the document <title> based on the current route.
 * Call this once at the App level.
 */
export function usePageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const title = ROUTE_TITLES[pathname] ?? 'UniManage — University Management System';
    document.title = title;
  }, [pathname]);
}
