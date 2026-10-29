import { env } from '../../config/env.js';
import { Prisma } from '../../generated/prisma/client.js';
import { HttpError } from '../../lib/httpError.js';
import { logger } from '../../lib/logger.js';
import type { Mailer } from '../../lib/mailer.js';
import { hashPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { generateToken, hashToken } from '../../lib/tokens.js';
import { createUserWithPersonalWorkspace } from '../users/users.service.js';
import { verificationEmail } from './auth.emails.js';
import type { RegisterBody } from './auth.schemas.js';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export async function register({ email, password, name }: RegisterBody, mailer: Mailer) {
  const passwordHash = await hashPassword(password);

  const user = await createUserWithPersonalWorkspace({ email, passwordHash, name }).catch(
    (err: unknown) => {
      if (isUniqueViolation(err)) {
        throw new HttpError(409, 'Já existe uma conta com este email');
      }
      throw err;
    },
  );

  const token = generateToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
    },
  });

  const link = `${env.APP_URL}/verificar-email?token=${token}`;
  try {
    await mailer.send({ to: user.email, ...verificationEmail(user.name, link) });
  } catch (err) {
    logger.error({ err, userId: user.id }, 'Falha ao enviar o email de verificação');
  }

  return user;
}
