import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import type { MailMessage, Mailer } from '../../lib/mailer.js';
import { prisma } from '../../lib/prisma.js';
import { resetDatabase } from '../../../test/helpers/database.js';
import { createUserWithPersonalWorkspace } from './users.service.js';
import { signAccessToken } from '../../lib/jwt.js';
import { randomUUID } from 'node:crypto';
import { createUser } from '../../../test/factories/index.js';
import { hashPassword } from '../../lib/password.js';

const sent: MailMessage[] = [];
const fakeMailer: Mailer = {
  send(message) {
    sent.push(message);
    return Promise.resolve();
  },
};

const app = createApp({ mailer: fakeMailer });
const newUser = { email: 'Ana@Example.test', passwordHash: 'hash-de-teste', name: 'Ana' };

beforeEach(async () => {
  await resetDatabase();
});

describe('createUserWithPersonalWorkspace', () => {
  it('cria um espaço pessoal com o utilizador como OWNER', async () => {
    const user = await createUserWithPersonalWorkspace(newUser);

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: true },
    });

    expect(memberships).toHaveLength(1);
    expect(memberships).toMatchObject([
      { role: 'OWNER', workspace: { name: 'Pessoal', baseCurrency: 'EUR' } },
    ]);
    expect(memberships.every((m) => m.acceptedAt !== null)).toBe(true);
  });

  it('guarda o email em minúsculas', async () => {
    const user = await createUserWithPersonalWorkspace(newUser);

    expect(user.email).toBe('ana@example.test');
  });

  it('com email repetido falha sem deixar um espaço órfão', async () => {
    await createUserWithPersonalWorkspace(newUser);

    await expect(
      createUserWithPersonalWorkspace({ ...newUser, email: 'ana@example.test' }),
    ).rejects.toThrow();

    expect(await prisma.workspace.count()).toBe(1);
  });
});

describe('Rotas de Utilizador (/api/v1/me)', () => {
  const mockUserId = randomUUID();

  describe('GET /api/v1/me', () => {
    it('1. Deve retornar 401 se o token estiver ausente', async () => {
      const response = await request(app).get('/api/v1/me').send();
      expect(response.status).toBe(401);
      expect(response.headers['www-authenticate']).toBe('Bearer');
    });

    it('2. Deve retornar 200 e os dados do utilizador se o token for válido', async () => {
      await createUser({
        id: mockUserId,
        name: 'Utilizador Teste',
        email: 'ana@example.test',
        passwordHash: await hashPassword('a-password-que-vais-usar'),
        emailVerifiedAt: new Date(),
        locale: 'pt-PT',
        theme: 'LIGHT',
      });

      const token = await signAccessToken(mockUserId);
      const response = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: mockUserId,
        email: 'ana@example.test',
        name: 'Utilizador Teste',
        locale: 'pt-PT',
        theme: 'LIGHT',
      });
      expect(response.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('PATCH /api/v1/me', () => {
    it('3. Deve retornar 401 se tentar atualizar sem token', async () => {
      const response = await request(app).patch('/api/v1/me').send({ name: 'Novo Nome' });

      expect(response.status).toBe(401);
    });

    it('4. Deve retornar 400 se enviar dados inválidos (ex: theme incorreto)', async () => {
      await createUser({
        id: mockUserId,
        name: 'Utilizador Teste',
        email: 'ana@example.test',
        passwordHash: await hashPassword('a-password-que-vais-usar'),
        emailVerifiedAt: new Date(),
        locale: 'pt-PT',
        theme: 'LIGHT',
      });

      const token = await signAccessToken(mockUserId);

      const response = await request(app)
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ theme: 'THEME_INEXISTENTE' });

      expect(response.status).toBe(400);
    });

    it('5. Deve atualizar apenas o campo enviado (PATCH parcial) e retornar 200', async () => {
      await createUser({
        id: mockUserId,
        name: 'Utilizador Teste',
        email: 'ana@example.test',
        passwordHash: await hashPassword('a-password-que-vais-usar'),
        emailVerifiedAt: new Date(),
        locale: 'pt-PT',
        theme: 'LIGHT',
      });
      const token = await signAccessToken(mockUserId);

      const response = await request(app)
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nome Atualizado' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: 'Nome Atualizado',
        locale: 'pt-PT',
      });
    });
  });
});
