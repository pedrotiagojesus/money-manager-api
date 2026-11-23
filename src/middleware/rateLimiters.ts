import type { Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

function sendTooManyRequests(req: Request, res: Response, detail: string) {
  res.status(429).type('application/problem+json').json({
    type: 'https://httpstatuses.com/429',
    title: 'Too Many Requests',
    status: 429,
    detail,
    instance: req.originalUrl,
  });
}

export function createLoginRateLimiters(maxAttempts = 5) {
  const windowMs = 60 * 1000; // 1 minuto

  const byIp = rateLimit({
    windowMs,
    max: maxAttempts,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? 'unknown'),
    handler: (req, res) => {
      sendTooManyRequests(
        req,
        res,
        'Demasiadas tentativas de início de sessão a partir deste IP. Tenta novamente dentro de 1 minuto.',
      );
    },
  });

  const byEmail = rateLimit({
    windowMs,
    max: maxAttempts,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const body = req.body as Record<string, unknown> | undefined;
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      return email ? `email:${email}` : `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
    },
    handler: (req, res) => {
      sendTooManyRequests(
        req,
        res,
        'Demasiadas tentativas de início de sessão para este endereço de email. Tenta novamente dentro de 1 minuto.',
      );
    },
  });

  return [byIp, byEmail];
}
