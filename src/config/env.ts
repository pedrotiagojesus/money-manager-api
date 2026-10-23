import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Variáveis de ambiente inválidas:\n' + z.prettifyError(result.error));
  process.exit(1);
}

export const env = result.data;
export type Env = z.infer<typeof envSchema>;
