import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';

describe('GET /openapi.json', () => {
  it('devolve o documento OpenAPI com a rota /health', async () => {
    const res = await request(createApp()).get('/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      openapi: '3.1.0',
      info: { title: 'Money Manager API' },
      paths: { '/health': { get: { tags: ['Sistema'] } } },
      components: { schemas: { HealthResponse: { type: 'object' } } },
    });
  });
});
