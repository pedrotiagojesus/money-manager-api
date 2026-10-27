import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { resetDatabase } from '../../../test/helpers/database.js';
import { createUserWithPersonalWorkspace } from './users.service.js';

const newUser = { email: 'Ana@Example.test', passwordHash: 'hash-de-teste', name: 'Ana' };

beforeEach(async () => {
  await resetDatabase();
});

describe('createUserWithPersonalWorkspace', () => {
  it('cria um espaço pessoal com o utilizador como OWNER', async () => {
    const user = await createUserWithPersonalWorkspace(newUser);

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: true },
    });

    expect(memberships).toHaveLength(1);
    expect(memberships).toMatchObject([
      { role: 'OWNER', workspace: { name: 'Pessoal', baseCurrency: 'EUR' } },
    ]);
    expect(memberships.every((m) => m.acceptedAt !== null)).toBe(true);
  });

  it('guarda o email em minúsculas', async () => {
    const user = await createUserWithPersonalWorkspace(newUser);

    expect(user.email).toBe('ana@example.test');
  });

  it('com email repetido falha sem deixar um espaço órfão', async () => {
    await createUserWithPersonalWorkspace(newUser);

    await expect(
      createUserWithPersonalWorkspace({ ...newUser, email: 'ana@example.test' }),
    ).rejects.toThrow();

    expect(await prisma.workspace.count()).toBe(1);
  });
});
