import { describe, it } from 'node:test';
import assert from 'node:assert';
import externalService from '../../src/services/external.service.js';

describe('ExternalApiService - Unit tests', () => {
  it('getMockNews should return 3 articles', () => {
    const news = externalService.getMockNews();
    assert.strictEqual(news.length, 3);
  });

  it('each mock article should have title and description', () => {
    const news = externalService.getMockNews();
    for (const article of news) {
      assert.ok(article.title);
      assert.ok(article.description);
    }
  });
});