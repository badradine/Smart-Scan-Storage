import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsApi } from '../services/api';
import { useToast } from '../context/ToastContext';

function UploadPage() {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [description, setDescription] = useState('');

  const { success, error: showError } = useToast();
  const navigate = useNavigate();

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
      ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp', 'image/webp', 'application/pdf'].includes(file.type) ||
      file.name.toLowerCase().endsWith('.pdf') ||
      file.name.toLowerCase().endsWith('.doc') ||
      file.name.toLowerCase().endsWith('.docx')
    );

    if (droppedFiles.length === 0) {
      showError('Veuillez uploader des images, PDF ou documents Word');
      return;
    }

    setFiles(prev => [...prev, ...droppedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }))]);
  }, [showError]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    setFiles(prev => [...prev, ...selectedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }))]);
  };

  const removeFile = (id) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (files.length === 0) {
      showError('Veuillez sélectionner des fichiers à uploader');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach(({ file }) => formData.append('files', file));
      formData.append('title', title || `Document du ${new Date().toLocaleDateString('fr-FR')}`);
      formData.append('category', category);
      formData.append('description', description);

      const response = await documentsApi.create(formData);

      if (response.data.success) {
        success(`${response.data.data.pagesProcessed} page(s) uploadée(s) avec succès`);
        navigate('/documents');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Erreur lors de l\'upload des documents');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file) => {
    if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
      return (
        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .8-.7 1.5-1.5 1.5H8v-4h2c.8 0 1.5.7 1.5 1.5v1zM18 14h-6.5v-1.5H18V14zm0-3h-6.5V9.5H18V11zm0-3h-6.5V6.5H18V8z"/>
        </svg>
      );
    } else if (file.type.includes('word') || file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
      return (
        <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 18H6V4h7v5h5v11z"/>
        </svg>
      );
    } else {
      return (
        <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Uploader des documents</h1>
        <p className="text-gray-500 mt-1">Uploadez des scans pour traitement OCR automatique</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Zone de drop */}
        <div
          className={`dropzone ${dragActive ? 'active' : ''} ${uploading ? 'opacity-50' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="fileInput"
            multiple
            accept="image/jpeg,image/png,image/tiff,image/bmp,image/webp,application/pdf,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">
              Glissez-déposez vos fichiers ici ou cliquez pour sélectionner
            </p>
            <p className="text-sm text-gray-500">
              Formats supportés : JPEG, PNG, TIFF, BMP, WebP, PDF, DOC, DOCX (max. 50MB/fichier)
            </p>
            <label
              htmlFor="fileInput"
              className="btn btn-primary mt-4 cursor-pointer"
            >
              Choisir des fichiers
            </label>
          </div>
        </div>

        {/* Liste des fichiers */}
        {files.length > 0 && (
          <div className="card p-4">
            <h3 className="font-medium text-gray-900 mb-4">
              Fichiers sélectionnés : {files.length}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {files.map(({ id, file, preview }) => (
                <div key={id} className="relative group">
                  <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    {preview ? (
                      <img
                        src={preview}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        {getFileIcon(file)}
                      </div>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => removeFile(id)}
                      className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                      disabled={uploading}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Métadonnées */}
        <div className="card p-6 space-y-4">
          <h3 className="font-medium text-gray-900">Informations du document</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="title" className="form-label">Titre</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
                placeholder="Titre du document..."
                disabled={uploading}
              />
            </div>
            
            <div>
              <label htmlFor="category" className="form-label">Catégorie</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-input"
                disabled={uploading}
              >
                <option value="general">Général</option>
                <option value="invoice">Facture</option>
                <option value="contract">Contrat</option>
                <option value="report">Rapport</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input min-h-[100px]"
              placeholder="Informations complémentaires sur le document..."
              disabled={uploading}
            />
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={uploading || files.length === 0}
            className="btn btn-primary flex-1"
          >
            {uploading ? (
              <>
                <div className="loading-spinner w-5 h-5"></div>
                Upload et traitement en cours...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Uploader et traiter
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
            disabled={uploading}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

export default UploadPage;