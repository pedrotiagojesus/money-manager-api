import { Router } from 'express';
import { openApiDocument } from './document.js';

export function openApiRouter(): Router {
  const router = Router();

  router.get('/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });

  return router;
}
