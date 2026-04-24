import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../../src/index.js';

describe('SEO Routes Integration', () => {
  let server;

  before(async () => {
    server = app.listen(3022);
  });

  after(async () => {
    server.close();
  });

  it('GET /robots.txt should return 200', async () => {
    const response = await request(server).get('/robots.txt');
    assert.strictEqual(response.status, 200);
    assert.ok(response.text.includes('User-agent'));
  });

  it('GET /sitemap.xml should return 200', async () => {
    const response = await request(server).get('/sitemap.xml');
    assert.strictEqual(response.status, 200);
    assert.ok(response.text.includes('urlset'));
  });
});