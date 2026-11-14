import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.setHeader('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ message: 'Token de acesso ausente ou malformado' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    res.setHeader('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }

  try {
    req.userId = await verifyAccessToken(token);
    next();
    return;
  } catch {
    res.setHeader('WWW-Authenticate', 'Bearer error="invalid_token"');
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }

  next();
}
