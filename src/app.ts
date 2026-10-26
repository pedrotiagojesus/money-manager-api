import express, { type Express } from 'express';
import { healthRouter, type HealthCheck } from './modules/health/health.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { openApiRouter } from './openapi/openapi.routes.js';

interface AppDeps {
  checkDatabase?: HealthCheck;
  docs?: boolean;
}

export function createApp({ checkDatabase, docs = false }: AppDeps = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json());

  app.use(healthRouter({ checkDatabase }));
  if (docs) {
    app.use(openApiRouter());
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
