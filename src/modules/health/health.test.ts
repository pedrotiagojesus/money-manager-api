import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';

describe('GET /health', () => {
  it('devolve 200 quando a base de dados responde', async () => {
    const app = createApp({ checkDatabase: () => Promise.resolve() });

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', checks: { api: 'up', database: 'up' } });
  });

  it('devolve 503 quando a base de dados falha', async () => {
    const app = createApp({ checkDatabase: () => Promise.reject(new Error('ligação recusada')) });

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'error', checks: { database: 'down' } });
  });

  it('indica not_configured quando não há verificação da base de dados', async () => {
    const res = await request(createApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ checks: { database: 'not_configured' } });
  });
});
