import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { updateProfileSchema } from './users.schemas.js';
import { findUserById, updateUserProfile } from './users.service.js';

export function userRouter(): Router {
  const router = Router();

  router.get('/me', requireAuth, async (req, res) => {
    const userId = req.userId;
    if (userId === undefined) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilizador não encontrado' });
    }

    return res.status(200).json(user);
  });

  router.patch('/me', requireAuth, async (req, res) => {
    const userId = req.userId;
    if (userId === undefined) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error });
    }

    const updatedUser = await updateUserProfile(userId, validation.data);

    return res.status(200).json(updatedUser);
  });

  return router;
}
