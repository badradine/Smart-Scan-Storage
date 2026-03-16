import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Variable pour éviter les boucles infinies de refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Intercepteur pour AJOUTER le token à CHAQUE requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    console.log('🔑 Token envoyé:', token ? 'Présent' : 'Absent');
    
    // Ne pas ajouter de token pour les requêtes de refresh
    if (config.url.includes('/auth/refresh')) {
      return config;
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs 401 (token expiré)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Ignorer si c'est une requête de refresh (pour éviter les boucles)
    if (originalRequest.url.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // Si erreur 401 ou 403 ET pas déjà tenté de refresh
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      console.log('🔄 Token expiré, tentative de refresh...');

      if (isRefreshing) {
        console.log('⏳ Refresh en cours, mise en file d\'attente...');
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        console.log('📦 Refresh token:', refreshToken ? 'Présent' : 'Absent');
        
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Tenter de rafraîchir le token
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken
        });

        console.log('✅ Refresh réussi!', response.data);

        const { accessToken, user } = response.data.data;

        // Sauvegarder le nouveau token
        localStorage.setItem('accessToken', accessToken);
        
        // Mettre à jour le user si nécessaire
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }

        // Traiter la queue
        processQueue(null, accessToken);

        // Retenter la requête originale avec le nouveau token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('❌ Refresh échoué:', refreshError);
        processQueue(refreshError, null);
        
        // Si refresh échoue, déconnecter l'utilisateur
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // Rediriger vers login (si pas déjà sur login)
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// API pour les documents
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

// API pour la recherche
export const searchApi = {
  search: (params) => api.get('/search', { params })
};

// API pour l'administration
export const adminApi = {
  getUsers: () => api.get('/admin/users'),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  createUser: (userData) => api.post('/admin/users', userData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getStats: () => api.get('/admin/stats')
};

// API pour l'authentification
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  logoutAll: () => api.post('/auth/logout-all'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getMe: () => api.get('/auth/me')
};

export default api;