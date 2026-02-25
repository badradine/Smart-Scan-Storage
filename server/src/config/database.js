import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к базе данных
const dbPath = path.join(__dirname, '../../data/smart-scan.db');

// Создаём директорию для базы данных, если её нет
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Подключение к SQLite
const db = new Database(dbPath);

// Включаем внешние ключи
db.pragma('foreign_keys = ON');

// Инициализация таблиц
export function initDatabase() {
  // Таблица пользователей
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Таблица документов
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

  // Таблица страниц документа (версии)
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

  // Индексы для ускорения поиска
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_document_pages_document_id ON document_pages(document_id);
    CREATE INDEX IF NOT EXISTS idx_document_pages_ocr_text ON document_pages(ocr_text);
  `);

  console.log('✓ База данных SQLite инициализирована');
  console.log(`✓ Путь к БД: ${dbPath}`);
}

// Получение экземпляра базы данных
export function getDatabase() {
  return db;
}

// Закрытие соединения с БД
export function closeDatabase() {
  db.close();
}

export default { initDatabase, getDatabase, closeDatabase };
