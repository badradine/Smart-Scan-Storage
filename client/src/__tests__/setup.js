import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock complet de react-helmet-async
vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }) => children,
  HelmetProvider: ({ children }) => children,
  useHelmet: () => ({ helmetInstances: { add: vi.fn(), remove: vi.fn() } }),
}));

// Mock de window.matchMedia pour les tests
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: () => {},
    removeListener: () => {},
  };
};

// Mock de localStorage pour les tests
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });