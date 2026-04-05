import axios from 'axios';

class ExternalApiService {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000;
    
    const hasApiKey = process.env.NEWS_API_KEY && process.env.NEWS_API_KEY !== '';
    
    if (!hasApiKey) {
      console.log('🔧 Mode mock activé (pas de clé API)');
      this.mockMode = true;
      return;
    }
    
    this.mockMode = false;
    this.newsClient = axios.create({
      baseURL: process.env.NEWS_API_URL || 'https://newsapi.org/v2',
      timeout: 5000,
      params: {
        apiKey: process.env.NEWS_API_KEY,
        language: 'fr',
        pageSize: 6,
      },
    });
  }

  async withRetry(fn, retries = this.maxRetries) {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        console.log(`Retry... ${retries} tentatives restantes`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.withRetry(fn, retries - 1);
      }
      throw error;
    }
  }

  async getNewsByKeyword(keyword = 'document numerique') {
    if (this.mockMode) {
      console.log('📰 Mode mock - retour des données factices');
      return this.getMockNews();
    }
    
    try {
      const response = await this.withRetry(async () => {
        return await this.newsClient.get('/everything', {
          params: {
            q: keyword,
            sortBy: 'publishedAt',
          },
        });
      });
      return response.data.articles || [];
    } catch (error) {
      console.error('Erreur API externe:', error.message);
      return this.getMockNews();
    }
  }

  async getTechNews() {
    if (this.mockMode) {
      console.log('📰 Mode mock - retour des données factices');
      return this.getMockNews();
    }
    
    try {
      const response = await this.withRetry(async () => {
        return await this.newsClient.get('/top-headlines', {
          params: {
            category: 'technology',
            country: 'fr',
          },
        });
      });
      return response.data.articles || [];
    } catch (error) {
      console.error('Erreur API tech:', error.message);
      return this.getMockNews();
    }
  }

  getMockNews() {
    return [
      {
        title: 'La gestion documentaire numérique en pleine expansion',
        description: 'Les entreprises adoptent massivement les solutions de gestion documentaire numérique.',
        url: '#',
        urlToImage: null,
        publishedAt: new Date().toISOString(),
        source: { name: 'Tech News' }
      },
      {
        title: "L'OCR révolutionne la numérisation des documents",
        description: 'Les technologies d\'OCR permettent une reconnaissance de texte quasi parfaite.',
        url: '#',
        urlToImage: null,
        publishedAt: new Date().toISOString(),
        source: { name: 'Digital Trends' }
      },
      {
        title: 'Sécurité des documents : les bonnes pratiques',
        description: 'Comment protéger efficacement vos documents sensibles.',
        url: '#',
        urlToImage: null,
        publishedAt: new Date().toISOString(),
        source: { name: 'Security Mag' }
      }
    ];
  }
}

export default new ExternalApiService();