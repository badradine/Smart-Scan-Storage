import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { usePermissions } from './hooks/usePermissions';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import UploadPage from './pages/UploadPage';
import SearchPage from './pages/SearchPage';
import AdminPage from './pages/AdminPage'; // ← À créer si nécessaire
import UnauthorizedPage from './pages/UnauthorizedPage'; // ← À créer
import LoadingSpinner from './components/LoadingSpinner';

// Composant pour protéger les routes selon les rôles
const ProtectedRoute = ({ children, requiredPermissions = [], requiredRoles = [] }) => {
  const { isAuthenticated, loading } = useAuth();
  const { hasAllPermissions, hasRole } = usePermissions();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Vérifier les rôles requis
  if (requiredRoles.length > 0 && !requiredRoles.some(role => hasRole(role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Vérifier les permissions requises
  if (requiredPermissions.length > 0 && !hasAllPermissions(requiredPermissions)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Composant pour les routes publiques (redirige si déjà connecté)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return isAuthenticated ? <Navigate to="/" replace /> : children;
};

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Routes>
      {/* Routes publiques */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Routes protégées (authentification requise) */}
      <Route element={<Layout />}>
        {/* Dashboard - accessible à tous les utilisateurs connectés */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />

        {/* Documents - tous les utilisateurs connectés */}
        <Route 
          path="/documents" 
          element={
            <ProtectedRoute>
              <DocumentsPage />
            </ProtectedRoute>
          } 
        />

        {/* Détail document - tous les utilisateurs connectés */}
        <Route 
          path="/documents/:id" 
          element={
            <ProtectedRoute>
              <DocumentDetailPage />
            </ProtectedRoute>
          } 
        />

        {/* Upload - tous les utilisateurs connectés (avec permission create) */}
        <Route 
          path="/upload" 
          element={
            <ProtectedRoute requiredPermissions={['documents:create']}>
              <UploadPage />
            </ProtectedRoute>
          } 
        />

        {/* Recherche - tous les utilisateurs connectés */}
        <Route 
          path="/search" 
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          } 
        />

        {/* Routes ADMIN uniquement */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute 
              requiredRoles={['admin']}
              requiredPermissions={['admin:access']}
            >
              <AdminPage />
            </ProtectedRoute>
          } 
        />

        {/* Statistiques - admin et manager seulement */}
        <Route 
          path="/stats" 
          element={
            <ProtectedRoute 
              requiredRoles={['admin', 'manager']}
              requiredPermissions={['stats:view']}
            >
              <div>Page des statistiques (à créer)</div>
            </ProtectedRoute>
          } 
        />

        {/* Tous les documents (vue manager/admin) */}
        <Route 
          path="/documents/all" 
          element={
            <ProtectedRoute 
              requiredPermissions={['documents:view_all']}
            >
              <DocumentsPage showAllDocuments={true} />
            </ProtectedRoute>
          } 
        />

        {/* Gestion des utilisateurs (admin seulement) */}
        <Route 
          path="/admin/users" 
          element={
            <ProtectedRoute 
              requiredRoles={['admin']}
              requiredPermissions={['users:manage']}
            >
              <div>Gestion des utilisateurs (à créer)</div>
            </ProtectedRoute>
          } 
        />
      </Route>

      {/* Route 404 - redirige vers accueil si connecté, sinon vers login */}
      <Route 
        path="*" 
        element={
          isAuthenticated ? 
            <Navigate to="/" replace /> : 
            <Navigate to="/login" replace />
        } 
      />
    </Routes>
  );
}

export default App;