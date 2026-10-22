import express, { type Express } from 'express';
import { requestLogger } from './middleware/requestLogger.js';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
