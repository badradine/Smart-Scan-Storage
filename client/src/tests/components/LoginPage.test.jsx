import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import LoginPage from '../../pages/LoginPage';

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <LoginPage />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('LoginPage', () => {
  it('should display login form', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
  });

  it('should have link to register', () => {
    renderLoginPage();
    const link = screen.getByRole('link', { name: /s'inscrire/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/register');
  });

  it('should allow entering email', async () => {
    renderLoginPage();
    const input = screen.getByLabelText(/email/i);
    await userEvent.type(input, 'test@test.com');
    expect(input).toHaveValue('test@test.com');
  });

  it('should allow entering password', async () => {
    renderLoginPage();
    const input = screen.getByLabelText(/mot de passe/i);
    await userEvent.type(input, 'password123');
    expect(input).toHaveValue('password123');
  });
});