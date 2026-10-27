import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { resetDatabase } from '../../../test/helpers/database.js';

beforeEach(async () => {
  await resetDatabase();
});

async function createOwnerWithWorkspace() {
  const user = await prisma.user.create({
    data: { email: 'ana@example.test', passwordHash: 'hash-de-teste', name: 'Ana' },
  });
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Pessoal',
      members: { create: { userId: user.id, role: 'OWNER', acceptedAt: new Date() } },
    },
  });
  return { user, workspace };
}

describe('modelo de utilizadores e espaços', () => {
  it('cria um espaço com o utilizador como OWNER', async () => {
    const { user, workspace } = await createOwnerWithWorkspace();

    const member = await prisma.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    });

    expect(member.role).toBe('OWNER');
    expect(workspace.baseCurrency).toBe('EUR');
  });

  it('não permite dois utilizadores com o mesmo email', async () => {
    await createOwnerWithWorkspace();

    await expect(
      prisma.user.create({
        data: { email: 'ana@example.test', passwordHash: 'x', name: 'Outra' },
      }),
    ).rejects.toThrow();
  });

  it('não permite o mesmo utilizador duas vezes no mesmo espaço', async () => {
    const { user, workspace } = await createOwnerWithWorkspace();

    await expect(
      prisma.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: user.id, role: 'VIEWER' },
      }),
    ).rejects.toThrow();
  });

  it('apagar o espaço apaga os membros', async () => {
    const { workspace } = await createOwnerWithWorkspace();

    await prisma.workspace.delete({ where: { id: workspace.id } });

    expect(await prisma.workspaceMember.count()).toBe(0);
  });
});
