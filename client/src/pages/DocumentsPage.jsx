import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { documentsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', category: '', search: '' });
  const [viewMode, setViewMode] = useState('grid');

  const { error: showError, success: showSuccess } = useToast();

  useEffect(() => {
    loadDocuments();
  }, [filters.status, filters.category, filters.search, pagination.page]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await documentsApi.getAll({
        page: pagination.page,
        limit: 12,
        status: filters.status,
        category: filters.category,
        search: filters.search
      });

      if (response.data.success) {
        setDocuments(response.data.data.documents);
        setPagination(response.data.data.pagination);
      }
    } catch (err) {
      showError('Impossible de charger les documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    // ✅ Message de confirmation en français
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      return;
    }

    try {
      const response = await documentsApi.delete(id);
      
      if (response.data && response.data.success) {
        // ✅ Message de succès en français
        showSuccess('Document supprimé avec succès');
        
        // Suppression immédiate
        setDocuments(prevDocuments => 
          prevDocuments.filter(doc => doc.id !== id)
        );
        
        // Mise à jour de la pagination
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1,
          pages: Math.ceil((prev.total - 1) / 12)
        }));

        // Si dernier document de la page
        if (documents.length === 1 && pagination.page > 1) {
          setPagination(prev => ({ ...prev, page: prev.page - 1 }));
        }
      } else {
        showError('Impossible de supprimer le document');
      }
    } catch (err) {
      console.error('Erreur suppression:', err);
      showError('Impossible de supprimer le document. Vérifiez votre connexion.');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadDocuments();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
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
    <div className="space-y-6">
      {/* En-tête et actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <Link to="/upload" className="btn btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Uploader un document
        </Link>
      </div>

      {/* Filtres */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher par titre..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="form-input pl-10"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </form>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="form-input w-full md:w-40"
          >
            <option value="">Tous les statuts</option>
            <option value="ready">Prêts</option>
            <option value="processing">En traitement</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="form-input w-full md:w-40"
          >
            <option value="">Toutes catégories</option>
            <option value="general">Général</option>
            <option value="invoice">Facture</option>
            <option value="contract">Contrat</option>
            <option value="report">Rapport</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'}`}
              title="Vue en grille"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'}`}
              title="Vue en liste"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Liste des documents */}
      {loading ? (
        <LoadingSpinner text="Chargement des documents..." />
      ) : documents.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun document trouvé</h3>
          <p className="text-gray-500 mb-4">
            {filters.search || filters.status || filters.category 
              ? 'Essayez de modifier les filtres'
              : 'Uploadez votre premier document'}
          </p>
          <Link to="/upload" className="btn btn-primary">
            Uploader un document
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="card p-4 hover:shadow-lg transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <Link
                  to={`/documents/${doc.id}`}
                  className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0"
                >
                  {doc.status === 'processing' ? (
                    <div className="loading-spinner w-5 h-5"></div>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </Link>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    title="Supprimer le document"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <Link to={`/documents/${doc.id}`}>
                <h3 className="font-medium text-gray-900 truncate mb-1">{doc.title}</h3>
                <p className="text-sm text-gray-500 mb-2">
                  {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    doc.status === 'ready' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {doc.status === 'ready' ? 'Prêt' : 'Traitement'}
                  </span>
                  {doc.pages && doc.pages.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {doc.pages.length} {doc.pages.length > 1 ? 'pages' : 'page'}
                    </span>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Document</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Date</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Statut</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Pages</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link to={`/documents/${doc.id}`} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        {doc.status === 'processing' ? (
                          <div className="loading-spinner w-5 h-5"></div>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{doc.title}</span>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      doc.status === 'ready' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {doc.status === 'ready' ? 'Prêt' : 'Traitement'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {doc.pages?.length || 0} {doc.pages?.length > 1 ? 'pages' : 'page'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-500 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Précédent
          </button>
          <span className="text-gray-600">
            Page {pagination.page} sur {pagination.pages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}

export default DocumentsPage;