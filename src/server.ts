import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const app = createApp({
  checkDatabase: () => prisma.$queryRaw`SELECT 1`,
  docs: env.API_DOCS_ENABLED ?? env.NODE_ENV !== 'production',
});

app.listen(env.PORT, () => {
  logger.info(`API a correr em http://localhost:${env.PORT}`);
});
