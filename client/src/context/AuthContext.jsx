import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');
    
    console.log('🔍 [Auth] checkAuth - token:', !!token);
    console.log('🔍 [Auth] checkAuth - savedUser:', !!savedUser);
    
    if (!token) {
      console.log('🔍 [Auth] Pas de token, utilisateur non connecté');
      setLoading(false);
      return;
    }

    // Utiliser l'utilisateur sauvegardé immédiatement
    if (savedUser) {
      try {
        const userObj = JSON.parse(savedUser);
        console.log('🔍 [Auth] Utilisateur sauvegardé trouvé:', userObj.email);
        setUser(userObj);
      } catch (e) {
        console.error('Erreur parsing savedUser:', e);
      }
    }

    // Vérifier avec l'API en arrière-plan
    try {
      console.log('🔍 [Auth] Vérification du token avec /auth/me');
      const response = await api.get('/auth/me');
      if (response.data.success) {
        console.log('🔍 [Auth] Token valide, utilisateur:', response.data.data.user.email);
        setUser(response.data.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      } else {
        console.log('🔍 [Auth] Token invalide');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
      }
    } catch (err) {
      console.log('🔍 [Auth] Erreur /auth/me:', err.response?.status);
      // Si l'API échoue mais qu'on a un utilisateur sauvegardé, on le garde
      if (!savedUser) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const { user, accessToken, refreshToken } = response.data.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        
        setUser(user);
        console.log('🔍 [Auth] Login réussi, utilisateur:', user.email);
        return { success: true };
      }
      return { success: false, error: response.data.error };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.error || 'Erreur de connexion' 
      };
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    console.log('🔍 [Auth] Déconnexion');
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await api.post('/auth/logout-all');
      await logout();
    } catch (err) {
      console.error('Logout all error:', err);
    }
  }, [logout]);

  const value = {
    user,
    loading,
    login,
    logout,
    logoutAll,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager'
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
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
