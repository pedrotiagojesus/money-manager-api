import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './document.js';

export function openApiRouter(): Router {
  const router = Router();

  router.get('/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });

  router.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      customSiteTitle: 'Money Manager API',
      swaggerOptions: { url: '/openapi.json' },
    }),
  );

  return router;
}
