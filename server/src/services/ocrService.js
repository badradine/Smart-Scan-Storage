import Tesseract from 'tesseract.js';
import path from 'path';
import fs from 'fs';

/**
 * OCR Service - сервис для распознавания текста в изображениях
 * Использует Tesseract.js для извлечения текста из сканов документов
 */
class OCRService {
  constructor() {
    this.workers = new Map();
  }

  /**
   * Создание рабочего процесса Tesseract
   */
  async createWorker() {
    const worker = await Tesseract.createWorker('rus+eng');
    return worker;
  }

  /**
   * Распознавание текста в изображении
   * @param {string} imagePath - Путь к изображению
   * @param {Function} onProgress - Коллбэк для отслеживания прогресса
   * @returns {Promise<object>} Результат распознавания
   */
  async recognizeText(imagePath, onProgress = () => {}) {
    try {
      // Проверка существования файла
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Файл не найден: ${imagePath}`);
      }

      const worker = await this.createWorker();
      
      const result = await worker.recognize(imagePath, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            onProgress(Math.round(m.progress * 100));
          }
        }
      });

      await worker.terminate();

      return {
        success: true,
        text: result.data.text,
        confidence: result.data.confidence,
        words: result.data.words?.map(w => ({
          text: w.text,
          confidence: w.confidence,
          bbox: w.bbox
        })) || []
      };
    } catch (error) {
      console.error('Ошибка OCR:', error);
      return {
        success: false,
        error: error.message,
        text: '',
        confidence: 0
      };
    }
  }

  /**
   * Извлечение метаданных из текста
   * Ищет даты, суммы денег, имена и другие структурированные данные
   * @param {string} text - Текст для анализа
   * @returns {object} Извлечённые метаданные
   */
  extractMetadata(text) {
    const metadata = {
      dates: [],
      amounts: [],
      emails: [],
      phones: [],
      names: [],
      keywords: []
    };

    if (!text) return metadata;

    // Поиск дат в различных форматах
    const datePatterns = [
      /\b(\d{1,2}[\.\-\/]\d{1,2}[\.\-\/]\d{2,4})\b/g,  // DD.MM.YYYY или DD-MM-YYYY
      /\b(\d{4}[\.\-\/]\d{1,2}[\.\-\/]\d{1,2})\b/g,    // YYYY-MM-DD
      /\b(\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+\d{4})\b/gi,  // русские названия месяцев
      /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/gi  // английские названия месяцев
    ];

    datePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        metadata.dates.push(...matches);
      }
    });

    // Поиск сумм денежных средств
    const amountPatterns = [
      /[\d\s,.]+\s*(?:руб(?:лей)?|₽|RUB|USD|EUR|€|£|$)/gi,
      /[\d\s,.]+(?:руб(?:лей)?|₽|RUB|USD|EUR|€|£|$)/gi
    ];

    amountPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        // Фильтруем дубликаты и очищаем
        const uniqueAmounts = [...new Set(matches.map(m => m.trim()))];
        metadata.amounts.push(...uniqueAmounts);
      }
    });

    // Поиск email адресов
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailPattern);
    if (emails) {
      metadata.emails.push(...[...new Set(emails)]);
    }

    // Поиск телефонных номеров
    const phonePattern = /(?:\+?7|8)?[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g;
    const phones = text.match(phonePattern);
    if (phones) {
      metadata.phones.push(...[...new Set(phones)]);
    }

    // Поиск ключевых слов (упрощённый алгоритм)
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      'и', 'в', 'на', 'с', 'по', 'для', 'от', 'о', 'к', 'за', 'из', 'что', 'как', 'это',
      'the', 'and', 'in', 'to', 'of', 'is', 'it', 'for', 'with', 'on', 'at', 'by'
    ]);

    const wordFrequency = {};
    words.forEach(word => {
      const cleaned = word.replace(/[^а-яёa-z]/gi, '');
      if (cleaned.length > 3 && !stopWords.has(cleaned)) {
        wordFrequency[cleaned] = (wordFrequency[cleaned] || 0) + 1;
      }
    });

    // Топ-10 ключевых слов
    metadata.keywords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    return metadata;
  }

  /**
   * Полная обработка изображения с OCR и извлечением метаданных
   * @param {string} imagePath - Путь к изображению
   * @param {Function} onProgress - Коллбэк прогресса
   * @returns {Promise<object>} Полный результат обработки
   */
  async processImage(imagePath, onProgress = () => {}) {
    // Распознавание текста
    const ocrResult = await this.recognizeText(imagePath, onProgress);
    
    if (!ocrResult.success) {
      return {
        success: false,
        error: ocrResult.error
      };
    }

    // Извлечение метаданных
    const metadata = this.extractMetadata(ocrResult.text);

    return {
      success: true,
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      words: ocrResult.words,
      metadata: metadata,
      rawMetadata: JSON.stringify(metadata)
    };
  }

  /**
   * Склеивание нескольких страниц в логический документ
   * @param {Array<string>} pagePaths - Массив путей к страницам
   * @returns {Promise<object>} Результат склеивания
   */
  async stitchPages(pagePaths) {
    const results = [];
    let fullText = '';
    let allMetadata = {
      dates: [],
      amounts: [],
      emails: [],
      phones: [],
      keywords: []
    };

    for (let i = 0; i < pagePaths.length; i++) {
      const result = await this.processImage(pagePaths[i], (progress) => {
        const overallProgress = Math.round(((i / pagePaths.length) + (progress / 100 / pagePaths.length)) * 100);
        console.log(`Обработка страницы ${i + 1}/${pagePaths.length}: ${overallProgress}%`);
      });

      if (result.success) {
        results.push({
          page: i + 1,
          text: result.text,
          metadata: result.metadata
        });

        fullText += `\n--- Страница ${i + 1} ---\n${result.text}`;

        // Объединение метаданных
        Object.keys(allMetadata).forEach(key => {
          if (result.metadata[key]) {
            allMetadata[key] = [...allMetadata[key], ...result.metadata[key]];
          }
        });
      }
    }

    // Удаление дубликатов из метаданных
    Object.keys(allMetadata).forEach(key => {
      allMetadata[key] = [...new Set(allMetadata[key])];
    });

    return {
      success: true,
      pages: results,
      fullText: fullText.trim(),
      metadata: allMetadata
    };
  }
}

// Экспорт единственного экземпляра сервиса
const ocrService = new OCRService();
export default ocrService;
