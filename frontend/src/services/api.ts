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

export const api = {
  auth: {
    login: (username: string, password: string) => apiClient.post('/auth/login', { username, password }).then(res => res.data),
    verify2FA: (username: string, code: string) => apiClient.post('/auth/verify', { username, code }).then(res => res.data),
    logout: () => apiClient.post('/auth/logout').then(res => res.data),
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
    }
  },
  predict: {
    train: () => apiClient.post('/predict/train').then(res => res.data),
    nextTerm: () => apiClient.get('/predict/next-term').then(res => res.data),
    bulkPredict: (data: { run_name: string, target_year: number, target_semester: string, target_campus: string, new_enrollees: number, use_quotas?: boolean, slots: { csc_core: number, csc_elective: number, bif_core: number, bif_elective: number, mth: number, sta: number } }) => 
      apiClient.post('/predict/bulk', data).then(res => res.data),
    getRuns: () => apiClient.get('/predict/runs').then(res => res.data)
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
  }
};
