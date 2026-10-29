import { Router } from 'express';
import type { Mailer } from '../../lib/mailer.js';
import { registerBodySchema, type UserResponse } from './auth.schemas.js';
import { register } from './auth.service.js';

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

  return router;
}
