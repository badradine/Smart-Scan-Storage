import { useState, useEffect } from 'react';
import axios from 'axios';

const ExternalNews = ({ keyword = 'document' }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('');

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await axios.get(`http://localhost:3001/api/external/news?keyword=${keyword}`);
        
        if (response.data.success) {
          setNews(response.data.data);
          setSource(response.data.source || 'API');
        } else {
          setNews(response.data.data || []);
          setError('Service momentanément indisponible');
        }
      } catch (err) {
        console.error('Erreur chargement actualités:', err);
        setError('Impossible de charger les actualités');
        setNews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [keyword]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-20 h-20 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && news.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p>Actualités temporairement indisponibles</p>
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">📰 Actualités Tech</h3>
        {source && source !== 'NewsAPI' && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            Mode dégradé
          </span>
        )}
      </div>
      
      {error && (
        <div className="bg-yellow-50 text-yellow-700 p-3 rounded mb-4 text-sm">
          ⚠️ {error} - Affichage des données de secours
        </div>
      )}
      
      <div className="space-y-4">
        {news.slice(0, 5).map((article, index) => (
          <a
            key={index}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:bg-gray-50 p-3 rounded-lg transition-colors group"
          >
            <div className="flex gap-3">
              {article.urlToImage && article.urlToImage !== '#' && (
                <img
                  src={article.urlToImage}
                  alt={article.title}
                  loading="lazy"
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
                  {article.title}
                </h4>
                <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                  {article.description}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-400">
                    {article.source.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(article.publishedAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default ExternalNews;