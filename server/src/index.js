import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Chargement des variables d'environnement
dotenv.config();

// Import des routes
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import searchRoutes from './routes/search.js';
import adminRoutes from './routes/admin.js';

// Initialisation de la base de données
import { initDatabase, getDatabase } from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialisation de la base de données SQLite
initDatabase();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Middleware pour logger les requêtes
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// Fichiers statiques pour les documents uploadés
const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || '../uploads');
app.use('/uploads', express.static(uploadDir));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);

// Route de test pour vérifier les rôles (CORRIGÉE)
app.get('/api/debug/roles', (req, res) => {
  try {
    const db = getDatabase(); // ← CORRIGÉ: utilisation directe de getDatabase
    const users = db.prepare(`
      SELECT id, email, role, name 
      FROM users 
      ORDER BY role, email
    `).all();
    
    res.json({
      success: true,
      data: users,
      total: users.length
    });
  } catch (error) {
    console.error('Erreur debug roles:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Smart Scan Storage API fonctionne',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Route pour vérifier la version de l'API
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.0',
    name: 'Smart Scan Storage API',
    features: [
      'Authentification JWT',
      'RBAC (Rôles: admin, manager, user)',
      'OCR pour les images',
      'Support PDF et documents Word',
      'Recherche full-text',
      'Administration utilisateurs'
    ]
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route non trouvée',
    message: `La route ${req.method} ${req.url} n'existe pas`
  });
});

// Gestionnaire global d'erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  
  // Erreur de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      success: false,
      error: 'Erreur de validation',
      message: err.message 
    });
  }
  
  // Erreur JWT
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      success: false,
      error: 'Non autorisé',
      message: 'Token invalide ou expiré'
    });
  }
  
  // Erreur de base de données
  if (err.code === 'SQLITE_ERROR' || err.code === 'SQLITE_CONSTRAINT') {
    return res.status(500).json({ 
      success: false,
      error: 'Erreur base de données',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Erreur lors de l\'accès aux données'
    });
  }
  
  // Erreur par défaut
  res.status(500).json({ 
    success: false,
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     Smart Scan Storage - Serveur démarré                   ║
╠════════════════════════════════════════════════════════════╣
║  📍 API: http://localhost:${PORT}/api                      ║
║  📁 Uploads: ${uploadDir}                                   ║
║  🔧 Mode: ${process.env.NODE_ENV || 'development'}                         ║
╠════════════════════════════════════════════════════════════╣
║  📋 Routes disponibles:                                    ║
║     • /api/auth         - Authentification                 ║
║     • /api/documents    - Gestion documents                ║
║     • /api/search       - Recherche                        ║
║     • /api/admin        - Administration (admin only)      ║
║     • /api/health       - État du serveur                  ║
║     • /api/version      - Version API                      ║
║     • /api/debug/roles  - Debug rôles (admin only)         ║
╠════════════════════════════════════════════════════════════╣
║  👥 Rôles disponibles: admin, manager, user                ║
║  🔐 Authentification: JWT                                   ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;