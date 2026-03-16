import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const useAuthStatus = () => {
  const { user, loading } = useAuth();
  const [tokenExpired, setTokenExpired] = useState(false);

  useEffect(() => {
    // Vérifier périodiquement si le token est proche d'expirer
    const checkTokenExpiry = () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      try {
        // Décoder le token (sans vérification)
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        
        // Vérifier si le token expire dans moins de 5 minutes
        const expiryTime = payload.exp * 1000; // en ms
        const timeUntilExpiry = expiryTime - Date.now();
        
        setTokenExpired(timeUntilExpiry < 5 * 60 * 1000); // moins de 5 min
      } catch (error) {
        console.error('Error checking token expiry:', error);
      }
    };

    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 60000); // vérifier chaque minute

    return () => clearInterval(interval);
  }, []);

  return {
    isAuthenticated: !!user,
    loading,
    tokenExpired,
    user
  };
};