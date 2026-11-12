import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import type { MailMessage, Mailer } from '../../lib/mailer.js';
import { prisma } from '../../lib/prisma.js';
import { hashToken } from '../../lib/tokens.js';
import { resetDatabase } from '../../../test/helpers/database.js';
import { createUser } from '../../../test/factories/index.js';
import { hashPassword } from '../../lib/password.js';
import { verifyAccessToken } from '../../lib/jwt.js';
import { loginResponseSchema } from './auth.schemas.js';

const sent: MailMessage[] = [];
const fakeMailer: Mailer = {
  send(message) {
    sent.push(message);
    return Promise.resolve();
  },
};

const app = createApp({ mailer: fakeMailer });
const body = { email: 'Ana@Example.test', password: 'password-segura', name: 'Ana' };

const email = 'ana@example.test';
const password = 'a-password-que-vais-usar';

const registerAndGetToken = async () => {
  await request(app).post('/api/v1/auth/register').send(body);
  const message = sent.at(0);
  const [, token = ''] = /token=([\w-]+)/.exec(message?.text ?? '') ?? [];
  return token;
};

const createVerifiedUser = async (
  email: string,
  password: string,
  emailVerifiedAt: Date | null,
) => {
  return await createUser({
    email,
    passwordHash: await hashPassword(password),
    emailVerifiedAt,
  });
};

const loginUser = async (email: string, password: string) => {
  await createVerifiedUser(email, password, new Date());
  return await request(app).post('/api/v1/auth/login').send({
    email,
    password,
  });
};

const findRefreshTokenCookie = (cookie: string[] | undefined) => {
  return cookie?.find((c) => c.startsWith('refresh_token='));
};

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

