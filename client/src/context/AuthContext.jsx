import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// Définition des rôles (doit correspondre au backend)
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  GUEST: 'guest'
};

// Matrice des permissions côté client
export const PERMISSIONS = {
  // Permissions pour les documents
  'documents:view_own': [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
  'documents:view_all': [ROLES.ADMIN, ROLES.MANAGER],
  'documents:create': [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
  'documents:edit_own': [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
  'documents:edit_all': [ROLES.ADMIN, ROLES.MANAGER],
  'documents:delete_own': [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
  'documents:delete_all': [ROLES.ADMIN],
  
  // Permissions utilisateurs
  'users:view': [ROLES.ADMIN, ROLES.MANAGER],
  'users:manage': [ROLES.ADMIN],
  
  // Statistiques
  'stats:view': [ROLES.ADMIN, ROLES.MANAGER],
  
  // Administration
  'admin:access': [ROLES.ADMIN]
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissions, setPermissions] = useState([]);

  // Chargement de l'utilisateur au montage
  useEffect(() => {
    checkAuth();
  }, []);

  // Mettre à jour les permissions quand l'utilisateur change
  useEffect(() => {
    if (user) {
      // Calculer les permissions de l'utilisateur
      const userPermissions = [];
      for (const [permission, allowedRoles] of Object.entries(PERMISSIONS)) {
        if (allowedRoles.includes(user.role)) {
          userPermissions.push(permission);
        }
      }
      setPermissions(userPermissions);
      
      // Sauvegarder l'utilisateur dans localStorage pour persistance
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      setPermissions([]);
      localStorage.removeItem('user');
    }
  }, [user]);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (!token) {
      setLoading(false);
      return;
    }

    // Si on a un utilisateur sauvegardé, l'utiliser en attendant la vérification
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.data.user);
      } else {
        // Token invalide, nettoyer
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    } catch (err) {
      console.error('Erreur vérification authentification:', err);
      // En cas d'erreur réseau, garder l'utilisateur sauvegardé
      if (!savedUser) {
        localStorage.removeItem('token');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const { user, token, refreshToken } = response.data.data;
        
        // Sauvegarder les tokens
        localStorage.setItem('token', token);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        
        setUser(user);
        return { success: true, data: user };
      } else {
        setError(response.data.message);
        return { success: false, error: response.data.message };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur de connexion';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const register = useCallback(async (email, password, name) => {
    try {
      setError(null);
      const response = await api.post('/auth/register', { email, password, name });
      
      if (response.data.success) {
        const { user, token, refreshToken } = response.data.data;
        
        localStorage.setItem('token', token);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        
        setUser(user);
        return { success: true, data: user };
      } else {
        setError(response.data.message);
        return { success: false, error: response.data.message };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur d\'inscription';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Appeler l'API de déconnexion si elle existe
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Erreur déconnexion:', err);
    } finally {
      // Nettoyer le stockage local
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      setPermissions([]);
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    try {
      const response = await api.put('/auth/profile', data);
      if (response.data.success) {
        setUser(response.data.data.user);
        return { success: true, data: response.data.data.user };
      }
      return { success: false, error: response.data.message };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Erreur de mise à jour' };
    }
  }, []);

  // Vérifier si l'utilisateur a une permission spécifique
  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    const allowedRoles = PERMISSIONS[permission];
    return allowedRoles ? allowedRoles.includes(user.role) : false;
  }, [user]);

  // Vérifier si l'utilisateur a un rôle spécifique
  const hasRole = useCallback((role) => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  }, [user]);

  // Vérifier si l'utilisateur est admin
  const isAdmin = useCallback(() => {
    return user?.role === ROLES.ADMIN;
  }, [user]);

  // Vérifier si l'utilisateur est manager
  const isManager = useCallback(() => {
    return user?.role === ROLES.MANAGER;
  }, [user]);

  // Rafraîchir le token
  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await api.post('/auth/refresh', { refreshToken });
      if (response.data.success) {
        const { token } = response.data.data;
        localStorage.setItem('token', token);
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error('Erreur rafraîchissement token:', err);
      // Si le refresh échoue, déconnecter l'utilisateur
      logout();
      return { success: false };
    }
  }, [logout]);

  const value = {
    // États
    user,
    loading,
    error,
    permissions,
    
    // Authentification
    login,
    register,
    logout,
    updateProfile,
    refreshToken,
    
    // État
    isAuthenticated: !!user,
    isAdmin: isAdmin(),
    isManager: isManager(),
    
    // Permissions
    hasPermission,
    hasRole,
    
    // Rôles (pour référence)
    ROLES,
    
    // Informations utilisateur
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.name,
    userRole: user?.role
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;