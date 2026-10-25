import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /health com PostgreSQL real', () => {
  it('devolve database up', async () => {
    const app = createApp({ checkDatabase: () => prisma.$queryRaw`SELECT 1` });

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', checks: { database: 'up' } });
  });

  it('aplicou as migrações', async () => {
    const extensions = await prisma.$queryRaw<{ extname: string }[]>`
      SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'
    `;

    expect(extensions).toHaveLength(1);
  });
});
