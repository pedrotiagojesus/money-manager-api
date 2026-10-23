import { STATUS_CODES } from 'node:http';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError, type FieldError } from '../lib/httpError.js';

interface Problem {
  status: number;
  detail: string;
  errors?: FieldError[];
}

function isExposedHttpError(err: unknown): err is { status: number; message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof err.status === 'number' &&
    'expose' in err &&
    err.expose === true
  );
}

function toProblem(err: unknown): Problem {
  if (err instanceof HttpError) {
    return { status: err.status, detail: err.message, errors: err.errors };
  }
  if (err instanceof ZodError) {
    return {
      status: 400,
      detail: 'Pedido inválido',
      errors: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    };
  }
  if (isExposedHttpError(err)) {
    return { status: err.status, detail: err.message };
  }
  return { status: 500, detail: 'Ocorreu um erro inesperado' };
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `A rota ${req.method} ${req.path} não existe`));
};

export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const problem = toProblem(err);
  if (problem.status >= 500) {
    req.log.error({ err }, 'Erro não tratado');
  }

  res
    .status(problem.status)
    .type('application/problem+json')
    .json({
      type: 'about:blank',
      title: STATUS_CODES[problem.status] ?? 'Error',
      ...problem,
      instance: req.originalUrl,
      requestId: req.id,
    });
};
