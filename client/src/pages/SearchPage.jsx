import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { searchApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    category: '',
    hasDate: false,
    hasAmount: false,
    dateFrom: '',
    dateTo: ''
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const { error: showError } = useToast();

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (query.length >= 2 || filters.hasDate || filters.hasAmount) {
        performSearch();
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [query, filters, pagination.page]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const response = await searchApi.search({
        q: query,
        type: filters.type,
        category: filters.category,
        hasDate: filters.hasDate,
        hasAmount: filters.hasAmount,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        page: pagination.page,
        limit: 20
      });

      if (response.data.success) {
        setResults(response.data.data.results);
        setPagination(response.data.data.pagination);
      }
    } catch (err) {
      showError('Erreur de recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    performSearch();
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      category: '',
      hasDate: false,
      hasAmount: false,
      dateFrom: '',
      dateTo: ''
    });
    setQuery('');
    setResults([]);
  };

  const getCategoryLabel = (category) => {
    const categories = {
      'general': 'Général',
      'invoice': 'Facture',
      'contract': 'Contrat',
      'report': 'Rapport'
    };
    return categories[category] || category;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recherche de documents</h1>
        <p className="text-gray-500 mt-1">Recherchez par texte, dates, montants et noms dans vos documents</p>
      </div>

      {/* Barre de recherche */}
      <form onSubmit={handleSearch} className="card p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Entrez votre recherche..."
              className="form-input pl-12"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button type="submit" className="btn btn-primary">
            Rechercher
          </button>
        </div>
      </form>

      {/* Filtres avancés */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="form-input w-40"
          >
            <option value="all">Partout</option>
            <option value="document">Dans les titres</option>
            <option value="content">Dans le contenu</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="form-input w-40"
          >
            <option value="">Toutes catégories</option>
            <option value="general">Général</option>
            <option value="invoice">Facture</option>
            <option value="contract">Contrat</option>
            <option value="report">Rapport</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.hasDate}
              onChange={(e) => setFilters({ ...filters, hasDate: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Avec dates</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.hasAmount}
              onChange={(e) => setFilters({ ...filters, hasAmount: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Avec montants</span>
          </label>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="form-input w-40"
              placeholder="JJ/MM/AAAA"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="form-input w-40"
              placeholder="JJ/MM/AAAA"
            />
          </div>

          {(query || filters.type !== 'all' || filters.category || filters.hasDate || filters.hasAmount || filters.dateFrom || filters.dateTo) && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* Résultats */}
      {loading ? (
        <LoadingSpinner text="Recherche en cours..." />
      ) : results.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {query ? 'Aucun résultat trouvé' : 'Commencez votre recherche'}
          </h3>
          <p className="text-gray-500">
            {query 
              ? 'Essayez de modifier votre recherche ou de réinitialiser les filtres'
              : 'Entrez un texte, une date ou un montant pour rechercher dans vos documents'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {pagination.total} résultat{pagination.total > 1 ? 's' : ''} trouvé{pagination.total > 1 ? 's' : ''}
          </p>

          {results.map((doc) => (
            <div key={doc.id} className="card p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/documents/${doc.id}`}
                    className="text-lg font-medium text-gray-900 hover:text-primary-600"
                  >
                    {doc.title}
                  </Link>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span>
                      {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                      {getCategoryLabel(doc.category)}
                    </span>
                    <span>{doc.totalPages} {doc.totalPages > 1 ? 'pages' : 'page'}</span>
                  </div>

                  {/* Surlignage des correspondances */}
                  {doc.matchedPages?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {doc.matchedPages.slice(0, 2).map((page, i) => (
                        <div key={i} className="text-sm bg-yellow-50 p-2 rounded border border-yellow-100">
                          <span className="text-xs text-yellow-600 font-medium">
                            Page {page.pageOrder} :
                          </span>
                          <p className="text-gray-700 mt-1 line-clamp-2">
                            ...{page.highlights[0]}...
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tags et métadonnées */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {doc.tags?.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="btn btn-secondary disabled:opacity-50"
              >
                Précédent
              </button>
              <span className="text-gray-600">
                Page {pagination.page} sur {pagination.pages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="btn btn-secondary disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchPage;