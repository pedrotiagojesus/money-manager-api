// Factories: criam dados válidos para os testes, com valores por defeito
// que cada teste pode alterar. Próxima: createAccount (#12).
import type { Prisma, User } from '../../src/generated/prisma/client.js';
import { prisma } from '../../src/lib/prisma.js';

let sequence = 0;

function nextSequence() {
  sequence += 1;
  return sequence;
}

export function createUser(overrides: Partial<Prisma.UserCreateInput> = {}) {
  const n = nextSequence();
  return prisma.user.create({
    data: {
      email: `user${n}@example.test`,
      name: `Utilizador ${n}`,
      passwordHash: 'hash-fixo-de-teste',
      ...overrides,
    },
  });
}

type WorkspaceOverrides = Partial<Omit<Prisma.WorkspaceCreateInput, 'members'>> & {
  owner?: User;
};

export async function createWorkspace({ owner, ...overrides }: WorkspaceOverrides = {}) {
  const user = owner ?? (await createUser());
  const workspace = await prisma.workspace.create({
    data: {
      name: `Espaço ${nextSequence()}`,
      ...overrides,
      members: { create: { userId: user.id, role: 'OWNER', acceptedAt: new Date() } },
    },
  });
  return { workspace, owner: user };
}
