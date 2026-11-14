import request from 'supertest';
import express from 'express';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { requireAuth } from './auth.js';
import { signAccessToken } from '../lib/jwt.js';

const app = express();
app.use(express.json());

app.get('/test-protected', requireAuth, (req, res) => {
  return res.status(200).json({ userId: req.userId });
});

describe('Middleware: requireAuth', () => {
  const mockUserId = 'user-123-uuid';
  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. Deve retornar 401 e WWW-Authenticate se o header Authorization estiver ausente', async () => {
    const response = await request(app).get('/test-protected').send();

    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toBe('Bearer');
    expect(response.body).toHaveProperty('message');
  });

  it('2. Deve retornar 401 se o header Authorization não começar com Bearer', async () => {
    const response = await request(app)
      .get('/test-protected')
      .set('Authorization', `Basic ${mockUserId}`)
      .send();

    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toBe('Bearer');
  });

  it('3. Deve retornar 401 se o token for adulterado/inválido', async () => {
    const response = await request(app)
      .get('/test-protected')
      .set('Authorization', 'Bearer token.invalido.falso')
      .send();

    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toContain('invalid_token');
  });

  it('4. Deve retornar 401 se o token estiver expirado (usando relógios falsos)', async () => {
    vi.useFakeTimers();

    const token = await signAccessToken(mockUserId);

    vi.advanceTimersByTime(20 * 60 * 1000);

    const response = await request(app)
      .get('/test-protected')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(response.status).toBe(401);
  });

  it('5. Deve passar, definir o req.userId e retornar 200 se o token for válido', async () => {
    const token = await signAccessToken(mockUserId);

    const response = await request(app)
      .get('/test-protected')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: mockUserId });
  });
});
