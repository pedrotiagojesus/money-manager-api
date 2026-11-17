import { prisma } from '../../lib/prisma.js';
import type { UpdateProfileInput } from './users.schemas.js';

export interface NewUser {
  email: string;
  passwordHash: string;
  name: string;
}

const userSelectFields = {
  id: true,
  email: true,
  name: true,
  locale: true,
  theme: true,
  emailVerifiedAt: true,
};

export function createUserWithPersonalWorkspace({ email, passwordHash, name }: NewUser) {
  return prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      passwordHash,
      name,
      memberships: {
        create: {
          role: 'OWNER',
          acceptedAt: new Date(),
          workspace: { create: { name: 'Pessoal' } },
        },
      },
    },
  });
}

export async function findUserById(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: userSelectFields,
  });
}

export async function updateUserProfile(userId: string, data: UpdateProfileInput) {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
    select: userSelectFields,
  });

  return updatedUser;
}
