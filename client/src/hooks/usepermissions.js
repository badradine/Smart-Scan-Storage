import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

// Définition des rôles (doit correspondre au backend)
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  GUEST: 'guest'
};

// Matrice des permissions (doit correspondre au backend)
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

/**
 * Hook personnalisé pour gérer les permissions utilisateur
 * @returns {Object} - Fonctions et états liés aux permissions
 */
export const usePermissions = () => {
  const { user, hasPermission: contextHasPermission } = useAuth();

  // Vérifier si l'utilisateur a une permission spécifique
  const hasPermission = (permission) => {
    return contextHasPermission(permission);
  };

  // Vérifier si l'utilisateur a toutes les permissions spécifiées
  const hasAllPermissions = (permissions) => {
    return permissions.every(permission => hasPermission(permission));
  };

  // Vérifier si l'utilisateur a au moins une des permissions spécifiées
  const hasAnyPermission = (permissions) => {
    return permissions.some(permission => hasPermission(permission));
  };

  // Vérifier si l'utilisateur peut modifier un document spécifique
  const canEditDocument = (document) => {
    if (!user || !document) return false;
    
    // Admin peut tout modifier
    if (user.role === ROLES.ADMIN) return true;
    
    // Manager peut modifier tous les documents
    if (user.role === ROLES.MANAGER) return true;
    
    // User ne peut modifier que ses propres documents
    return document.user_id === user.id && hasPermission('documents:edit_own');
  };

  // Vérifier si l'utilisateur peut supprimer un document spécifique
  const canDeleteDocument = (document) => {
    if (!user || !document) return false;
    
    // Admin peut tout supprimer
    if (user.role === ROLES.ADMIN) return true;
    
    // Manager ne peut pas supprimer (selon matrice)
    if (user.role === ROLES.MANAGER) return false;
    
    // User ne peut supprimer que ses propres documents
    return document.user_id === user.id && hasPermission('documents:delete_own');
  };

  // Vérifier si l'utilisateur peut voir tous les documents
  const canViewAllDocuments = () => {
    return hasPermission('documents:view_all');
  };

  // Obtenir les actions disponibles pour un document
  const getDocumentActions = (document) => {
    return {
      canView: true, // Tout le monde peut voir (si déjà authentifié)
      canEdit: canEditDocument(document),
      canDelete: canDeleteDocument(document),
      canDownload: true, // Tout le monde peut télécharger
      canShare: user?.role === ROLES.ADMIN || user?.role === ROLES.MANAGER
    };
  };

  // Filtrer une liste de documents selon les permissions
  const filterDocumentsByPermission = (documents) => {
    if (!documents) return [];
    
    // Admin et Manager voient tout
    if (user?.role === ROLES.ADMIN || user?.role === ROLES.MANAGER) {
      return documents;
    }
    
    // User ne voit que ses documents
    return documents.filter(doc => doc.user_id === user?.id);
  };

  // Vérifier si l'utilisateur peut accéder à une route spécifique
  const canAccessRoute = (route) => {
    const routePermissions = {
      '/admin': 'admin:access',
      '/admin/users': 'users:manage',
      '/stats': 'stats:view',
      '/documents/all': 'documents:view_all'
    };

    const requiredPermission = routePermissions[route];
    if (!requiredPermission) return true; // Route publique
    
    return hasPermission(requiredPermission);
  };

  // Obtenir le niveau d'accès de l'utilisateur (pour UI)
  const accessLevel = useMemo(() => {
    if (!user) return 'guest';
    return user.role;
  }, [user]);

  // Vérifier si l'utilisateur est admin
  const isAdmin = user?.role === ROLES.ADMIN;

  // Vérifier si l'utilisateur est manager
  const isManager = user?.role === ROLES.MANAGER;

  // Vérifier si l'utilisateur est un utilisateur standard
  const isUser = user?.role === ROLES.USER;

  return {
    // Fonctions principales
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    
    // Fonctions spécifiques aux documents
    canEditDocument,
    canDeleteDocument,
    canViewAllDocuments,
    getDocumentActions,
    filterDocumentsByPermission,
    
    // Routes
    canAccessRoute,
    
    // États
    accessLevel,
    isAdmin,
    isManager,
    isUser,
    
    // Constantes
    ROLES,
    PERMISSIONS
  };
};

// Hook pour les composants qui ont besoin de permissions spécifiques
export const useDocumentPermissions = (document) => {
  const permissions = usePermissions();
  
  return {
    ...permissions.getDocumentActions(document),
    isOwner: document?.user_id === permissions.user?.id
  };
};

// Hook pour vérifier les permissions de la page actuelle
export const usePagePermissions = (requiredPermissions = []) => {
  const { hasAllPermissions, hasAnyPermission, accessLevel } = usePermissions();
  
  return {
    canAccess: requiredPermissions.length > 0 
      ? hasAllPermissions(requiredPermissions)
      : true,
    accessLevel,
    requiredPermissions
  };
};

export default usePermissions;