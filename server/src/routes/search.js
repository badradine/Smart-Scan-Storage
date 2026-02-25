import express from 'express';
import { getDatabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/search
 * Расширенный поиск по документам и содержимому OCR
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDatabase();
    const { 
      q,           // Основной поисковый запрос
      type,        // Тип поиска: all, document, content, metadata
      dateFrom,    // Дата от
      dateTo,      // Дата до
      category,    // Категория
      hasAmount,   // Наличие сумм в документе
      hasDate,     // Наличие дат в документе
      page = 1, 
      limit = 20 
    } = req.query;
    
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    if (!q && !dateFrom && !dateTo && !category && !hasAmount && !hasDate) {
      return res.status(400).json({
        error: 'Ошибка валидации',
        message: 'Требуется хотя бы один параметр поиска'
      });
    }

    // Базовый запрос - ищем в документах и страницах
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
    let hasSearchCondition = false;

    // Поиск по тексту запроса
    if (q) {
      const searchType = type || 'all';
      
      if (searchType === 'all' || searchType === 'content') {
        // Поиск в OCR-тексте страниц
        query = query.replace('GROUP_CONCAT', `
          CASE 
            WHEN dp.ocr_text LIKE ? THEN 1 
            ELSE 0 
          END as match_score,
          GROUP_CONCAT`);
        params.push(`%${q}%`);
        hasSearchCondition = true;
      }

      if (searchType === 'all' || searchType === 'document') {
        // Поиск в названии документа
        query = query.replace('WHERE d.user_id = ?', `
          AND (d.title LIKE ? OR d.description LIKE ? OR d.tags LIKE ?)
        `);
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
    }

    // Фильтр по дате
    if (dateFrom) {
      query += ' AND d.created_at >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND d.created_at <= ?';
      params.push(dateTo);
    }

    // Фильтр по категории
    if (category) {
      query += ' AND d.category = ?';
      params.push(category);
    }

    query += ' GROUP BY d.id';

    // Фильтр по наличию сумм
    if (hasAmount === 'true') {
      query += ' HAVING pages LIKE ? OR pages LIKE ? OR pages LIKE ?';
      params.push('%руб%', '%RUB%', '%USD%');
    }

    // Фильтр по наличию дат
    if (hasDate === 'true') {
      query += ' HAVING pages LIKE ?';
      params.push('%__.__.____%');
    }

    query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const documents = db.prepare(query).all(...params);

    // Форматирование результатов с подсветкой совпадений
    const results = documents.map(doc => {
      const pages = doc.pages ? doc.pages.split(',').map(p => {
        const [id, pageOrder, ocrText] = p.split('|');
        // Поиск совпадений в тексте
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

    // Подсчёт общего количества результатов
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
    console.error('Ошибка поиска:', error);
    res.status(500).json({
      error: 'Ошибка сервера',
      message: 'Не удалось выполнить поиск'
    });
  }
});

/**
 * GET /api/search/suggestions
 * Получение подсказок для автодополнения
 */
router.get('/suggestions', authenticateToken, (req, res) => {
  try {
    const db = getDatabase();
    const { q } = req.query;
    const userId = req.user.id;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }

    // Подсказки из названий документов
    const titleSuggestions = db.prepare(`
      SELECT DISTINCT title as value FROM documents 
      WHERE user_id = ? AND title LIKE ? 
      LIMIT 5
    `).all(userId, `%${q}%`);

    // Подсказки из тегов
    const tagSuggestions = db.prepare(`
      SELECT DISTINCT tags FROM documents 
      WHERE user_id = ?
    `).all(userId);

    const uniqueTags = new Set();
    tagSuggestions.forEach(row => {
      try {
        const tags = JSON.parse(row.tags || '[]');
        tags.forEach(tag => {
          if (tag.toLowerCase().includes(q.toLowerCase())) {
            uniqueTags.add(tag);
          }
        });
      } catch (e) {}
    });

    // Подсказки из OCR-текста
    const contentSuggestions = db.prepare(`
      SELECT DISTINCT SUBSTR(ocr_text, 1, 100) as value 
      FROM document_pages dp
      JOIN documents d ON dp.document_id = d.id
      WHERE d.user_id = ? AND ocr_text LIKE ?
      LIMIT 5
    `).all(userId, `%${q}%`);

    res.json({
      success: true,
      data: {
        suggestions: [
          ...titleSuggestions.map(s => ({ ...s, type: 'document' })),
          ...Array.from(uniqueTags).slice(0, 5).map(t => ({ value: t, type: 'tag' })),
          ...contentSuggestions.map(s => ({ ...s, type: 'content' }))
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка получения подсказок:', error);
    res.status(500).json({
      error: 'Ошибка сервера',
      message: 'Не удалось получить подсказки'
    });
  }
});

/**
 * GET /api/search/advanced
 * Расширенный поиск по конкретным полям метаданных
 */
router.get('/advanced', authenticateToken, (req, res) => {
  try {
    const db = getDatabase();
    const { 
      name,        // Поиск по именам
      date,        // Поиск по датам
      amount,      // Поиск по суммам
      email,       // Поиск по email
      phone,       // Поиск по телефону
      page = 1, 
      limit = 20 
    } = req.query;
    
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    // Поиск по извлечённым метаданным в JSON
    let query = `
      SELECT DISTINCT d.*, dp.id as page_id, dp.page_order, dp.extracted_data
      FROM documents d
      JOIN document_pages dp ON d.id = dp.document_id
      WHERE d.user_id = ?
    `;
    const params = [userId];

    if (name) {
      query += ' AND dp.extracted_data LIKE ?';
      params.push(`%${name}%`);
    }
    if (date) {
      query += ' AND dp.extracted_data LIKE ?';
      params.push(`%${date}%`);
    }
    if (amount) {
      query += ' AND (dp.extracted_data LIKE ? OR dp.extracted_data LIKE ? OR dp.extracted_data LIKE ?)';
      params.push(`%${amount}%`, '%руб%', '%RUB%');
    }
    if (email) {
      query += ' AND dp.extracted_data LIKE ?';
      params.push(`%${email}%`);
    }
    if (phone) {
      query += ' AND dp.extracted_data LIKE ?';
      params.push(`%${phone}%`);
    }

    query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const results = db.prepare(query).all(...params);

    // Группировка по документам
    const documentsMap = new Map();
    results.forEach(row => {
      if (!documentsMap.has(row.id)) {
        documentsMap.set(row.id, {
          id: row.id,
          title: row.title,
          description: row.description,
          category: row.category,
          tags: JSON.parse(row.tags || '[]'),
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          matchedPages: []
        });
      }
      
      if (row.page_id) {
        const extractedData = JSON.parse(row.extracted_data || '{}');
        documentsMap.get(row.id).matchedPages.push({
          pageId: row.page_id,
          pageOrder: row.page_order,
          matchedData: extractedData
        });
      }
    });

    res.json({
      success: true,
      data: {
        results: Array.from(documentsMap.values()),
        query: { name, date, amount, email, phone },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: documentsMap.size
        }
      }
    });
  } catch (error) {
    console.error('Ошибка расширенного поиска:', error);
    res.status(500).json({
      error: 'Ошибка сервера',
      message: 'Не удалось выполнить расширенный поиск'
    });
  }
});

export default router;
