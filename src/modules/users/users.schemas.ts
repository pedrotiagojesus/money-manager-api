import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  locale: z.enum(['pt-PT', 'en']).optional(),
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
