import type { ZodOpenApiPathsObject } from 'zod-openapi';
import { updateProfileSchema } from './users.schemas.js';
import { userResponseSchema } from '../auth/auth.schemas.js';

export const authPaths: ZodOpenApiPathsObject = {
  '/api/v1/me': {
    get: {
      tags: ['User'],
      summary: 'Obter informações do perfil',
      description: 'Retorna as informações do perfil do utilizador.',
      responses: {
        '200': {
          description: 'Perfil obtido com sucesso',
          content: { 'application/json': { schema: userResponseSchema } },
        },
        '400': { description: 'Dados inválidos' },
        '404': { description: 'Utilizador não encontrado' },
      },
    },
    patch: {
      tags: ['Autenticação'],
      summary: 'Atualizar perfil',
      description: 'Atualiza as informações do perfil do utilizador.',
      requestBody: { content: { 'application/json': { schema: updateProfileSchema } } },
      responses: {
        '200': {
          description: 'Perfil atualizado',
          content: { 'application/json': { schema: userResponseSchema } },
        },
        '400': { description: 'Dados inválidos' },
        '404': { description: 'Utilizador não encontrado' },
      },
    },
  },
};
