import express from 'express';
import { getDatabase, updateUserRole, getAllUsers } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import bcrypt from 'bcrypt';

const router = express.Router();

/**
 * GET /api/admin/users - Liste tous les utilisateurs (admin seulement)
 */
router.get('/users', authenticateToken, checkPermission('users:view'), (req, res) => {
  try {
    const db = getDatabase();
    
    const users = db.prepare(`
      SELECT 
        id, 
        email, 
        name, 
        role, 
        created_at,
        (SELECT COUNT(*) FROM documents WHERE user_id = users.id) as documents_count
      FROM users 
      ORDER BY created_at DESC
    `).all();
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: 'Impossible de récupérer la liste des utilisateurs'
    });
  }
});

/**
 * GET /api/admin/users/:id - Détails d'un utilisateur
 */
router.get('/users/:id', authenticateToken, checkPermission('users:view'), (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    const user = db.prepare(`
      SELECT 
        id, 
        email, 
        name, 
        role, 
        created_at,
        updated_at
      FROM users 
      WHERE id = ?
    `).get(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Non trouvé',
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Compter les documents de l'utilisateur
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_documents,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready_documents,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_documents
      FROM documents 
      WHERE user_id = ?
    `).get(id);
    
    res.json({
      success: true,
      data: {
        ...user,
        stats
      }
    });
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: 'Impossible de récupérer les détails de l\'utilisateur'
    });
  }
});

/**
 * PUT /api/admin/users/:id/role - Changer le rôle d'un utilisateur
 */
router.put('/users/:id/role', authenticateToken, checkPermission('users:manage'), (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    const validRoles = ['admin', 'manager', 'user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Rôle invalide. Rôles acceptés: admin, manager, user'
      });
    }
    
    const db = getDatabase();
    
    // Vérifier que l'utilisateur existe
    const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Non trouvé',
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Empêcher un admin de se retirer ses propres droits (optionnel)
    if (id == req.user.id && role !== 'admin' && req.user.role === 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Action interdite',
        message: 'Vous ne pouvez pas retirer vos propres droits admin'
      });
    }
    
    // Mettre à jour le rôle
    db.prepare(`
      UPDATE users 
      SET role = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(role, id);
    
    res.json({
      success: true,
      message: `Rôle de l'utilisateur ${user.email} mis à jour: ${role}`,
      data: { userId: id, newRole: role }
    });
  } catch (error) {
    console.error('Erreur mise à jour rôle:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: 'Impossible de mettre à jour le rôle'
    });
  }
});

/**
 * POST /api/admin/users - Créer un nouvel utilisateur (admin seulement)
 */
router.post('/users', authenticateToken, checkPermission('users:manage'), async (req, res) => {
  try {
    const { email, password, name, role = 'user' } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Email et mot de passe requis'
      });
    }
    
    const validRoles = ['admin', 'manager', 'user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Rôle invalide'
      });
    }
    
    const db = getDatabase();
    
    // Vérifier si l'email existe déjà
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Conflit',
        message: 'Cet email est déjà utilisé'
      });
    }
    
    // Hasher le mot de passe
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Créer l'utilisateur
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, ?)
    `).run(email, passwordHash, name || null, role);
    
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: {
        id: result.lastInsertRowid,
        email,
        name,
        role
      }
    });
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: 'Impossible de créer l\'utilisateur'
    });
  }
});

/**
 * DELETE /api/admin/users/:id - Supprimer un utilisateur (admin seulement)
 */
router.delete('/users/:id', authenticateToken, checkPermission('users:manage'), (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    // Empêcher l'auto-suppression
    if (id == req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Action interdite',
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }
    
    // Vérifier que l'utilisateur existe
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Non trouvé',
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Supprimer l'utilisateur (les documents seront supprimés par CASCADE)
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    
    res.json({
      success: true,
      message: `Utilisateur ${user.email} supprimé avec succès`
    });
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: 'Impossible de supprimer l\'utilisateur'
    });
  }
});

/**
 * GET /api/admin/stats - Statistiques générales (admin/manager)
 */
router.get('/stats', authenticateToken, checkPermission('stats:view'), (req, res) => {
  try {
    const db = getDatabase();
    
    const stats = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      documents: db.prepare('SELECT COUNT(*) as count FROM documents').get().count,
      pages: db.prepare('SELECT COUNT(*) as count FROM document_pages').get().count,
      documentsByStatus: {
        ready: db.prepare('SELECT COUNT(*) as count FROM documents WHERE status = ?').get('ready').count,
        processing: db.prepare('SELECT COUNT(*) as count FROM documents WHERE status = ?').get('processing').count
      },
      usersByRole: {
        admin: db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin').count,
        manager: db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('manager').count,
        user: db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('user').count
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erreur récupération stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: 'Impossible de récupérer les statistiques'
    });
  }
});

export default router;