import jwt from 'jsonwebtoken';
import { getDatabase } from '../config/database.js';

/**
 * Middleware для проверки JWT токена
 * Защищает маршруты, требующие аутентификации
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Доступ запрещён',
      message: 'Требуется токен аутентификации'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    
    // Проверяем, существует ли пользователь в базе
    const db = getDatabase();
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: 'Доступ запрещён',
        message: 'Пользователь не найден'
      });
    }

    // Добавляем информацию о пользователе в запрос
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Токен истёк',
        message: 'Пожалуйста, войдите снова'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Невалидный токен',
        message: 'Токен повреждён или недействителен'
      });
    }

    console.error('Ошибка аутентификации:', error);
    return res.status(500).json({
      error: 'Ошибка сервера',
      message: 'Не удалось проверить токен'
    });
  }
}

/**
 * Middleware для проверки роли пользователя
 * @param {string[]} allowedRoles - Массив разрешённых ролей
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Доступ запрещён',
        message: 'Пользователь не аутентифицирован'
      });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Доступ запрещён',
        message: 'Недостаточно прав для выполнения операции'
      });
    }

    next();
  };
}

/**
 * Генерация JWT токена
 * @param {object} payload - Данные для токена
 * @returns {string} JWT токен
 */
export function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'default-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

/**
 * Middleware для логирования запросов
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
}

export default {
  authenticateToken,
  requireRole,
  generateToken,
  requestLogger
};
