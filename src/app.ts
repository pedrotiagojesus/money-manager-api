import express, { type Express } from 'express';
import { smtpMailer, type Mailer } from './lib/mailer.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { userRouter } from './modules/users/users.routes.js';
import { healthRouter, type HealthCheck } from './modules/health/health.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { openApiRouter } from './openapi/openapi.routes.js';
import cookieParser from 'cookie-parser';
import { workspaceRouter } from './modules/workspaces/workspaces.routes.js';

interface AppDeps {
  checkDatabase?: HealthCheck;
  docs?: boolean;
  mailer?: Mailer;
}

export function createApp({
  checkDatabase,
  docs = false,
  mailer = smtpMailer,
}: AppDeps = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json());
  app.use(cookieParser());

  app.use(healthRouter({ checkDatabase }));
  app.use('/api/v1', authRouter({ mailer }));
  app.use('/api/v1', userRouter());
  app.use('/api/v1', workspaceRouter());
  if (docs) {
    app.use(openApiRouter());
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
