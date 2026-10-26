import { createDocument } from 'zod-openapi';
import { healthPaths } from '../modules/health/health.openapi.js';

export const openApiDocument = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Money Manager API',
    version: '0.1.0',
    description: 'API REST do Money Manager: contas, categorias, transações e património.',
  },
  paths: {
    ...healthPaths,
  },
});
