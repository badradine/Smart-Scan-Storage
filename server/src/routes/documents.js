import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateDocument, validateDocumentUpdate } from '../middleware/validation.js';

const router = express.Router();

// Configuration du stockage local
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Filtre pour les fichiers
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.webp', '.pdf',
    '.doc', '.docx', '.txt', '.rtf', '.odt'
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non supporté'), false);
  }
};

// Configuration multer local
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024, files: 20 }
});

// ✅ GET /api/documents - Liste des documents
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, limit = 10, status, category, search } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    let query = `
      SELECT d.*, 
        GROUP_CONCAT(dp.id || '|' || dp.file_name || '|' || dp.page_order) as pages
      FROM documents d
      LEFT JOIN document_pages dp ON d.id = dp.document_id
      WHERE d.user_id = ?
    `;
    const params = [userId];

    if (status) {
      query += ' AND d.status = ?';
      params.push(status);
    }
    if (category) {
      query += ' AND d.category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND d.title LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' GROUP BY d.id ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const documents = db.prepare(query).all(...params);

    const formattedDocs = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      tags: JSON.parse(doc.tags || '[]'),
      status: doc.status,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      pages: doc.pages ? doc.pages.split(',').map(p => {
        const [id, fileName, pageOrder] = p.split('|');
        return { id: parseInt(id), fileName, pageOrder: parseInt(pageOrder) };
      }) : []
    }));

    let countQuery = 'SELECT COUNT(*) as total FROM documents WHERE user_id = ?';
    const countParams = [userId];
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }
    if (search) {
      countQuery += ' AND title LIKE ?';
      countParams.push(`%${search}%`);
    }

    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      success: true,
      data: {
        documents: formattedDocs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Erreur récupération documents:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ✅ GET /api/documents/:id - Détail d'un document
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const userId = req.user.id;

    const document = db.prepare(`
      SELECT d.* FROM documents d WHERE d.id = ? AND d.user_id = ?
    `).get(id, userId);

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document non trouvé' });
    }

    const pages = db.prepare(`
      SELECT * FROM document_pages WHERE document_id = ? ORDER BY page_order
    `).all(id);

    res.json({
      success: true,
      data: {
        document: {
          id: document.id,
          title: document.title,
          description: document.description,
          category: document.category,
          tags: JSON.parse(document.tags || '[]'),
          status: document.status,
          createdAt: document.created_at,
          updatedAt: document.updated_at
        },
        pages
      }
    });
  } catch (error) {
    console.error('❌ Erreur récupération document:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ✅ POST /api/documents - Upload de document
router.post('/', 
  authenticateToken, 
  validateDocument,
  upload.array('files', 20), 
  async (req, res) => {
    try {
      const { title, description, category } = req.body;
      const files = req.files;
      const userId = req.user.id;

      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: 'Aucun fichier' });
      }

      const db = getDatabase();

      const documentResult = db.prepare(`
        INSERT INTO documents (user_id, title, description, category, status)
        VALUES (?, ?, ?, ?, 'processing')
      `).run(
        userId, 
        title || `Document du ${new Date().toLocaleDateString('fr-FR')}`, 
        description || '', 
        category || 'general'
      );

      const documentId = documentResult.lastInsertRowid;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        db.prepare(`
          INSERT INTO document_pages 
          (document_id, file_name, original_name, file_path, file_size, mime_type, page_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          documentId,
          file.filename,
          file.originalname,
          file.path,
          file.size,
          file.mimetype,
          i + 1
        );
      }

      db.prepare(`UPDATE documents SET status = 'ready' WHERE id = ?`).run(documentId);

      res.status(201).json({
        success: true,
        message: 'Document uploadé avec succès',
        data: { documentId, pagesProcessed: files.length }
      });
    } catch (error) {
      console.error('❌ Erreur upload:', error);
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, error: 'Fichier trop volumineux' });
        }
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ✅ PUT /api/documents/:id - Mise à jour
router.put('/:id', authenticateToken, validateDocumentUpdate, (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { title, description, category, tags, status } = req.body;
    const userId = req.user.id;

    const document = db.prepare('SELECT id FROM documents WHERE id = ? AND user_id = ?').get(id, userId);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document non trouvé' });
    }

    db.prepare(`
      UPDATE documents 
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          category = COALESCE(?, category),
          tags = COALESCE(?, tags),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, description, category, tags ? JSON.stringify(tags) : null, status, id);

    res.json({ success: true, message: 'Document mis à jour' });
  } catch (error) {
    console.error('❌ Erreur mise à jour:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ✅ DELETE /api/documents/:id - Suppression
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const userId = req.user.id;

    const document = db.prepare('SELECT id FROM documents WHERE id = ? AND user_id = ?').get(id, userId);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document non trouvé' });
    }

    const pages = db.prepare('SELECT file_path FROM document_pages WHERE document_id = ?').all(id);
    
    pages.forEach(page => {
      if (fs.existsSync(page.file_path)) {
        fs.unlinkSync(page.file_path);
      }
    });

    db.prepare('DELETE FROM documents WHERE id = ?').run(id);

    res.json({ success: true, message: 'Document supprimé' });
  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ✅ PUT /api/documents/:id/pages/:pageId - Mise à jour d'une page (AJOUTÉ)
router.put('/:id/pages/:pageId', authenticateToken, (req, res) => {
  try {
    const db = getDatabase();
    const { id, pageId } = req.params;
    const { ocrText, extractedData } = req.body;
    const userId = req.user.id;

    // Vérifier que le document appartient à l'utilisateur
    const document = db.prepare(`
      SELECT id FROM documents WHERE id = ? AND user_id = ?
    `).get(id, userId);

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document non trouvé' });
    }

    // Vérifier que la page appartient au document
    const page = db.prepare(`
      SELECT id FROM document_pages WHERE id = ? AND document_id = ?
    `).get(pageId, id);

    if (!page) {
      return res.status(404).json({ success: false, error: 'Page non trouvée' });
    }

    // Mettre à jour la page
    const updateStmt = db.prepare(`
      UPDATE document_pages 
      SET ocr_text = COALESCE(?, ocr_text),
          extracted_data = COALESCE(?, extracted_data),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(ocrText || null, extractedData || null, pageId);

    res.json({
      success: true,
      message: 'Page mise à jour avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur mise à jour page:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

export default router;