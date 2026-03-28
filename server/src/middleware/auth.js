import jwt from 'jsonwebtoken';
// ✅ Suppression de l'import getDatabase qui cause l'erreur

/**
 * Middleware pour vérifier le token JWT
 * Protège les routes qui nécessitent une authentification
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Accès interdit',
      message: 'Token d\'authentification requis'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || '12345';
    const decoded = jwt.verify(token, secret);
    
    // ✅ Ajouter l'utilisateur décodé à la requête
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expiré',
        message: 'Veuillez vous reconnecter'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token invalide',
        message: 'Token corrompu ou invalide'
      });
    }

    console.error('Erreur d\'authentification:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: 'Impossible de vérifier le token'
    });
  }
}

/**
 * Middleware pour vérifier le rôle de l'utilisateur
 * @param {string[]} allowedRoles - Tableau des rôles autorisés
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Accès interdit',
        message: 'Utilisateur non authentifié'
      });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Accès interdit',
        message: 'Privilèges insuffisants'
      });
    }

    next();
  };
}

/**
 * Génération d'un token JWT
 * @param {object} payload - Données pour le token
 * @returns {string} Token JWT
 */
export function generateToken(payload) {
  const secret = process.env.JWT_SECRET || '12345';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Middleware pour logger les requêtes
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
}

export default {
  authenticateToken,
  requireRole,
  generateToken,
  requestLogger
};