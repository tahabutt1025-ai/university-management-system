import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('ums_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ums_token');
      localStorage.removeItem('ums_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ───
export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
  getMe: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/updateprofile', data),
  updatePassword: (data) => API.put('/auth/updatepassword', data)
};

// ─── Students ───
export const studentsAPI = {
  getAll: (params) => API.get('/students', { params }),
  getMe: () => API.get('/students/me'),
  getById: (id) => API.get(`/students/${id}`),
  update: (id, data) => API.put(`/students/${id}`, data),
  getAttendanceSummary: (id, params) => API.get(`/students/${id}/attendance-summary`, { params }),
  getGradesSummary: (id) => API.get(`/students/${id}/grades-summary`)
};

// ─── Teachers ───
export const teachersAPI = {
  getAll: (params) => API.get('/teachers', { params }),
  getMe: () => API.get('/teachers/me'),
  getById: (id) => API.get(`/teachers/${id}`),
  update: (id, data) => API.put(`/teachers/${id}`, data),
  getClassOverview: (id) => API.get(`/teachers/${id}/class-overview`)
};

// ─── Admin ───
export const adminAPI = {
  getDashboard: () => API.get('/admin/dashboard'),
  getUsers: (params) => API.get('/admin/users', { params }),
  createUser: (data) => API.post('/admin/users', data),
  updateUser: (id, data) => API.put(`/admin/users/${id}`, data),
  deleteUser: (id) => API.delete(`/admin/users/${id}`),
  getDeptReport: () => API.get('/admin/reports/department'),
  getFeeReport: () => API.get('/admin/reports/fees')
};

// ─── Courses ───
export const coursesAPI = {
  getAll: (params) => API.get('/courses', { params }),
  getById: (id) => API.get(`/courses/${id}`),
  create: (data) => API.post('/courses', data),
  update: (id, data) => API.put(`/courses/${id}`, data),
  delete: (id) => API.delete(`/courses/${id}`),
  enroll: (id, studentId) => API.post(`/courses/${id}/enroll`, { studentId }),
  unenroll: (id, studentId) => API.delete(`/courses/${id}/enroll/${studentId}`)
};

// ─── Attendance ───
export const attendanceAPI = {
  mark: (data) => API.post('/attendance', data),
  getAll: (params) => API.get('/attendance', { params }),
  getByDate: (courseId, date) => API.get(`/attendance/course/${courseId}/date/${date}`),
  update: (id, data) => API.put(`/attendance/${id}`, data)
};

// ─── Grades ───
export const gradesAPI = {
  add: (data) => API.post('/grades', data),
  addBulk: (grades) => API.post('/grades/bulk', { grades }),
  getAll: (params) => API.get('/grades', { params }),
  update: (id, data) => API.put(`/grades/${id}`, data),
  delete: (id) => API.delete(`/grades/${id}`),
  getCourseStats: (courseId, params) => API.get(`/grades/course/${courseId}/stats`, { params })
};

// ─── Assignments ───
export const assignmentsAPI = {
  create: (data) => API.post('/assignments', data),
  getAll: (params) => API.get('/assignments', { params }),
  getById: (id) => API.get(`/assignments/${id}`),
  submit: (id, data) => API.post(`/assignments/${id}/submit`, data),
  grade: (id, studentId, data) => API.put(`/assignments/${id}/grade/${studentId}`, data),
  delete: (id) => API.delete(`/assignments/${id}`)
};

// ─── Fees ───
export const feesAPI = {
  create: (data) => API.post('/fees', data),
  createBulk: (data) => API.post('/fees/bulk', data),
  getAll: (params) => API.get('/fees', { params }),
  pay: (id, data) => API.put(`/fees/${id}/pay`, data),
  update: (id, data) => API.put(`/fees/${id}`, data),
  delete: (id) => API.delete(`/fees/${id}`),
  getStudentSummary: (studentId) => API.get(`/fees/student/${studentId}/summary`)
};

// ─── Analytics ───
export const analyticsAPI = {
  getStudentAnalytics: (studentId) => API.get(`/analytics/student/${studentId}`),
  getAtRisk: (params) => API.get('/analytics/at-risk', { params }),
  getSystemOverview: () => API.get('/analytics/system-overview'),
  sendAlerts: () => API.post('/analytics/send-alerts')
};

// ─── Notifications ───
export const notificationsAPI = {
  getAll: (params) => API.get('/notifications', { params }),
  markRead: (id) => API.put(`/notifications/${id}/read`),
  markAllRead: () => API.put('/notifications/read-all'),
  delete: (id) => API.delete(`/notifications/${id}`)
};

export default API;
