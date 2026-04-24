import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../../src/index.js';

describe('Auth API', () => {
  let server;

  before(async () => {
    server = app.listen(3023);
  });

  after(async () => {
    server.close();
  });

  it('POST /api/auth/login - email manquant retourne 400', async () => {
    const response = await request(server)
      .post('/api/auth/login')
      .send({ password: 'test' });
    assert.strictEqual(response.status, 400);
  });

  it('POST /api/auth/login - identifiants invalides retourne 401', async () => {
    const response = await request(server)
      .post('/api/auth/login')
      .send({ email: 'fake@test.com', password: 'fake' });
    assert.strictEqual(response.status, 401);
  });

  it('GET /api/health retourne 200', async () => {
    const response = await request(server).get('/api/health');
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.status, 'ok');
  });
});