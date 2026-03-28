import { useState, useEffect } from 'react';

function DocumentFilters({ filters, onFilterChange }) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const categories = [
    { value: '', label: 'Toutes catégories' },
    { value: 'general', label: 'Général' },
    { value: 'invoice', label: 'Facture' },
    { value: 'contract', label: 'Contrat' },
    { value: 'report', label: 'Rapport' }
  ];

  const statuses = [
    { value: '', label: 'Tous statuts' },
    { value: 'ready', label: 'Prêts' },
    { value: 'processing', label: 'En traitement' }
  ];

  const sortOptions = [
    { value: 'created_at', label: 'Date de création' },
    { value: 'title', label: 'Titre' },
    { value: 'updated_at', label: 'Date de modification' }
  ];

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onFilterChange(localFilters);
  };

  const resetFilters = () => {
    const emptyFilters = {
      search: '',
      status: '',
      category: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'created_at',
      sortOrder: 'DESC'
    };
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  return (
    <div className="card p-4 space-y-4">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={localFilters.search || ''}
              onChange={(e) => handleChange('search', e.target.value)}
              placeholder="Rechercher par titre ou description..."
              className="form-input pl-10"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" 
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button type="submit" className="btn btn-primary">
            Rechercher
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mt-4">
          <select
            value={localFilters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="form-input w-40"
          >
            {statuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={localFilters.category || ''}
            onChange={(e) => handleChange('category', e.target.value)}
            className="form-input w-40"
          >
            {categories.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            {showAdvanced ? 'Masquer filtres avancés' : 'Filtres avancés'}
          </button>
        </div>

        {showAdvanced && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Date de début</label>
                <input
                  type="date"
                  value={localFilters.dateFrom || ''}
                  onChange={(e) => handleChange('dateFrom', e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Date de fin</label>
                <input
                  type="date"
                  value={localFilters.dateTo || ''}
                  onChange={(e) => handleChange('dateTo', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Trier par</label>
                <select
                  value={localFilters.sortBy || 'created_at'}
                  onChange={(e) => handleChange('sortBy', e.target.value)}
                  className="form-input"
                >
                  {sortOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Ordre</label>
                <select
                  value={localFilters.sortOrder || 'DESC'}
                  onChange={(e) => handleChange('sortOrder', e.target.value)}
                  className="form-input"
                >
                  <option value="DESC">Décroissant</option>
                  <option value="ASC">Croissant</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={resetFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Réinitialiser les filtres
          </button>
        </div>
      </form>
    </div>
  );
}

export default DocumentFilters;