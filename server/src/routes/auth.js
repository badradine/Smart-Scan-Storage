import express from 'express';
import bcrypt from 'bcrypt';
import { getDatabase } from '../config/database.js';
import { AuthService } from '../services/auth.service.js';

const router = express.Router();

// Initialisation du service d'authentification
let authService;

// Middleware pour injecter authService
const getAuthService = () => {
  if (!authService) {
    const db = getDatabase();
    authService = new AuthService(db);
  }
  return authService;
};

/**
 * POST /api/auth/register
 * Inscription d'un nouvel utilisateur
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Erreur de validation',
        message: 'Email et mot de passe requis'
      });
    }

    // Vérification du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Erreur de validation',
        message: 'Format email incorrect'
      });
    }

    // Vérification du mot de passe
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Erreur de validation',
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    const db = getDatabase();

    // Vérifier si l'utilisateur existe déjà
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Conflit',
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // Hasher le mot de passe
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur (rôle par défaut: user)
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, role) 
      VALUES (?, ?, ?, 'user')
    `).run(email, passwordHash, name || null);

    // Générer les tokens
    const service = getAuthService();
    const tokens = service.generateTokens({
      id: result.lastInsertRowid,
      email,
      role: 'user'
    });

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      data: {
        user: {
          id: result.lastInsertRowid,
          email,
          name: name || null,
          role: 'user'
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: 'Impossible de créer le compte'
    });
  }
});

/**
 * POST /api/auth/login
 * Connexion utilisateur
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Erreur de validation',
        message: 'Email et mot de passe requis'
      });
    }

    const db = getDatabase();

    // Rechercher l'utilisateur
    const user = db.prepare(`
      SELECT id, email, password_hash, name, role FROM users WHERE email = ?
    `).get(email);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Erreur d\'authentification',
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Erreur d\'authentification',
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Générer les tokens
    const service = getAuthService();
    const { accessToken, refreshToken } = service.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: 'Impossible de se connecter'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Rafraîchir l'access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token requis'
      });
    }

    const service = getAuthService();
    const result = service.refreshAccessToken(refreshToken);

    if (!result) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token invalide ou expiré'
      });
    }

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user
      }
    });
  } catch (error) {
    console.error('Erreur refresh:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

/**
 * GET /api/auth/me
 * Informations de l'utilisateur connecté
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token manquant'
      });
    }

    const service = getAuthService();
    const user = service.verifyAccessToken(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Token invalide ou expiré'
      });
    }

    const db = getDatabase();
    const fullUser = db.prepare(`
      SELECT id, email, name, role, created_at FROM users WHERE id = ?
    `).get(user.id);

    res.json({
      success: true,
      data: {
        user: fullUser
      }
    });
  } catch (error) {
    console.error('Erreur me:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

/**
 * PUT /api/auth/profile
 * Mettre à jour le profil
 */
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token manquant'
      });
    }

    const service = getAuthService();
    const user = service.verifyAccessToken(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Token invalide'
      });
    }

    const { name, email } = req.body;
    const db = getDatabase();

    // Vérifier si l'email est déjà utilisé
    if (email && email !== user.email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Conflit',
          message: 'Email déjà utilisé'
        });
      }
    }

    db.prepare(`
      UPDATE users 
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, email, user.id);

    res.json({
      success: true,
      message: 'Profil mis à jour',
      data: {
        user: {
          id: user.id,
          email: email || user.email,
          name: name || user.name,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

/**
 * POST /api/auth/logout
 * Déconnexion
 */
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const service = getAuthService();
      service.logout(refreshToken);
    }

    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

export default router;