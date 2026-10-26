import type { ZodOpenApiPathsObject } from 'zod-openapi';
import { healthResponseSchema } from './health.schemas.js';

export const healthPaths: ZodOpenApiPathsObject = {
  '/health': {
    get: {
      tags: ['Sistema'],
      summary: 'Estado da API e da base de dados',
      responses: {
        '200': {
          description: 'API e base de dados operacionais',
          content: { 'application/json': { schema: healthResponseSchema } },
        },
        '503': {
          description: 'A base de dados não responde',
          content: { 'application/json': { schema: healthResponseSchema } },
        },
      },
    },
  },
};
