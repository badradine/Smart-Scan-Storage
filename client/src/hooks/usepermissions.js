import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

// Définition des rôles
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  GUEST: 'guest'
};

// Matrice des permissions
export const PERMISSIONS = {
  'documents:view_own': [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
  'documents:view_all': [ROLES.ADMIN, ROLES.MANAGER],
  'documents:create': [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
  'documents:edit_own': [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
  'documents:edit_all': [ROLES.ADMIN, ROLES.MANAGER],
  'documents:delete_own': [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
  'documents:delete_all': [ROLES.ADMIN],
  'users:view': [ROLES.ADMIN, ROLES.MANAGER],
  'users:manage': [ROLES.ADMIN],
  'stats:view': [ROLES.ADMIN, ROLES.MANAGER],
  'admin:access': [ROLES.ADMIN]
};

export const usePermissions = () => {
  const { user } = useAuth();  // ← On récupère l'utilisateur depuis AuthContext
  
  const hasPermission = (permission) => {
    if (!user) return false;
    const allowedRoles = PERMISSIONS[permission];
    return allowedRoles ? allowedRoles.includes(user.role) : false;
  };

  const hasAllPermissions = (permissions) => {
    return permissions.every(permission => hasPermission(permission));
  };

  const hasAnyPermission = (permissions) => {
    return permissions.some(permission => hasPermission(permission));
  };

  const isAdmin = user?.role === ROLES.ADMIN;
  const isManager = user?.role === ROLES.MANAGER;
  const isUser = user?.role === ROLES.USER;

  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isAdmin,
    isManager,
    isUser,
    ROLES,
    PERMISSIONS,
    userRole: user?.role
  };
};

export default usePermissions;