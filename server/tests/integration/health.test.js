import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../../src/index.js';

describe('Health Check Integration', () => {
  let server;

  before(async () => {
    server = app.listen(3021);
  });

  after(async () => {
    server.close();
  });

  it('GET /api/health should return 200 and status ok', async () => {
    const response = await request(server).get('/api/health');
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.status, 'ok');
  });
});