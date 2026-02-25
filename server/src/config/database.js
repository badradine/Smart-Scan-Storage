import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin de la base de données
const dbPath = path.join(__dirname, '../../data/smart-scan.db');

// Créer le dossier pour la base de données s'il n'existe pas
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Connexion à SQLite
const db = new Database(dbPath);

// Activer les clés étrangères
db.pragma('foreign_keys = ON');

// ✅ FONCTION DE MIGRATION POUR AJOUTER LA COLONNE ROLE
function migrateDatabase() {
  try {
    console.log('🔄 Vérification de la structure de la base de données...');
    
    // Vérifier si la colonne role existe déjà
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasRoleColumn = tableInfo.some(col => col.name === 'role');
    
    if (!hasRoleColumn) {
      console.log('📦 Migration: Ajout de la colonne "role" à la table users...');
      
      // Ajouter la colonne role avec une valeur par défaut 'user'
      db.exec(`
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
      `);
      
      // Définir un admin par défaut (si un utilisateur existe avec email admin)
      const adminCheck = db.prepare(`
        SELECT COUNT(*) as count FROM users WHERE email LIKE '%admin%' OR email = 'admin@example.com'
      `).get();
      
      if (adminCheck.count > 0) {
        db.exec(`
          UPDATE users SET role = 'admin' WHERE email LIKE '%admin%' OR email = 'admin@example.com';
        `);
        console.log('👑 Rôle admin attribué aux comptes admin existants');
      }
      
      // Le reste des utilisateurs reste 'user' (valeur par défaut)
      console.log('✅ Migration terminée avec succès');
    } else {
      console.log('✓ La colonne "role" existe déjà');
    }
    
    // Vérifier s'il y a au moins un admin
    const adminCount = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE role = 'admin'
    `).get();
    
    if (adminCount.count === 0) {
      console.log('⚠️ Aucun administrateur trouvé. Création d\'un admin par défaut...');
      
      // Créer un admin par défaut si aucun n'existe
      const hasUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
      
      if (hasUsers.count > 0) {
        // Prendre le premier utilisateur comme admin
        const firstUser = db.prepare('SELECT id, email FROM users LIMIT 1').get();
        db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', firstUser.id);
        console.log(`👑 Utilisateur ${firstUser.email} promu administrateur`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error.message);
  }
}

// Initialisation des tables
export function initDatabase() {
  // Table des utilisateurs (version avec rôle)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table des documents
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general',
      tags TEXT DEFAULT '[]',
      status TEXT DEFAULT 'processing',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Table des pages de document
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      original_name TEXT,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      page_order INTEGER DEFAULT 1,
      ocr_text TEXT,
      extracted_data TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
  `);

  // Index pour accélérer les recherches
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_document_pages_document_id ON document_pages(document_id);
    CREATE INDEX IF NOT EXISTS idx_document_pages_ocr_text ON document_pages(ocr_text);
  `);

  // ✅ LANCER LA MIGRATION APRÈS LA CRÉATION DES TABLES
  migrateDatabase();

  // ✅ CRÉER UN SEUL UTILISATEUR ADMIN PAR DÉFAUT SI LA TABLE EST VIDE
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  
  if (userCount.count === 0) {
    console.log('⚙️ Création de l\'utilisateur admin par défaut...');
    
    const saltRounds = 10;
    
    // Créer UN SEUL admin
    const adminPassword = bcrypt.hashSync('admin123', saltRounds);
    const insertUser = db.prepare(`
      INSERT INTO users (email, password_hash, name, role) 
      VALUES (?, ?, ?, ?)
    `);
    
    insertUser.run('admin@example.com', adminPassword, 'Administrateur', 'admin');
    
    console.log('✅ Utilisateur admin créé:');
    console.log('   - admin@example.com / admin123 (rôle: admin)');
    console.log('');
    console.log('ℹ️  Pour créer d\'autres utilisateurs, utilisez la page d\'inscription ou l\'interface admin.');
  }

  console.log('✓ Base de données SQLite initialisée');
  console.log(`✓ Chemin de la BDD: ${dbPath}`);
  
  // Afficher la répartition des rôles
  try {
    const roleStats = db.prepare(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `).all();
    
    console.log('✓ Répartition des rôles:', roleStats);
  } catch (error) {
    console.log('✓ Répartition des rôles: à déterminer');
  }
}

// Obtenir l'instance de la base de données
export function getDatabase() {
  return db;
}

// Fermer la connexion à la BDD
export function closeDatabase() {
  db.close();
}

// Mettre à jour le rôle d'un utilisateur
export function updateUserRole(userId, newRole) {
  const validRoles = ['admin', 'manager', 'user'];
  
  if (!validRoles.includes(newRole)) {
    throw new Error('Rôle invalide. Rôles acceptés: admin, manager, user');
  }
  
  const stmt = db.prepare(`
    UPDATE users 
    SET role = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);
  
  const result = stmt.run(newRole, userId);
  
  if (result.changes === 0) {
    throw new Error('Utilisateur non trouvé');
  }
  
  return { success: true, message: `Rôle mis à jour: ${newRole}` };
}

// Obtenir tous les utilisateurs avec leurs rôles
export function getAllUsers() {
  const stmt = db.prepare(`
    SELECT id, email, name, role, created_at 
    FROM users 
    ORDER BY created_at DESC
  `);
  
  return stmt.all();
}

// Obtenir un utilisateur par son ID
export function getUserById(userId) {
  const stmt = db.prepare(`
    SELECT id, email, name, role, created_at 
    FROM users 
    WHERE id = ?
  `);
  
  return stmt.get(userId);
}

// Vérifier si un utilisateur a un rôle spécifique
export function userHasRole(userId, requiredRole) {
  const user = getUserById(userId);
  if (!user) return false;
  
  // Hiérarchie des rôles (admin > manager > user)
  const roleHierarchy = {
    'admin': 3,
    'manager': 2,
    'user': 1
  };
  
  const userRoleLevel = roleHierarchy[user.role] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
  
  return userRoleLevel >= requiredRoleLevel;
}

export default { 
  initDatabase, 
  getDatabase, 
  closeDatabase,
  updateUserRole,
  getAllUsers,
  getUserById,
  userHasRole
};