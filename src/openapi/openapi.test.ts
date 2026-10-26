import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { readFileSync } from 'node:fs';
import { openApiDocument } from './document.js';

describe('documentação da API', () => {
  it('devolve o documento OpenAPI com a rota /health', async () => {
    const res = await request(createApp({ docs: true })).get('/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      openapi: '3.1.0',
      info: { title: 'Money Manager API' },
      paths: { '/health': { get: { tags: ['Sistema'] } } },
      components: { schemas: { HealthResponse: { type: 'object' } } },
    });
  });

  it('serve o Swagger UI em /docs', async () => {
    const res = await request(createApp({ docs: true })).get('/docs/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Money Manager API');
  });

  it('não expõe a documentação quando está desligada', async () => {
    const app = createApp({ docs: false });

    expect((await request(app).get('/docs/')).status).toBe(404);
    expect((await request(app).get('/openapi.json')).status).toBe(404);
  });
});

it('openapi.json no repositório corresponde ao código', () => {
  const exported: unknown = JSON.parse(readFileSync('openapi.json', 'utf8'));

  expect(exported, 'Corre "npm run openapi:export" e faz commit do openapi.json').toEqual(
    openApiDocument,
  );
});
