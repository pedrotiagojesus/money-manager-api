import type { ZodOpenApiPathsObject } from 'zod-openapi';
import {
  loginBodySchema,
  registerBodySchema,
  userResponseSchema,
  verifyEmailSchema,
} from './auth.schemas.js';

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
  '/api/v1/auth/verify-email': {
    post: {
      tags: ['Autenticação'],
      summary: 'Verificar email',
      description: 'Verifica o email do usuário com o token de verificação.',
      requestBody: { content: { 'application/json': { schema: verifyEmailSchema } } },
      responses: {
        '204': { description: 'Email verificado' },
        '400': { description: 'Token inválido ou expirado' },
      },
    },
  },
  '/api/v1/auth/login': {
    post: {
      tags: ['Autenticação'],
      summary: 'Iniciar sessão',
      description: 'Inicia sessão com o email e password do usuário.',
      requestBody: { content: { 'application/json': { schema: loginBodySchema } } },
      responses: {
        '200': { description: 'Sessão iniciada' },
        '401': { description: 'Email ou password incorretos' },
        '403': { description: 'Email não verificado' },
      },
    },
  },
};
