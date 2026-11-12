import { Router } from 'express';
import type { Mailer } from '../../lib/mailer.js';
import {
  loginBodySchema,
  registerBodySchema,
  type UserResponse,
  verifyEmailSchema,
} from './auth.schemas.js';
import { login, register, verifyEmail, REFRESH_TOKEN_TTL_MS, refresh } from './auth.service.js';
import { ACCESS_TOKEN_TTL_SECONDS } from '../../lib/jwt.js';

interface AuthOptions {
  mailer: Mailer;
}

export function authRouter({ mailer }: AuthOptions): Router {
  const router = Router();

  router.post('/auth/register', async (req, res) => {
    const body = registerBodySchema.parse(req.body);
    const user = await register(body, mailer);

    const response: UserResponse = { id: user.id, email: user.email, name: user.name };
    res.status(201).json(response);
  });

  router.post('/auth/verify-email', async (req, res) => {
    const body = verifyEmailSchema.parse(req.body);
    await verifyEmail(body);

    res.sendStatus(204);
  });

  router.post('/auth/login', async (req, res) => {
    const body = loginBodySchema.parse(req.body);
    const { accessToken, refreshToken } = await login(body, req.get('user-agent') ?? '');
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: REFRESH_TOKEN_TTL_MS,
    });

    res.json({ accessToken, tokenType: 'Bearer', expiresIn: ACCESS_TOKEN_TTL_SECONDS }).send(200);
  });

  router.post('/auth/refresh', async (req, res) => {
    const cookies = req.cookies as Record<string, string | undefined>;
    const tokenCookie = cookies.refresh_token;
    const { accessToken, refreshToken } = await refresh(tokenCookie, req.get('user-agent') ?? '');
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: REFRESH_TOKEN_TTL_MS,
    });

    res.json({ accessToken, tokenType: 'Bearer', expiresIn: ACCESS_TOKEN_TTL_SECONDS }).send(200);
  });

  return router;
}
