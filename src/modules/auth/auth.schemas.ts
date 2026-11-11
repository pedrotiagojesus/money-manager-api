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

export const verifyEmailSchema = z
  .object({
    token: z.string().min(1, 'Link inválido ou expirado').max(43, 'Link inválido ou expirado'),
  })
  .meta({ id: 'VerifyEmail' });

export const loginBodySchema = z
  .object({
    email: z.email('Email inválido').max(254),
    password: z
      .string()
      .min(1, 'A password é obrigatória')
      .max(128, 'A password não pode ter mais de 128 caracteres'),
  })
  .meta({ id: 'LoginBody' });

export const loginResponseSchema = z
  .object({
    accessToken: z.string(),
    tokenType: z.literal('Bearer'),
    expiresIn: z.number().int(),
  })
  .meta({ id: 'LoginResponse' });

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type VerifyEmailBody = z.infer<typeof verifyEmailSchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
