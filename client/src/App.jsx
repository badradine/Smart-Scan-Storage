import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import UploadPage from './pages/UploadPage';
import SearchPage from './pages/SearchPage';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const { isAuthenticated, loading, user } = useAuth();

  console.log('🔍 [App] isAuthenticated:', isAuthenticated);
  console.log('🔍 [App] user:', user);
  console.log('🔍 [App] loading:', loading);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Routes>
      {/* Routes publiques */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />
      
      {/* Routes protégées */}
      <Route element={<Layout />}>
        <Route path="/" element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />} />
        <Route path="/documents" element={isAuthenticated ? <DocumentsPage /> : <Navigate to="/login" replace />} />
        <Route path="/documents/:id" element={isAuthenticated ? <DocumentDetailPage /> : <Navigate to="/login" replace />} />
        <Route path="/upload" element={isAuthenticated ? <UploadPage /> : <Navigate to="/login" replace />} />
        <Route path="/search" element={isAuthenticated ? <SearchPage /> : <Navigate to="/login" replace />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;