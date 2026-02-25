import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Accès non autorisé
        </h1>
        
        <p className="text-gray-600 mb-2">
          Désolé, vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </p>
        
        {user && (
          <p className="text-sm text-gray-500 mb-6">
            Votre rôle actuel : <span className="font-medium text-gray-700">{user.role}</span>
          </p>
        )}
        
        <div className="space-y-3">
          <Link
            to="/"
            className="block w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retour à l'accueil
          </Link>
          
          <Link
            to="/documents"
            className="block w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Voir mes documents
          </Link>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedPage;