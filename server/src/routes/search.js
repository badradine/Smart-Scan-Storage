import express from 'express';
import { getDatabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/search
 * Recherche avancée dans les documents et le contenu OCR
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDatabase();
    const { 
      q,           // Requête de recherche principale
      type,        // Type de recherche: all, document, content, metadata
      dateFrom,    // Date de début
      dateTo,      // Date de fin
      category,    // Catégorie
      hasAmount,   // Présence de montants
      hasDate,     // Présence de dates
      page = 1, 
      limit = 20 
    } = req.query;
    
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    if (!q && !dateFrom && !dateTo && !category && !hasAmount && !hasDate) {
      return res.status(400).json({
        success: false,
        error: 'Erreur de validation',
        message: 'Au moins un paramètre de recherche est requis'
      });
    }

    // ✅ Requête SQL corrigée - Utilisation de LIKE dans WHERE, pas de HAVING
    let query = `
      SELECT DISTINCT 
        d.id,
        d.title,
        d.description,
        d.category,
        d.tags,
        d.status,
        d.created_at,
        d.updated_at,
        GROUP_CONCAT(dp.id || '|' || dp.page_order || '|' || COALESCE(dp.ocr_text, '')) as pages
      FROM documents d
      LEFT JOIN document_pages dp ON d.id = dp.document_id
      WHERE d.user_id = ?
    `;
    const params = [userId];

    // Recherche par texte
    if (q) {
      const searchType = type || 'all';
      const searchTerm = `%${q}%`;
      
      if (searchType === 'all' || searchType === 'content') {
        query += ` AND dp.ocr_text LIKE ?`;
        params.push(searchTerm);
      }

      if (searchType === 'all' || searchType === 'document') {
        query += ` AND (d.title LIKE ? OR d.description LIKE ? OR d.tags LIKE ?)`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
    }

    // Filtre par date
    if (dateFrom) {
      query += ' AND d.created_at >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND d.created_at <= ?';
      params.push(dateTo);
    }

    // Filtre par catégorie
    if (category) {
      query += ' AND d.category = ?';
      params.push(category);
    }

    query += ' GROUP BY d.id ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const documents = db.prepare(query).all(...params);

    // ✅ Filtrer les résultats par présence de montants/dates (post-traitement)
    let filteredResults = documents;

    if (hasAmount === 'true') {
      filteredResults = filteredResults.filter(doc => {
        return doc.pages && (doc.pages.includes('€') || doc.pages.includes('EUR') || doc.pages.includes('$'));
      });
    }

    if (hasDate === 'true') {
      filteredResults = filteredResults.filter(doc => {
        return doc.pages && doc.pages.match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/);
      });
    }

    // Formatage des résultats
    const results = filteredResults.map(doc => {
      const pages = doc.pages ? doc.pages.split(',').map(p => {
        const [id, pageOrder, ocrText] = p.split('|');
        let highlights = [];
        if (q && ocrText && ocrText.toLowerCase().includes(q.toLowerCase())) {
          const index = ocrText.toLowerCase().indexOf(q.toLowerCase());
          const start = Math.max(0, index - 50);
          const end = Math.min(ocrText.length, index + q.length + 50);
          highlights.push(ocrText.substring(start, end));
        }
        return {
          id: parseInt(id),
          pageOrder: parseInt(pageOrder),
          highlights
        };
      }) : [];

      return {
        id: doc.id,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        tags: JSON.parse(doc.tags || '[]'),
        status: doc.status,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        matchedPages: pages.filter(p => p.highlights.length > 0),
        totalPages: pages.length
      };
    });

    // Compter le total
    let countQuery = `
      SELECT COUNT(DISTINCT d.id) as total
      FROM documents d
      LEFT JOIN document_pages dp ON d.id = dp.document_id
      WHERE d.user_id = ?
    `;
    const countParams = [userId];

    if (q) {
      countQuery += ' AND (d.title LIKE ? OR d.description LIKE ? OR dp.ocr_text LIKE ?)';
      countParams.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (dateFrom) {
      countQuery += ' AND d.created_at >= ?';
      countParams.push(dateFrom);
    }
    if (dateTo) {
      countQuery += ' AND d.created_at <= ?';
      countParams.push(dateTo);
    }
    if (category) {
      countQuery += ' AND d.category = ?';
      countParams.push(category);
    }

    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      success: true,
      data: {
        results,
        query: q,
        filters: {
          type,
          dateFrom,
          dateTo,
          category,
          hasAmount,
          hasDate
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Erreur recherche:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: 'Impossible d\'effectuer la recherche'
    });
  }
});

export default router;