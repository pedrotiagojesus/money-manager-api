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
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';

interface AppDeps {
  checkDatabase?: HealthCheck;
  docs?: boolean;
  mailer?: Mailer;
  loginRateLimit?: number;
}

export function createApp({
  checkDatabase,
  docs = false,
  mailer = smtpMailer,
  loginRateLimit = 1000,
}: AppDeps = {}): Express {
  const app = express();
  app.disable('x-powered-by');

  if (env.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  if (docs) {
    app.use('/docs', helmet({ contentSecurityPolicy: false }));
  }

  app.use(helmet());

  app.use(
    cors({
      origin: env.APP_URL,
      credentials: true,
    }),
  );

  app.use(requestLogger);
  app.use(express.json());
  app.use(cookieParser());

  app.use(healthRouter({ checkDatabase }));
  app.use('/api/v1', authRouter({ mailer, loginRateLimit }));
  app.use('/api/v1', userRouter());
  app.use('/api/v1', workspaceRouter());
  if (docs) {
    app.use(openApiRouter());
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
