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

// ✅ FONCTION DE MIGRATION
function migrateDatabase() {
  try {
    console.log('🔄 Vérification de la structure de la base de données...');
    
    // 1. Vérifier la colonne role dans users
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasRoleColumn = tableInfo.some(col => col.name === 'role');
    
    if (!hasRoleColumn) {
      console.log('📦 Migration: Ajout de la colonne "role" à la table users...');
      db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';`);
      
      const adminCheck = db.prepare(`SELECT COUNT(*) as count FROM users WHERE email LIKE '%admin%' OR email = 'admin@example.com'`).get();
      if (adminCheck.count > 0) {
        db.exec(`UPDATE users SET role = 'admin' WHERE email LIKE '%admin%' OR email = 'admin@example.com';`);
        console.log('👑 Rôle admin attribué aux comptes admin existants');
      }
      console.log('✅ Migration role terminée');
    } else {
      console.log('✓ La colonne "role" existe déjà');
    }
    
    // 2. Vérifier la colonne updated_at dans document_pages
    const pagesTableInfo = db.prepare("PRAGMA table_info(document_pages)").all();
    const hasUpdatedAt = pagesTableInfo.some(col => col.name === 'updated_at');
    
    if (!hasUpdatedAt) {
      console.log('📦 Migration: Ajout de la colonne "updated_at" à document_pages...');
      try {
        db.exec(`ALTER TABLE document_pages ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;`);
        console.log('✅ Colonne updated_at ajoutée à document_pages');
      } catch (error) {
        console.log('⚠️ La colonne updated_at existe peut-être déjà:', error.message);
      }
    } else {
      console.log('✓ La colonne "updated_at" existe déjà');
    }
    
    // 3. Vérifier s'il y a au moins un admin
    const adminCount = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`).get();
    
    if (adminCount.count === 0) {
      console.log('⚠️ Aucun administrateur trouvé. Création d\'un admin par défaut...');
      const hasUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
      
      if (hasUsers.count > 0) {
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
  // Table des utilisateurs
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

  // Table des pages de document (AVEC updated_at)
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
  `);

  // Index
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_document_pages_document_id ON document_pages(document_id);
    CREATE INDEX IF NOT EXISTS idx_document_pages_ocr_text ON document_pages(ocr_text);
  `);

  // Lancer la migration
  migrateDatabase();

  // Créer un utilisateur admin par défaut
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  
  if (userCount.count === 0) {
    console.log('⚙️ Création de l\'utilisateur admin par défaut...');
    
    const saltRounds = 10;
    const adminPassword = bcrypt.hashSync('admin123', saltRounds);
    const insertUser = db.prepare(`
      INSERT INTO users (email, password_hash, name, role) 
      VALUES (?, ?, ?, ?)
    `);
    
    insertUser.run('admin@example.com', adminPassword, 'Administrateur', 'admin');
    
    console.log('✅ Utilisateur admin créé:');
    console.log('   - admin@example.com / admin123 (rôle: admin)');
  }

  console.log('✓ Base de données SQLite initialisée');
  console.log(`✓ Chemin de la BDD: ${dbPath}`);
  
  // Afficher la répartition des rôles
  try {
    const roleStats = db.prepare(`SELECT role, COUNT(*) as count FROM users GROUP BY role`).all();
    console.log('✓ Répartition des rôles:', roleStats);
  } catch (error) {
    console.log('✓ Répartition des rôles: à déterminer');
  }
}

export function getDatabase() {
  return db;
}

export function closeDatabase() {
  db.close();
}

export function updateUserRole(userId, newRole) {
  const validRoles = ['admin', 'manager', 'user'];
  if (!validRoles.includes(newRole)) {
    throw new Error('Rôle invalide');
  }
  
  const stmt = db.prepare(`UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
  const result = stmt.run(newRole, userId);
  
  if (result.changes === 0) {
    throw new Error('Utilisateur non trouvé');
  }
  
  return { success: true, message: `Rôle mis à jour: ${newRole}` };
}

export function getAllUsers() {
  return db.prepare(`SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC`).all();
}

export function getUserById(userId) {
  return db.prepare(`SELECT id, email, name, role, created_at FROM users WHERE id = ?`).get(userId);
}

export function userHasRole(userId, requiredRole) {
  const user = getUserById(userId);
  if (!user) return false;
  
  const roleHierarchy = { 'admin': 3, 'manager': 2, 'user': 1 };
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