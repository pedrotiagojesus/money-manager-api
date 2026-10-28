import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { resetDatabase } from '../../../test/helpers/database.js';
import { createUser, createWorkspace } from '../../../test/factories/index.js';

beforeEach(async () => {
  await resetDatabase();
});

describe('modelo de utilizadores e espaços', () => {
  it('cria um espaço com o utilizador como OWNER', async () => {
    const { workspace, owner } = await createWorkspace();

    const member = await prisma.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: owner.id } },
    });

    expect(member.role).toBe('OWNER');
    expect(workspace.baseCurrency).toBe('EUR');
  });

  it('não permite dois utilizadores com o mesmo email', async () => {
    await createUser({ email: 'ana@example.test' });

    await expect(createUser({ email: 'ana@example.test' })).rejects.toThrow();
  });

  it('não permite o mesmo utilizador duas vezes no mesmo espaço', async () => {
    const { workspace, owner } = await createWorkspace();

    await expect(
      prisma.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: owner.id, role: 'VIEWER' },
      }),
    ).rejects.toThrow();
  });

  it('apagar o espaço apaga os membros', async () => {
    const { workspace } = await createWorkspace();

    await prisma.workspace.delete({ where: { id: workspace.id } });

    expect(await prisma.workspaceMember.count()).toBe(0);
  });
});
