// permissions.js - Gestion des rôles et permissions

// Définition des rôles
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  GUEST: 'guest'
};

// Matrice des permissions (qui peut faire quoi)
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

// Vérifier si un utilisateur a une permission
export const hasPermission = (user, permission) => {
  if (!user) return false;
  
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  
  return allowedRoles.includes(user.role);
};

// Middleware pour vérifier une permission
export const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Non authentifié',
        message: 'Vous devez être connecté pour accéder à cette ressource'
      });
    }
    
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ 
        success: false,
        error: 'Accès interdit',
        message: 'Vous n\'avez pas les droits pour effectuer cette action'
      });
    }
    
    next();
  };
};

// Middleware pour vérifier la propriété d'un document
export const checkDocumentOwnership = async (req, res, next) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Les admins peuvent tout modifier
    if (userRole === ROLES.ADMIN) {
      return next();
    }
    
    // Les managers peuvent modifier tous les documents
    if (userRole === ROLES.MANAGER) {
      return next();
    }
    
    // Pour les users, vérifier que le document leur appartient
    const { getDatabase } = await import('../config/database.js');
    const db = getDatabase();
    
    const document = db.prepare(`
      SELECT user_id FROM documents WHERE id = ?
    `).get(documentId);
    
    if (!document) {
      return res.status(404).json({ 
        success: false,
        error: 'Non trouvé',
        message: 'Document non trouvé'
      });
    }
    
    if (document.user_id !== userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Accès interdit',
        message: 'Vous ne pouvez modifier que vos propres documents'
      });
    }
    
    next();
  } catch (error) {
    console.error('Erreur checkDocumentOwnership:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur',
      message: 'Impossible de vérifier les droits sur ce document'
    });
  }
};

// Middleware pour vérifier le rôle (version simple)
export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Non authentifié'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        error: 'Rôle insuffisant',
        message: `Ce rôle (${req.user.role}) n'est pas autorisé. Rôles requis: ${allowedRoles.join(', ')}`
      });
    }
    
    next();
  };
};

export default {
  ROLES,
  PERMISSIONS,
  hasPermission,
  checkPermission,
  checkDocumentOwnership,
  checkRole
};