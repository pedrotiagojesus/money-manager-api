import express, { type Express } from 'express';
import { healthRouter, type HealthCheck } from './modules/health/health.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

interface AppDeps {
  checkDatabase?: HealthCheck;
}

export function createApp({ checkDatabase }: AppDeps = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json());

  app.use(healthRouter({ checkDatabase }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
