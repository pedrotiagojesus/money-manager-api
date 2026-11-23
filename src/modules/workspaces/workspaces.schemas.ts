import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome do workspace é obrigatório')
    .max(100, 'O nome não pode exceder 100 caracteres'),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
