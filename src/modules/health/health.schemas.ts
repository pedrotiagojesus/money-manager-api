import { z } from 'zod';

export const checkStatusSchema = z.enum(['up', 'down', 'not_configured']);

export const healthResponseSchema = z
  .object({
    status: z.enum(['ok', 'error']),
    checks: z.object({
      api: z.literal('up'),
      database: checkStatusSchema,
    }),
    uptime: z.number().int().meta({ description: 'Segundos desde o arranque da API' }),
  })
  .meta({ id: 'HealthResponse' });

export type CheckStatus = z.infer<typeof checkStatusSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
