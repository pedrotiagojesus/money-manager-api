import type { ZodOpenApiPathsObject } from 'zod-openapi';
import { registerBodySchema, userResponseSchema } from './auth.schemas.js';

export const authPaths: ZodOpenApiPathsObject = {
  '/api/v1/auth/register': {
    post: {
      tags: ['Autenticação'],
      summary: 'Criar conta e espaço pessoal',
      description: 'Envia um email com o link de verificação, válido durante 24 horas.',
      requestBody: { content: { 'application/json': { schema: registerBodySchema } } },
      responses: {
        '201': {
          description: 'Conta criada',
          content: { 'application/json': { schema: userResponseSchema } },
        },
        '400': { description: 'Dados inválidos' },
        '409': { description: 'Já existe uma conta com este email' },
      },
    },
  },
};
