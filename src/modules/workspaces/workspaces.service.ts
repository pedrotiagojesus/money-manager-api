import { prisma } from '../../lib/prisma.js';
import type { CreateWorkspaceInput } from './workspaces.schemas.js';

export async function listUserWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: {
      userId,
    },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: {
      workspace: {
        createdAt: 'asc',
      },
    },
  });

  return memberships.map(({ role, workspace }) => ({
    ...workspace,
    role,
  }));
}

export async function createWorkspaceForUser(userId: string, intput: CreateWorkspaceInput) {
  const workspace = await prisma.workspace.create({
    data: {
      name: intput.name,
      members: {
        create: {
          userId,
          role: 'OWNER',
          acceptedAt: new Date(),
        },
      },
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    ...workspace,
    role: 'OWNER' as const,
  };
}
