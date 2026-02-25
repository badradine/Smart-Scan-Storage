import express from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../config/database.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Регистрация нового пользователя
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Валидация входных данных
    if (!email || !password) {
      return res.status(400).json({
        error: 'Ошибка валидации',
        message: 'Email и пароль обязательны'
      });
    }

    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Ошибка валидации',
        message: 'Некорректный формат email'
      });
    }

    // Проверка сложности пароля
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Ошибка валидации',
        message: 'Пароль должен содержать минимум 6 символов'
      });
    }

    const db = getDatabase();

    // Проверка, существует ли пользователь
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Конфликт',
        message: 'Пользователь с таким email уже существует'
      });
    }

    // Хеширование пароля
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Создание пользователя
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name) 
      VALUES (?, ?, ?)
    `).run(email, passwordHash, name || null);

    // Генерация токена
    const token = generateToken({ userId: result.lastInsertRowid, email });

    res.status(201).json({
      success: true,
      message: 'Регистрация успешна',
      data: {
        user: {
          id: result.lastInsertRowid,
          email,
          name: name || null
        },
        token
      }
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({
      error: 'Ошибка сервера',
      message: 'Не удалось зарегистрировать пользователя'
    });
  }
});

/**
 * POST /api/auth/login
 * Вход пользователя
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Валидация
    if (!email || !password) {
      return res.status(400).json({
        error: 'Ошибка валидации',
        message: 'Email и пароль обязательны'
      });
    }

    const db = getDatabase();

    // Поиск пользователя
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({
        error: 'Ошибка аутентификации',
        message: 'Неверный email или пароль'
      });
    }

    // Проверка пароля
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Ошибка аутентификации',
        message: 'Неверный email или пароль'
      });
    }

    // Генерация токена
    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token
      }
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({
      error: 'Ошибка сервера',
      message: 'Не удалось выполнить вход'
    });
  }
});

/**
 * GET /api/auth/me
 * Получение информации о текущем пользователе
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

/**
 * PUT /api/auth/profile
 * Обновление профиля пользователя
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    const db = getDatabase();

    // Если меняется email, проверяем уникальность
    if (email && email !== req.user.email) {
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingUser) {
        return res.status(409).json({
          error: 'Конфликт',
          message: 'Email уже используется'
        });
      }
    }

    db.prepare(`
      UPDATE users 
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, email, req.user.id);

    res.json({
      success: true,
      message: 'Профиль обновлён',
      data: {
        user: {
          id: req.user.id,
          email: email || req.user.email,
          name: name || req.user.name
        }
      }
    });
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({
      error: 'Ошибка сервера',
      message: 'Не удалось обновить профиль'
    });
  }
});

/**
 * POST /api/auth/logout
 * Выход пользователя (на клиенте удаляется токен)
 */
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Выход выполнен успешно'
  });
});

export default router;
