import axios from 'axios';

// When deploying on Vercel, we will provide the Render backend URL inside Vercel's Environment Variables panel.
// If VITE_API_URL is empty (e.g., when running locally), it falls back to localhost.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_URL,

  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  auth: {
    login: (username: string, password: string) => apiClient.post('/auth/login', { username, password }).then(res => res.data),
    verify2FA: (username: string, code: string) => apiClient.post('/auth/verify', { username, code }).then(res => res.data),
    logout: () => apiClient.post('/auth/logout').then(res => res.data),
    getMe: () => apiClient.get('/auth/me').then(res => res.data),
  },
  data: {
    getCourses: () => apiClient.get('/data/courses').then(res => res.data),
    getOfferings: () => apiClient.get('/data/offerings').then(res => res.data),
    uploadCourses: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post('/data/upload/courses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(res => res.data);
    },
    uploadOfferings: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post('/data/upload/offerings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(res => res.data);
    },
    uploadDoctors: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post('/data/upload/doctors', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(res => res.data);
    },
    resetTable: (table: string) => apiClient.delete(`/data/reset/${table}`).then(res => res.data)
  },
  predict: {
    train: () => apiClient.post('/predict/train').then(res => res.data),
    nextTerm: () => apiClient.get('/predict/next-term').then(res => res.data),
    bulkPredict: (data: { run_name: string, target_year: number, target_semester: string, target_campus: string, new_freshman: number, new_sophomores: number, new_masters: number, use_quotas?: boolean, slots: { csc_core: number, csc_elective: number, bif_core: number, bif_elective: number, mth: number, sta: number } }) => 
      apiClient.post('/predict/bulk', data).then(res => res.data),
    getRuns: (campus?: string) => apiClient.get('/predict/runs', { params: { campus } }).then(res => res.data)
  },
  scheduler: {
    getSchedule: () => apiClient.get('/scheduler/').then(res => res.data),
    createEntry: (entry: any) => apiClient.post('/scheduler/', entry).then(res => res.data),
    deleteEntry: (id: number) => apiClient.delete(`/scheduler/${id}`).then(res => res.data),
    updateEntry: (id: number, data: any) => apiClient.patch(`/scheduler/${id}`, data).then(res => res.data),
    getDoctors: () => apiClient.get('/scheduler/doctors').then(res => res.data),
    createDoctor: (doc: any) => apiClient.post('/scheduler/doctors', doc).then(res => res.data),
  },
  graph: {
    getGraph: () => apiClient.get('/graph/').then(res => res.data)
  },
  dash: {
    getMetrics: () => apiClient.get('/dashboard/metrics').then(res => res.data)
  },
  users: {
    getUsers: () => apiClient.get('/users/').then(res => res.data),
    createUser: (data: any) => apiClient.post('/users/', data).then(res => res.data),
    updateUser: (id: number, data: any) => apiClient.put(`/users/${id}`, data).then(res => res.data),
    deleteUser: (id: number) => apiClient.delete(`/users/${id}`).then(res => res.data),
    updateMe: (data: any) => apiClient.put('/users/me/update', data).then(res => res.data)
  },
  logs: {
    getActionLogs: () => apiClient.get('/logs/actions').then(res => res.data),
    getDataLogs: () => apiClient.get('/logs/data').then(res => res.data)
  }
};
