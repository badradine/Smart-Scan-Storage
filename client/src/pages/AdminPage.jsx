import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

function AdminPage() {
  const { user } = useAuth();
  const { isAdmin, hasPermission } = usePermissions();

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Panneau d'administration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-2">Utilisateurs</h2>
          <p className="text-gray-500">Gérer les comptes utilisateurs</p>
          {hasPermission('users:manage') && (
            <button className="mt-4 btn btn-primary">Gérer</button>
          )}
        </div>
        
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-2">Statistiques</h2>
          <p className="text-gray-500">Voir les statistiques système</p>
          {hasPermission('stats:view') && (
            <button className="mt-4 btn btn-primary">Voir</button>
          )}
        </div>
        
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-2">Configuration</h2>
          <p className="text-gray-500">Paramètres de l'application</p>
          {isAdmin && (
            <button className="mt-4 btn btn-primary">Configurer</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPage;