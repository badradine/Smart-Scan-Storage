import Tesseract from 'tesseract.js';
import path from 'path';
import fs from 'fs';

/**
 * OCR Service - Service de reconnaissance de texte dans les images
 * Utilise Tesseract.js pour extraire le texte des scans de documents
 */
class OCRService {
  constructor() {
    this.workers = new Map();
  }

  /**
   * Création d'un worker Tesseract
   */
  async createWorker() {
    const worker = await Tesseract.createWorker('fra+eng'); // Français et anglais
    return worker;
  }

  /**
   * Reconnaissance de texte dans une image
   * @param {string} imagePath - Chemin de l'image
   * @returns {Promise<object>} Résultat de la reconnaissance
   */
  async recognizeText(imagePath) {
    try {
      // Vérifier l'existence du fichier
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Fichier non trouvé: ${imagePath}`);
      }

      console.log(`🔍 OCR en cours pour: ${path.basename(imagePath)}`);
      
      const worker = await this.createWorker();
      
      // ✅ CORRIGÉ : Pas de callback pour éviter l'erreur de clonage
      const result = await worker.recognize(imagePath);

      await worker.terminate();

      console.log(`✅ OCR terminé pour: ${path.basename(imagePath)}`);

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
      console.error('❌ Erreur OCR:', error.message);
      return {
        success: false,
        error: error.message,
        text: '',
        confidence: 0
      };
    }
  }

  /**
   * Extraction de métadonnées à partir du texte
   * Recherche dates, montants, emails et autres données structurées
   * @param {string} text - Texte à analyser
   * @returns {object} Métadonnées extraites
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

    // Recherche de dates (format français)
    const datePatterns = [
      /\b(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})\b/g,  // DD/MM/YYYY
      /\b(\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4})\b/gi, // français
      /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/gi // anglais
    ];

    datePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        metadata.dates.push(...matches);
      }
    });

    // Recherche de montants
    const amountPatterns = [
      /[\d\s,.]+\s*(?:€|EUR|euros?|$|USD|£|GBP)/gi,
      /(?:€|EUR|euros?|$|USD|£|GBP)\s*[\d\s,.]+\b/gi
    ];

    amountPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        const uniqueAmounts = [...new Set(matches.map(m => m.trim()))];
        metadata.amounts.push(...uniqueAmounts);
      }
    });

    // Recherche d'emails
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailPattern);
    if (emails) {
      metadata.emails.push(...[...new Set(emails)]);
    }

    // Recherche de téléphones (format français)
    const phonePattern = /(?:\+33|0)[1-9](?:\s?\d{2}){4}/g;
    const phones = text.match(phonePattern);
    if (phones) {
      metadata.phones.push(...[...new Set(phones)]);
    }

    // Recherche de mots-clés
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      'le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'dans', 'pour', 'par',
      'avec', 'sans', 'sur', 'sous', 'entre', 'mais', 'donc', 'car', 'ce', 'cet',
      'cette', 'ces', 'mon', 'ton', 'son', 'notre', 'votre', 'leur'
    ]);

    const wordFrequency = {};
    words.forEach(word => {
      const cleaned = word.replace(/[^a-zéèêëàâäôöûüç]/gi, '');
      if (cleaned.length > 3 && !stopWords.has(cleaned)) {
        wordFrequency[cleaned] = (wordFrequency[cleaned] || 0) + 1;
      }
    });

    // Top 10 mots-clés
    metadata.keywords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    return metadata;
  }

  /**
   * Traitement complet d'une image avec OCR et extraction de métadonnées
   * @param {string} imagePath - Chemin de l'image
   * @returns {Promise<object>} Résultat complet
   */
  async processImage(imagePath) {
    console.log(`📷 Traitement OCR de: ${path.basename(imagePath)}`);
    
    // Reconnaissance du texte
    const ocrResult = await this.recognizeText(imagePath);
    
    if (!ocrResult.success) {
      return {
        success: false,
        error: ocrResult.error
      };
    }

    // Extraction des métadonnées
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
   * Assemblage de plusieurs pages en un document logique
   * @param {Array<string>} pagePaths - Tableau des chemins de pages
   * @returns {Promise<object>} Résultat de l'assemblage
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
      console.log(`📄 Traitement page ${i + 1}/${pagePaths.length}`);
      
      const result = await this.processImage(pagePaths[i]);

      if (result.success) {
        results.push({
          page: i + 1,
          text: result.text,
          metadata: result.metadata
        });

        fullText += `\n--- Page ${i + 1} ---\n${result.text}`;

        // Fusion des métadonnées
        Object.keys(allMetadata).forEach(key => {
          if (result.metadata[key]) {
            allMetadata[key] = [...allMetadata[key], ...result.metadata[key]];
          }
        });
      }
    }

    // Suppression des doublons
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

// Export de l'instance unique
const ocrService = new OCRService();
export default ocrService;