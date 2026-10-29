import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import type { MailMessage, Mailer } from '../../lib/mailer.js';
import { prisma } from '../../lib/prisma.js';
import { hashToken } from '../../lib/tokens.js';
import { resetDatabase } from '../../../test/helpers/database.js';

const sent: MailMessage[] = [];
const fakeMailer: Mailer = {
  send(message) {
    sent.push(message);
    return Promise.resolve();
  },
};

const app = createApp({ mailer: fakeMailer });
const body = { email: 'Ana@Example.test', password: 'password-segura', name: 'Ana' };

beforeEach(async () => {
  await resetDatabase();
  sent.length = 0;
});

describe('POST /api/v1/auth/register', () => {
  it('cria a conta com a password em argon2id', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(body);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'ana@example.test', name: 'Ana' });
    expect(res.body).not.toHaveProperty('passwordHash');

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@example.test' } });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.emailVerifiedAt).toBeNull();
  });

  it('envia o email de verificação com um token guardado só em hash', async () => {
    await request(app).post('/api/v1/auth/register').send(body);

    expect(sent).toHaveLength(1);
    const message = sent.at(0);
    expect(message?.to).toBe('ana@example.test');

    const [, token = ''] = /token=([\w-]+)/.exec(message?.text ?? '') ?? [];
    const stored = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    expect(stored).not.toBeNull();
  });

  it('recusa passwords com menos de 10 caracteres', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...body, password: 'curta' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ errors: [{ field: 'password' }] });
  });

  it('devolve 409 se o email já existir, sem distinguir maiúsculas', async () => {
    await request(app).post('/api/v1/auth/register').send(body);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...body, email: 'ana@example.test' });

    expect(res.status).toBe(409);
    expect(sent).toHaveLength(1);
  });
});
