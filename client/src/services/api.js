import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur requête - AJOUTE LE TOKEN
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    console.log('🔑 [API] Intercepteur - Token dans localStorage:', token ? 'Présent' : 'Absent');
    
    // Ne pas ajouter de token pour les requêtes de refresh
    if (config.url.includes('/auth/refresh')) {
      console.log('🔄 [API] Requête refresh - pas de token');
      return config;
    }
    
    // ✅ Vérification stricte du token
    if (token && token !== 'null' && token !== 'undefined' && token !== '') {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ [API] Token AJOUTÉ à:', config.method, config.url);
    } else {
      console.log('⚠️ [API] PAS de token valide pour:', config.method, config.url);
      // Supprimer le header Authorization s'il existe
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur réponse - SANS REDIRECTION AUTOMATIQUE
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('❌ [API] 401 Non autorisé - URL:', error.config?.url);
    }
    return Promise.reject(error);
  }
);

// API exports
export const documentsApi = {
  getAll: (params) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  create: (formData) => api.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  updatePage: (documentId, pageId, data) => 
    api.put(`/documents/${documentId}/pages/${pageId}`, data)
};

export const searchApi = {
  search: (params) => api.get('/search', { params })
};

export const adminApi = {
  getUsers: () => api.get('/admin/users'),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  createUser: (userData) => api.post('/admin/users', userData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getStats: () => api.get('/admin/stats')
};

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  logoutAll: () => api.post('/auth/logout-all'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getMe: () => api.get('/auth/me')
};

export default api;