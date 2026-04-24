import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import DocumentsPage from '../../pages/DocumentsPage';
import { documentsApi } from '../../services/api';

vi.mock('../../services/api');

const renderDocumentsPage = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <DocumentsPage />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('DocumentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche le titre de la page', () => {
    renderDocumentsPage();
    expect(screen.getByText('Documents')).toBeInTheDocument();
  });

  it('affiche le bouton pour ajouter un document', () => {
    renderDocumentsPage();
    const addButton = screen.getByRole('link', { name: /ajouter un document/i });
    expect(addButton).toBeInTheDocument();
    expect(addButton).toHaveAttribute('href', '/upload');
  });

  // ... autres tests
});