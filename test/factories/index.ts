// Factories: criam dados válidos para os testes, com valores por defeito
// que cada teste pode alterar. Cada issue que cria um modelo junta aqui a sua:
//   #8  createUser, createWorkspace (com o utilizador como OWNER)
//   #12 createAccount
//
// Padrão a seguir:
//
//   let sequence = 0;
//
//   export function createUser(overrides: Partial<Prisma.UserCreateInput> = {}) {
//     sequence += 1;
//     return prisma.user.create({
//       data: {
//         email: `user${sequence}@example.test`,
//         name: `Utilizador ${sequence}`,
//         passwordHash: 'hash-fixo-de-teste',
//         ...overrides,
//       },
//     });
//   }
//
// Uso: const owner = await createUser({ email: 'ana@example.test' });

export {};
