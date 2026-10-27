import { prisma } from '../../lib/prisma.js';

export interface NewUser {
  email: string;
  passwordHash: string;
  name: string;
}

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