describe('POST /api/v1/auth/verify-email', () => {
  it('verifica o email com um token válido', async () => {
    const token = await registerAndGetToken();

    const res = await request(app).post('/api/v1/auth/verify-email').send({ token });

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@example.test' } });
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(res.status).toBe(204);
  });

  it('verifica email com um token utilizado 2 vezes', async () => {
    const token = await registerAndGetToken();

    const first = await request(app).post('/api/v1/auth/verify-email').send({ token });
    expect(first.status).toBe(204);

    const second = await request(app).post('/api/v1/auth/verify-email').send({ token });
    expect(second.status).toBe(400);
  });

  it('recusa um token que não existe', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'invalid-token' });
    expect(res.status).toBe(400);
  });

  it('recusa um token expirado', async () => {
    const token = await registerAndGetToken();

    await prisma.emailVerificationToken.update({
      where: { tokenHash: hashToken(token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app).post('/api/v1/auth/verify-email').send({ token });
    expect(res.status).toBe(400);
  });

  it('recusa um pedido sem token', async () => {
    const res = await request(app).post('/api/v1/auth/verify-email').send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('entra com email e password certos', async () => {
    await createVerifiedUser(email, password, new Date());
    const res = await request(app).post('/api/v1/auth/login').send({
      email,
      password,
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 900,
    });
    expect(res.body).toHaveProperty('accessToken');
  });

  it('recusa uma password errada', async () => {
    await createVerifiedUser(email, password, new Date());
    const res = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'wrong-password',
    });
    expect(res.status).toBe(401);
  });

  it('recusa um email que não existe', async () => {
    await createVerifiedUser(email, password, new Date());
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'wrong-email@example.test',
      password,
    });
    expect(res.status).toBe(401);
  });

  it('responde igual a email inexistente e a password errada', async () => {
    await createVerifiedUser(email, password, new Date());
    const unknownEmail = await request(app).post('/api/v1/auth/login').send({
      email: 'wrong-email@example.test',
      password,
    });

    const wrongPassword = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'wrong-password',
    });

    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.body).toMatchObject({ detail: 'Email ou password incorretos' });
    expect(wrongPassword.body).toMatchObject({ detail: 'Email ou password incorretos' });
  });

  it('recusa com email não verificado', async () => {
    await createVerifiedUser(email, password, null);
    const res = await request(app).post('/api/v1/auth/login').send({
      email,
      password,
    });
    expect(res.status).toBe(403);
  });

  it('recusa um pedido sem password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email,
    });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ errors: [{ field: 'password' }] });
  });

  it('define o cookie refresh_token com HttpOnly, Secure e SameSite=Strict', async () => {
    await createVerifiedUser(email, password, new Date());
    const res = await request(app).post('/api/v1/auth/login').send({
      email,
      password,
    });

    expect(res.status).toBe(200);

    const refreshTokenCookie = findRefreshTokenCookie(res.get('Set-Cookie'));
    expect(refreshTokenCookie).toContain('HttpOnly');
    expect(refreshTokenCookie).toContain('Secure');
    expect(refreshTokenCookie).toContain('SameSite=Strict');
    expect(refreshTokenCookie).toContain('Path=/api/v1/auth');
  });

  it('guarda o refresh token apenas em hash', async () => {
    await createVerifiedUser(email, password, new Date());
    const res = await request(app).post('/api/v1/auth/login').send({
      email,
      password,
    });

    expect(res.status).toBe(200);
    const cookie = res.get('Set-Cookie') ?? [];
    const refreshTokenCookie = findRefreshTokenCookie(cookie);
    const value = refreshTokenCookie?.split(';')[0]?.split('=')[1] ?? '';
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(value) },
    });

    expect(stored).not.toBeNull();
  });

  it('devolve um access token com o id do utilizador', async () => {
    const user = await createVerifiedUser(email, password, new Date());
    const res = await request(app).post('/api/v1/auth/login').send({
      email,
      password,
    });
    expect(res.status).toBe(200);
    const { accessToken } = loginResponseSchema.parse(res.body);
    await expect(verifyAccessToken(accessToken)).resolves.toBe(user.id);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('renova o token de acesso', async () => {
    const loginResponse = await loginUser(email, password);
    expect(loginResponse.status).toBe(200);

    const refreshTokenCookie = findRefreshTokenCookie(loginResponse.get('Set-Cookie'));
    const cookiePair = refreshTokenCookie?.split(';')[0] ?? '';

    const refreshResp = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookiePair)
      .send();

    expect(refreshResp.status).toBe(200);
    expect(refreshResp.body).toHaveProperty('accessToken');

    const newCookies = refreshResp.get('Set-Cookie');
    expect(newCookies).toBeDefined();
  });

  it('reutilizar um token antigo deve disparar deteção de roubo', async () => {
    const loginResponse = await loginUser(email, password);
    expect(loginResponse.status).toBe(200);

    const refreshTokenCookie = findRefreshTokenCookie(loginResponse.get('Set-Cookie'));
    const cookiePair = refreshTokenCookie?.split(';')[0] ?? '';

    await request(app).post('/api/v1/auth/refresh').set('Cookie', cookiePair).send();

    const attackResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookiePair);

    expect(attackResponse.status).toBe(401);

    const tokensNaDb = await prisma.refreshToken.findMany();
    expect(tokensNaDb.every((t) => t.revokedAt !== null)).toBe(true);
  });

  it('sem cookie deve retornar 401', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('token expirado na BD', async () => {
    const loginResponse = await loginUser(email, password);
    expect(loginResponse.status).toBe(200);

    const refreshTokenCookie = findRefreshTokenCookie(loginResponse.get('Set-Cookie'));
    const cookiePair = refreshTokenCookie?.split(';')[0] ?? '';
    const refreshToken = cookiePair.split('=')[1] ?? '';

    await prisma.refreshToken.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
      where: { tokenHash: hashToken(refreshToken) },
    });

    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookiePair).send();
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('logout do usuário', async () => {
    const loginResponse = await loginUser(email, password);
    expect(loginResponse.status).toBe(200);

    const refreshTokenCookie = findRefreshTokenCookie(loginResponse.get('Set-Cookie'));
    const cookiePair = refreshTokenCookie?.split(';')[0] ?? '';

    const logoutResponse = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookiePair)
      .send();

    expect(logoutResponse.status).toBe(204);

    const setCookieHeader = logoutResponse.get('Set-Cookie');
    expect(setCookieHeader).toBeDefined();

    const tokensNaDb = await prisma.refreshToken.findMany();
    expect(tokensNaDb.every((t) => t.revokedAt !== null)).toBe(true);

    const refreshAfterLogout = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookiePair)
      .send();

    expect(refreshAfterLogout.status).toBe(401);
  });
  it('logout sem cookie', async () => {
    const logoutResponse = await request(app).post('/api/v1/auth/logout').send();
    expect(logoutResponse.status).toBe(204);
  });
});
