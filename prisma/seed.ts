import { logger } from '../src/lib/logger.js';
import { prisma } from '../src/lib/prisma.js';

function main(): Promise<void> {
  // Cada issue que cria um modelo junta aqui os seus dados fictícios:
  // #8 utilizador demo e espaço · #12 contas · #14 categorias · #16 transações
  logger.info('Seed concluído');
  return Promise.resolve();
}

try {
  await main();
} catch (err) {
  logger.error({ err }, 'Seed falhou');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
