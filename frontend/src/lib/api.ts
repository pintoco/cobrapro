import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = Cookies.get('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (r?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = Cookies.get('refreshToken');
      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRT } = res.data.data;
        Cookies.set('accessToken', accessToken, { expires: 1 / 24 });
        Cookies.set('refreshToken', newRT, { expires: 7 });
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:   (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout:  () => api.post('/auth/logout'),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  profile: () => api.get('/auth/profile'),
};

// ── Clients ───────────────────────────────────────────────────────────────────
export const clientsApi = {
  getAll:       (params?: Record<string, any>) => api.get('/clients', { params }),
  getById:      (id: string) => api.get(`/clients/${id}`),
  create:       (data: any) => api.post('/clients', data),
  update:       (id: string, data: any) => api.patch(`/clients/${id}`, data),
  remove:       (id: string) => api.delete(`/clients/${id}`),
  changeStatus: (id: string, status: string) => api.patch(`/clients/${id}/status`, { status }),
  getStats:     () => api.get('/clients/stats'),
};

// ── Invoices ──────────────────────────────────────────────────────────────────
export const invoicesApi = {
  getAll:       (params?: Record<string, any>) => api.get('/invoices', { params }),
  getById:      (id: string) => api.get(`/invoices/${id}`),
  create:       (data: any) => api.post('/invoices', data),
  update:       (id: string, data: any) => api.patch(`/invoices/${id}`, data),
  changeStatus: (id: string, status: string) => api.patch(`/invoices/${id}/status`, { status }),
  cancel:       (id: string) => api.patch(`/invoices/${id}/cancel`),
  getStats:     () => api.get('/invoices/stats'),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsApi = {
  getAll:  (params?: Record<string, any>) => api.get('/payments', { params }),
  getById: (id: string) => api.get(`/payments/${id}`),
  create:  (data: any) => api.post('/payments', data),
  void:    (id: string, data: any) => api.patch(`/payments/${id}/void`, data),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsApi = {
  getAll:  (params?: Record<string, any>) => api.get('/notifications', { params }),
  getStats: () => api.get('/notifications/stats'),
  triggerReminders: () => api.post('/notifications/trigger/reminders'),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getSummary:          () => api.get('/dashboard/summary'),
  getOverdueInvoices:  (limit = 10) => api.get('/dashboard/overdue-invoices', { params: { limit } }),
  getUpcomingInvoices: (days = 7, limit = 10) => api.get('/dashboard/upcoming-invoices', { params: { days, limit } }),
  getDelinquentClients:(limit = 10) => api.get('/dashboard/delinquent-clients', { params: { limit } }),
  getMonthlyCollections:(months = 12) => api.get('/dashboard/monthly-collections', { params: { months } }),
};
