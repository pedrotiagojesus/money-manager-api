import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { resetDatabase } from '../../../test/helpers/database.js';
import { createUser, createWorkspace } from '../../../test/factories/index.js';
import { signAccessToken } from '../../lib/jwt.js';
import request from 'supertest';
import { createApp } from '../../app.js';

beforeEach(async () => {
  await resetDatabase();
});

const app = createApp();

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

  it('tentar ver um espaço que não pretence', async () => {
    const ana = await createUser({ name: 'Ana' });

    const bruno = await createUser({ name: 'Bruno' });
    const { workspace: brunoWorkspace } = await createWorkspace({ owner: bruno, role: 'VIEWER' });

    const anaToken = await signAccessToken(ana.id);

    const response = await request(app)
      .get(`/api/v1/workspaces/${brunoWorkspace.id}`)
      .set('Authorization', `Bearer ${anaToken}`);

    expect(response.status).toBe(404);
  });

  it('tentar ter uma ação sem permissão', async () => {
    const user = await createUser({ name: 'Bruno' });
    const { workspace } = await createWorkspace({ owner: user, role: 'VIEWER' });
    const token = await signAccessToken(user.id);

    const response = await request(app)
      .patch(`/api/v1/workspaces/${workspace.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});
