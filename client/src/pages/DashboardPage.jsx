import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { documentsApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalDocuments: 0,
    processingDocuments: 0,
    completedDocuments: 0
  });
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [docsResponse] = await Promise.all([
        documentsApi.getAll({ limit: 5 })
      ]);

      if (docsResponse.data.success) {
        const documents = docsResponse.data.data.documents;
        setRecentDocuments(documents);

        setStats({
          totalDocuments: docsResponse.data.data.pagination.total,
          processingDocuments: documents.filter(d => d.status === 'processing').length,
          completedDocuments: documents.filter(d => d.status === 'ready').length
        });
      }
    } catch (error) {
      console.error('Erreur chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Chargement de votre espace..." />;
  }

  const statCards = [
    {
      title: 'Total documents',
      value: stats.totalDocuments,
      icon: DocumentStatsIcon,
      color: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-50'
    },
    {
      title: 'Documents traités',
      value: stats.completedDocuments,
      icon: CheckIcon,
      color: 'from-green-500 to-emerald-500',
      bg: 'bg-green-50'
    },
    {
      title: 'En traitement',
      value: stats.processingDocuments,
      icon: ProcessingIcon,
      color: 'from-yellow-500 to-orange-500',
      bg: 'bg-yellow-50'
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 md:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Bonjour, {user?.name || user?.email?.split('@')[0]} ! 👋
          </h1>
          <p className="text-indigo-100 text-lg max-w-2xl">
            Gérez vos documents avec la recherche intelligente et l'OCR. Téléversez, organisez et retrouvez vos documents en un clin d'œil.
          </p>
        </div>
        <div className="absolute right-0 top-0 opacity-10">
          <svg className="w-64 h-64 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 4h16v16H4z" />
          </svg>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="card p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 ${card.bg} rounded-2xl flex items-center justify-center`}>
                <card.icon className="w-7 h-7 text-gray-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/upload" className="group">
          <div className="card p-6 hover:shadow-xl transition-all duration-300 group-hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Téléverser des documents</h3>
                <p className="text-gray-500">Ajoutez des scans pour traitement automatique</p>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/search" className="group">
          <div className="card p-6 hover:shadow-xl transition-all duration-300 group-hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Rechercher des documents</h3>
                <p className="text-gray-500">Trouvez un document par son contenu</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Documents récents */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Documents récents</h2>
          <Link to="/documents" className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            Voir tout
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {recentDocuments.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun document pour le moment</h3>
            <p className="text-gray-500 mb-4">Téléversez votre premier document pour commencer</p>
            <Link to="/upload" className="btn-primary inline-flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Téléverser un document
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentDocuments.map((doc, idx) => (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                className="group animate-fadeIn"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="card p-5 hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                      {doc.status === 'processing' ? (
                        <div className="loading-spinner w-6 h-6"></div>
                      ) : (
                        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {doc.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className={`badge ${
                          doc.status === 'ready' 
                            ? 'badge-success' 
                            : 'badge-warning'
                        }`}>
                          {doc.status === 'ready' ? 'Prêt' : 'Traitement'}
                        </span>
                        {doc.pages && doc.pages.length > 0 && (
                          <span className="text-xs text-gray-400">
                            {doc.pages.length} {doc.pages.length > 1 ? 'pages' : 'page'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Icônes
function DocumentStatsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ProcessingIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

export default DashboardPage;