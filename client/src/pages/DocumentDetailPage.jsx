import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(0);
  const [editingPage, setEditingPage] = useState(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [id]);

  const loadDocument = async () => {
    try {
      const response = await documentsApi.getById(id);
      if (response.data.success) {
        setDocument(response.data.data);
      }
    } catch (err) {
      showError('Не удалось загрузить документ');
      navigate('/documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) return;

    try {
      const response = await documentsApi.delete(id);
      if (response.data.success) {
        success('Документ удалён');
        navigate('/documents');
      }
    } catch (err) {
      showError('Не удалось удалить документ');
    }
  };

  const startEditing = (page) => {
    setEditingPage(page.id);
    setEditText(page.ocrText || '');
  };

  const savePageText = async (pageId) => {
    setSaving(true);
    try {
      await documentsApi.updatePage(id, pageId, { ocrText: editText });
      success('Текст сохранён');
      setEditingPage(null);
      loadDocument();
    } catch (err) {
      showError('Не удалось сохранить текст');
    } finally {
      setSaving(false);
    }
  };

  const currentPage = document?.pages[activePage];

  if (loading) {
    return <LoadingSpinner text="Загрузка документа..." />;
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Документ не найден</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/documents')}
            className="text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад к документам
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{document.document.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>
              {new Date(document.document.createdAt).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs ${
              document.document.status === 'ready' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {document.document.status === 'ready' ? 'Готов' : 'В обработке'}
            </span>
            <span>{document.pages.length} страниц</span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="btn btn-danger"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Удалить
        </button>
      </div>

      {/* Основной контент */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Изображение страницы */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Страница {activePage + 1} из {document.pages.length}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setActivePage(Math.max(0, activePage - 1))}
                disabled={activePage === 0}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setActivePage(Math.min(document.pages.length - 1, activePage + 1))}
                disabled={activePage === document.pages.length - 1}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          
          {currentPage && (
            <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={`http://localhost:3001${currentPage.filePath}`}
                alt={`Страница ${activePage + 1}`}
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>

        {/* OCR текст */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Распознанный текст</h3>
            {currentPage && editingPage !== currentPage.id && (
              <button
                onClick={() => startEditing(currentPage)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Редактировать
              </button>
            )}
          </div>

          {currentPage ? (
            <div className="space-y-4">
              {editingPage === currentPage.id ? (
                <div className="space-y-4">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="form-input min-h-[400px] font-mono text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => savePageText(currentPage.id)}
                      disabled={saving}
                      className="btn btn-primary"
                    >
                      {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                    <button
                      onClick={() => setEditingPage(null)}
                      className="btn btn-secondary"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 min-h-[400px] max-h-[600px] overflow-auto">
                  <pre className="text-sm whitespace-pre-wrap font-sans">
                    {currentPage.ocrText || 'Текст не распознан'}
                  </pre>
                </div>
              )}

              {/* Извлечённые данные */}
              {currentPage.extractedData && Object.keys(currentPage.extractedData).length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Извлечённые данные</h4>
                  <div className="space-y-3">
                    {currentPage.extractedData.dates?.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-500">Даты: </span>
                        <span className="text-sm">{currentPage.extractedData.dates.join(', ')}</span>
                      </div>
                    )}
                    {currentPage.extractedData.amounts?.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-500">Суммы: </span>
                        <span className="text-sm">{currentPage.extractedData.amounts.join(', ')}</span>
                      </div>
                    )}
                    {currentPage.extractedData.emails?.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-500">Email: </span>
                        <span className="text-sm">{currentPage.extractedData.emails.join(', ')}</span>
                      </div>
                    )}
                    {currentPage.extractedData.phones?.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-500">Телефоны: </span>
                        <span className="text-sm">{currentPage.extractedData.phones.join(', ')}</span>
                      </div>
                    )}
                    {currentPage.extractedData.keywords?.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-500">Ключевые слова: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {currentPage.extractedData.keywords.slice(0, 10).map((keyword, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Нет данных о странице</p>
          )}
        </div>
      </div>

      {/* Миниатюры всех страниц */}
      <div className="card p-4">
        <h3 className="font-medium text-gray-900 mb-4">Все страницы</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {document.pages.map((page, index) => (
            <button
              key={page.id}
              onClick={() => setActivePage(index)}
              className={`flex-shrink-0 w-24 aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border-2 transition-all ${
                activePage === index ? 'border-primary-500 ring-2 ring-primary-200' : 'border-transparent hover:border-gray-300'
              }`}
            >
              <img
                src={`http://localhost:3001${page.filePath}`}
                alt={`Страница ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DocumentDetailPage;
