import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkPermission, checkDocumentOwnership, ROLES } from '../middleware/permissions.js';
import ocrService from '../services/ocrService.js';

const router = express.Router();

// Configuration du stockage pour les fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Générer un nom unique
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// FILTRE - Accepte images, PDF et documents Office
const fileFilter = (req, file, cb) => {
  console.log('📁 Fichier reçu:', file.originalname);
  console.log('🔍 Type MIME:', file.mimetype);
  
  // Liste des extensions autorisées
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.webp', '.pdf',
    '.doc', '.docx', '.txt', '.rtf', '.odt'
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Vérification par extension
  if (allowedExtensions.includes(ext)) {
    console.log('✅ Fichier accepté (extension:', ext, ')');
    cb(null, true);
  } else {
    console.log('❌ Fichier refusé - Extension non supportée:', ext);
    cb(new Error('Type de fichier non supporté. Formats acceptés: JPEG, PNG, TIFF, BMP, WebP, PDF, DOC, DOCX, TXT'), false);
  }
};

// Configuration de multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 20
  }
});

/**
 * GET /api/documents - Liste des documents
 * Permissions: documents:view_own (pour ses documents)
 *             documents:view_all (pour admin/manager)
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, limit = 10, status, category, search } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Construction de la requête selon les permissions
    let query = `
      SELECT d.*, 
        GROUP_CONCAT(dp.id || '|' || dp.file_name || '|' || dp.page_order || '|' || dp.mime_type) as pages
      FROM documents d
      LEFT JOIN document_pages dp ON d.id = dp.document_id
      WHERE 1=1
    `;
    const params = [];

    // Filtrer selon le rôle
    if (userRole === ROLES.ADMIN || userRole === ROLES.MANAGER) {
      // Admin et Manager voient tous les documents
      console.log(`👑 ${userRole} voit tous les documents`);
    } else {
      // Les users voient seulement leurs documents
      query += ' AND d.user_id = ?';
      params.push(userId);
    }

    // Filtres supplémentaires
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

    const formattedDocs = documents.map(doc => {
      let pages = [];
      if (doc.pages) {
        pages = doc.pages.split(',').map(p => {
          const [id, fileName, pageOrder, mimeType] = p.split('|');
          const ext = fileName.split('.').pop().toLowerCase();
          return { 
            id: parseInt(id), 
            fileName, 
            pageOrder: parseInt(pageOrder),
            mimeType,
            isPdf: mimeType && (mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')),
            isWord: ['.doc', '.docx', '.txt', '.rtf', '.odt'].includes(`.${ext}`)
          };
        });
      }

      return {
        id: doc.id,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        tags: JSON.parse(doc.tags || '[]'),
        status: doc.status,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        pages,
        isPdfDocument: pages.some(p => p.isPdf),
        isWordDocument: pages.some(p => p.isWord),
        // Ajouter l'email du propriétaire pour admin/manager
        ownerEmail: doc.user_id ? getUserEmail(doc.user_id) : null
      };
    });

    // Compter le total (avec les mêmes filtres)
    let countQuery = 'SELECT COUNT(*) as total FROM documents WHERE 1=1';
    const countParams = [];
    
    if (userRole !== ROLES.ADMIN && userRole !== ROLES.MANAGER) {
      countQuery += ' AND user_id = ?';
      countParams.push(userId);
    }
    
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
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: 'Impossible de récupérer les documents'
    });
  }
});

// Fonction utilitaire pour obtenir l'email d'un utilisateur
function getUserEmail(userId) {
  try {
    const db = getDatabase();
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
    return user ? user.email : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/documents/:id - Détail d'un document
 * Permissions: documents:view_own + vérification propriété
 */
router.get('/:id', authenticateToken, checkDocumentOwnership, (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const document = db.prepare(`
      SELECT d.*, u.email as owner_email, u.name as owner_name
      FROM documents d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = ?
    `).get(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Non trouvé',
        message: 'Document non trouvé'
      });
    }

    const pages = db.prepare(`
      SELECT * FROM document_pages WHERE document_id = ? ORDER BY page_order
    `).all(id);

    const formattedPages = pages.map(page => {
      const ext = page.file_name.split('.').pop().toLowerCase();
      return {
        id: page.id,
        fileName: page.file_name,
        originalName: page.original_name,
        filePath: page.file_path,
        fileSize: page.file_size,
        mimeType: page.mime_type,
        pageOrder: page.page_order,
        ocrText: page.ocr_text,
        extractedData: JSON.parse(page.extracted_data || '{}'),
        createdAt: page.created_at,
        isPdf: page.mime_type && (page.mime_type.includes('pdf') || page.file_name.toLowerCase().endsWith('.pdf')),
        isWord: ['.doc', '.docx', '.txt', '.rtf', '.odt'].includes(`.${ext}`)
      };
    });

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
          updatedAt: document.updated_at,
          owner: {
            id: document.user_id,
            email: document.owner_email,
            name: document.owner_name
          }
        },
        pages: formattedPages
      }
    });
  } catch (error) {
    console.error('❌ Erreur récupération document:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: 'Impossible de récupérer le document'
    });
  }
});

/**
 * POST /api/documents - Upload de document
 * Permissions: documents:create (tous les utilisateurs connectés)
 */
