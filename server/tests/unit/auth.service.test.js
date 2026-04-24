import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { AuthService } from '../../src/services/auth.service.js';

describe('AuthService - Unit tests', () => {
  let authService;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      get: async () => null,
      run: async () => {},
      exec: () => {},
      prepare: () => ({ run: () => {}, get: () => {} }),
    };
    authService = new AuthService(mockDb);
  });

  it('verifyAccessToken should return null for empty token', () => {
    const result = authService.verifyAccessToken('');
    assert.strictEqual(result, null);
  });

  it('generateTokens should return tokens', async () => {
    const tokens = await authService.generateTokens(1, 'test@test.com', 'user');
    assert.ok(tokens.accessToken);
    assert.ok(tokens.refreshToken);
  });
});