import { z } from 'zod';

export const registerBodySchema = z
  .object({
    email: z.email('Email inválido').max(254),
    password: z
      .string()
      .min(10, 'A password tem de ter pelo menos 10 caracteres')
      .max(128, 'A password não pode ter mais de 128 caracteres'),
    name: z.string().trim().min(1, 'O nome é obrigatório').max(100),
  })
  .meta({ id: 'RegisterBody' });

export const userResponseSchema = z
  .object({ id: z.uuid(), email: z.email(), name: z.string() })
  .meta({ id: 'User' });

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
