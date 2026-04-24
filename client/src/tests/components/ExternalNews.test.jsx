import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import ExternalNews from '../../components/ExternalNews';

vi.mock('axios');

describe('ExternalNews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state', () => {
    axios.get.mockImplementation(() => new Promise(() => {}));
    render(<ExternalNews keyword="test" />);
    // Le composant affiche une div avec animate-pulse, pas de texte spécifique
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should display news after loading', async () => {
    const mockNews = [{
      title: 'Test Title',
      description: 'Test Description',
      url: '#',
      urlToImage: null,
      publishedAt: new Date().toISOString(),
      source: { name: 'Test Source' }
    }];
    
    axios.get.mockResolvedValue({
      data: { success: true, data: mockNews, source: 'Mock' }
    });
    
    render(<ExternalNews keyword="test" />);
    await waitFor(() => {
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });
  });
});