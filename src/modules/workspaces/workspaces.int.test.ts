import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { resetDatabase } from '../../../test/helpers/database.js';
import { createUser, createWorkspace } from '../../../test/factories/index.js';
import { signAccessToken } from '../../lib/jwt.js';
import request from 'supertest';
import { createApp } from '../../app.js';
import {
  listWorkspacesResponseSchema,
  singleWorkspaceResponseSchema,
} from '../../../test/schemas.js';

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

  it('POST /workspaces cria um espaço com o utilizador como OWNER e aparece no GET /workspaces', async () => {
    const user = await createUser({ name: 'Bruno' });
    const token = await signAccessToken(user.id);

    const createRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Finanças Pessoais' });

    const { workspace } = singleWorkspaceResponseSchema.parse(createRes.body);

    expect(createRes.status).toBe(201);
    expect(workspace).toMatchObject({
      name: 'Finanças Pessoais',
      role: 'OWNER',
    });

    const listRes = await request(app)
      .get('/api/v1/workspaces')
      .set('Authorization', `Bearer ${token}`);

    const { workspaces } = listWorkspacesResponseSchema.parse(listRes.body);

    expect(listRes.status).toBe(200);
    expect(workspaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: workspace.id,
          name: 'Finanças Pessoais',
          role: 'OWNER',
        }),
      ]),
    );
  });

  it('GET /workspaces isola os dados: Ana só vê os espaços dela e não os do Bruno', async () => {
    const anaUser = await createUser({ name: 'Ana' });
    const anaToken = await signAccessToken(anaUser.id);
    const anaWorkspaceRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${anaToken}`)
      .send({ name: 'Espaço Ana' });

    const { workspace: anaWorkspace } = singleWorkspaceResponseSchema.parse(anaWorkspaceRes.body);

    const brunoUser = await createUser({ name: 'Bruno' });
    const brunoToken = await signAccessToken(brunoUser.id);
    const brunoWorkspaceRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${brunoToken}`)
      .send({ name: 'Espaço Bruno' });

    const { workspace: brunoWorkspace } = singleWorkspaceResponseSchema.parse(
      brunoWorkspaceRes.body,
    );

    const listAna = await request(app)
      .get('/api/v1/workspaces')
      .set('Authorization', `Bearer ${anaToken}`);

    const { workspaces } = listWorkspacesResponseSchema.parse(listAna.body);

    expect(listAna.status).toBe(200);
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0]).toMatchObject({
      id: anaWorkspace.id,
      name: 'Espaço Ana',
      role: 'OWNER',
    });

    const idsVisiveis = workspaces.map((w) => w.id);
    expect(idsVisiveis).not.toContain(brunoWorkspace.id);
  });

  it('POST /workspaces rejeita payload inválido com 400', async () => {
    const user = await createUser({ name: 'Bruno' });
    const token = await signAccessToken(user.id);

    const createRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 'Finanças Pessoais' });

    expect(createRes.status).toBe(400);
  });
});
