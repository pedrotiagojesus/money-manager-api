import { defineConfig, env } from 'prisma/config';

try {
  process.loadEnvFile();
} catch {
  // Sem .env (CI, Docker): as variáveis vêm do ambiente
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
});
