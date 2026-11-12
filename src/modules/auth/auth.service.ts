import { env } from '../../config/env.js';
import { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { HttpError } from '../../lib/httpError.js';
import { logger } from '../../lib/logger.js';
import type { Mailer } from '../../lib/mailer.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { generateToken, hashToken } from '../../lib/tokens.js';
import { createUserWithPersonalWorkspace } from '../users/users.service.js';
import { verificationEmail } from './auth.emails.js';
import type { RegisterBody, VerifyEmailBody } from './auth.schemas.js';
import { randomUUID } from 'crypto';
import { signAccessToken } from '../../lib/jwt.js';
import type { LoginBody } from './auth.schemas.js';

type DatabaseClient = Prisma.TransactionClient | PrismaClient;

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const dummyPasswordHash = hashPassword('password-que-nunca-sera-usada');

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

const issueTokens = async (
  dbClient: DatabaseClient,
  userId: string,
  familyId: string,
  userAgent: string,
) => {
  const refreshToken = generateToken();
  await dbClient.refreshToken.create({
    data: {
      userId,
      familyId,
      userAgent,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  const accessToken = await signAccessToken(userId);
  return { accessToken, refreshToken };
};

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

export async function verifyEmail({ token }: VerifyEmailBody) {
  const tokenHash = hashToken(token);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.emailVerificationToken.updateMany({
      where: { usedAt: null, expiresAt: { gt: now }, tokenHash },
      data: { usedAt: now },
    });

    if (count === 0) {
      throw new HttpError(400, 'Link inválido ou expirado');
    }

    const record = await tx.emailVerificationToken.findUniqueOrThrow({
      where: { tokenHash },
      select: { userId: true },
    });

    await tx.user.updateMany({
      where: { id: record.userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: now },
    });

    await tx.emailVerificationToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: now },
    });
  });
}

export async function login({ email, password }: LoginBody, userAgent: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    await verifyPassword(await dummyPasswordHash, password);
    throw new HttpError(401, 'Email ou password incorretos');
  }

  if (!(await verifyPassword(user.passwordHash, password))) {
    throw new HttpError(401, 'Email ou password incorretos');
  }

  if (user.emailVerifiedAt === null) {
    throw new HttpError(403, 'Email não verificado');
  }

  return issueTokens(prisma, user.id, randomUUID(), userAgent);
}

export async function refresh(token: string | undefined, userAgent: string) {
  if (!token) {
    throw new HttpError(401, 'Token inválido');
  }
  const tokenHash = hashToken(token);

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.expiresAt < new Date()) {
    throw new HttpError(401, 'Token inválido ou expirado');
  }

  if (record.revokedAt !== null) {
    await prisma.refreshToken.updateMany({
      where: { familyId: record.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new HttpError(401, 'Token inválido ou expirado');
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updateResult = await tx.refreshToken.updateMany({
        where: { id: record.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      if (updateResult.count === 0) {
        throw new Error('REUSE_DETECTED');
      }

      return await issueTokens(tx, record.userId, record.familyId, userAgent);
    });
  } catch (error) {
    const err = error as Error;
    if (err.message === 'REUSE_DETECTED') {
      await prisma.refreshToken.updateMany({
        where: { familyId: record.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new HttpError(401, 'Token inválido ou expirado');
    }
    throw error;
  }
}
