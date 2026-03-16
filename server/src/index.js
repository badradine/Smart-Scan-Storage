// Fichier: server/src/index.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Import des routes existantes
import documentRoutes from './routes/documents.js';
import searchRoutes from './routes/search.js';
import adminRoutes from './routes/admin.js';

// Import DB
import { initDatabase, getDatabase } from './config/database.js';

// Import Auth (nouveaux fichiers)
import { AuthService } from './services/auth.service.js';
import { AuthController } from './controllers/auth.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialisation DB
initDatabase();
const db = getDatabase();

// Initialisation Auth avec injection de dépendances
const authService = new AuthService(db);
const authController = new AuthController(authService);

// Middleware d'authentification AVEC LOGS
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log('📨 Auth Header reçu:', authHeader);
  
  const token = authHeader && authHeader.split(' ')[1];
  console.log('🔑 Token extrait:', token ? token.substring(0, 30) + '...' : 'AUCUN');
  
  if (!token) {
    console.log('❌ ERREUR: Token manquant');
    return res.status(401).json({ 
      success: false, 
      error: 'Token manquant' 
    });
  }

  try {
    const user = authService.verifyAccessToken(token);
    console.log('👤 Utilisateur trouvé:', user ? user.email : 'NULL');
    
    if (!user) {
      console.log('❌ ERREUR: Token invalide ou expiré');
      return res.status(403).json({ 
        success: false, 
        error: 'Token invalide ou expiré' 
      });
    }

    console.log('✅ Authentification réussie pour:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.log('❌ ERREUR JWT:', error.message);
    return res.status(403).json({ 
      success: false, 
      error: 'Token invalide' 
    });
  }
};

// Middleware CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Logger
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// Static files
const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || '../uploads');
app.use('/uploads', express.static(uploadDir));

// Routes d'authentification
app.post('/api/auth/login', authController.login);
app.post('/api/auth/refresh', authController.refresh);
app.post('/api/auth/logout', authController.logout);
app.post('/api/auth/logout-all', authenticateToken, authController.logoutAll);
app.get('/api/auth/me', authenticateToken, authController.me);

// Routes existantes (protégées)
app.use('/api/documents', authenticateToken, documentRoutes);
app.use('/api/search', authenticateToken, searchRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Nettoyage automatique des tokens expirés toutes les heures
setInterval(() => {
  authService.cleanup();
  console.log('🧹 Nettoyage des tokens expirés effectué');
}, 60 * 60 * 1000); // 1 heure

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route non trouvée' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Erreur interne du serveur' 
  });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     Smart Scan Storage - Serveur démarré                   ║
╠════════════════════════════════════════════════════════════╣
║  📍 API: http://localhost:${PORT}/api                      ║
║  🔐 Auth: JWT + Refresh Tokens (15m / 7j)                  ║
║  🏗️  Architecture: Service + Repository + Controller        ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;