router.post('/', 
  authenticateToken, 
  checkPermission('documents:create'),
  upload.array('files', 20), 
  async (req, res) => {
    try {
      const { title, description, category } = req.body;
      const files = req.files;
      const userId = req.user.id;

      console.log('📦 Fichiers reçus:', files ? files.length : 0);

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Erreur de validation',
          message: 'Aucun fichier téléchargé'
        });
      }

      const db = getDatabase();

      // Création du document
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
      const processedPages = [];

      // Traitement de chaque fichier
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.resolve(file.path);
        const isPdf = file.mimetype.includes('pdf') || file.originalname.toLowerCase().endsWith('.pdf');
        const isWord = file.originalname.toLowerCase().endsWith('.doc') || 
                       file.originalname.toLowerCase().endsWith('.docx') ||
                       file.originalname.toLowerCase().endsWith('.txt') ||
                       file.originalname.toLowerCase().endsWith('.rtf') ||
                       file.originalname.toLowerCase().endsWith('.odt');
        
        console.log(`🔄 Traitement fichier ${i + 1}/${files.length}: ${file.originalname} (PDF: ${isPdf}, Word: ${isWord})`);
        
        let ocrResult = { success: false, text: '', confidence: 0, rawMetadata: {} };
        
        // OCR uniquement pour les images
        if (!isPdf && !isWord) {
          try {
            ocrResult = await ocrService.processImage(filePath, (progress) => {
              console.log(`📝 OCR progression ${i + 1}/${files.length}: ${progress}%`);
            });
            console.log(`✅ OCR réussi pour ${file.originalname}`);
          } catch (ocrError) {
            console.warn(`⚠️ Erreur OCR pour ${file.originalname}:`, ocrError.message);
          }
        } else {
          console.log(`📄 Fichier ${isPdf ? 'PDF' : 'Word/TXT'} ignoré pour OCR: ${file.originalname}`);
        }

        // Sauvegarde dans la base de données
        db.prepare(`
          INSERT INTO document_pages 
          (document_id, file_name, original_name, file_path, file_size, mime_type, page_order, ocr_text, extracted_data)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          documentId,
          file.filename,
          file.originalname,
          file.path,
          file.size,
          file.mimetype,
          i + 1,
          ocrResult.text || '',
          JSON.stringify({
            ...ocrResult.rawMetadata,
            isPdf,
            isWord,
            ocrAttempted: !isPdf && !isWord,
            ocrSuccess: ocrResult.success
          })
        );

        processedPages.push({
          pageOrder: i + 1,
          fileName: file.originalname,
          isPdf,
          isWord,
          ocrSuccess: ocrResult.success,
          confidence: ocrResult.confidence
        });
      }

      // Mise à jour du statut du document
      db.prepare(`
        UPDATE documents SET status = 'ready', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(documentId);

      console.log(`✅ Document ${documentId} créé avec succès avec ${files.length} page(s)`);

      res.status(201).json({
        success: true,
        message: 'Document téléchargé et traité avec succès',
        data: {
          documentId,
          pagesProcessed: files.length,
          processedPages,
          hasPdf: processedPages.some(p => p.isPdf),
          hasWord: processedPages.some(p => p.isWord)
        }
      });
    } catch (error) {
      console.error('❌ Erreur téléchargement document:', error);
      
      // Gestion spécifique des erreurs Multer
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'Fichier trop volumineux',
            message: 'La taille maximale est de 100MB'
          });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: 'Trop de fichiers',
            message: 'Maximum 20 fichiers par upload'
          });
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        message: error.message || 'Impossible de télécharger le document'
      });
    }
  }
);

/**
 * PUT /api/documents/:id - Mise à jour document
 * Permissions: documents:edit_own + vérification propriété
 */
router.put('/:id', 
  authenticateToken, 
  checkDocumentOwnership,
  checkPermission('documents:edit_own'),
  (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const { title, description, category, tags, status } = req.body;

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

      res.json({
        success: true,
        message: 'Document mis à jour'
      });
    } catch (error) {
      console.error('❌ Erreur mise à jour document:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        message: 'Impossible de mettre à jour le document'
      });
    }
  }
);

/**
 * DELETE /api/documents/:id - Suppression document
 * Permissions: documents:delete_own + vérification propriété
 */
router.delete('/:id', 
  authenticateToken, 
  checkDocumentOwnership,
  checkPermission('documents:delete_own'),
  (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;

      const pages = db.prepare('SELECT file_path FROM document_pages WHERE document_id = ?').all(id);
      
      pages.forEach(page => {
        if (fs.existsSync(page.file_path)) {
          fs.unlinkSync(page.file_path);
          console.log(`🗑️ Fichier supprimé: ${page.file_path}`);
        }
      });

      db.prepare('DELETE FROM documents WHERE id = ?').run(id);

      console.log(`✅ Document ${id} supprimé avec succès`);

      res.json({
        success: true,
        message: 'Document supprimé'
      });
    } catch (error) {
      console.error('❌ Erreur suppression document:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        message: 'Impossible de supprimer le document'
      });
    }
  }
);

/**
 * PUT /api/documents/:id/pages/:pageId - Mise à jour page
 * Permissions: documents:edit_own + vérification propriété
 */
router.put('/:id/pages/:pageId', 
  authenticateToken, 
  checkDocumentOwnership,
  checkPermission('documents:edit_own'),
  (req, res) => {
    try {
      const db = getDatabase();
      const { id, pageId } = req.params;
      const { ocrText, extractedData } = req.body;

      db.prepare(`
        UPDATE document_pages 
        SET ocr_text = ?, extracted_data = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND document_id = ?
      `).run(ocrText, JSON.stringify(extractedData || {}), pageId, id);

      res.json({
        success: true,
        message: 'Page mise à jour'
      });
    } catch (error) {
      console.error('❌ Erreur mise à jour page:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        message: 'Impossible de mettre à jour la page'
      });
    }
  }
);

export default router;