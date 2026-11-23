import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { workspaceAccess } from '../../middleware/workspaceAccess.js';
import { listUserWorkspaces, createWorkspaceForUser } from './workspaces.service.js';
import { createWorkspaceSchema } from './workspaces.schemas.js';

export function workspaceRouter() {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);

  router.get('/workspaces', async (req, res) => {
    if (!req.userId) {
      res.status(401).json({ message: 'Não autenticado' });
      return;
    }
    const workspaces = await listUserWorkspaces(req.userId);
    res.status(200).json({ workspaces });
  });

  router.post('/workspaces', requireAuth, async (req, res) => {
    if (!req.userId) {
      res.status(401).json({ message: 'Não autenticado' });
      return;
    }

    const parsed = createWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'Dados inválidos',
        errors: parsed.error,
      });
      return;
    }

    const workspace = await createWorkspaceForUser(req.userId, parsed.data);
    res.status(201).json({ workspace });
  });

  router.get('/workspaces', workspaceAccess('VIEWER'), (req, res) => {
    res.status(200).json({
      workspaceId: req.workspaceId,
      role: req.workspaceRole,
    });
  });

  router.patch('/workspaces', workspaceAccess('EDITOR'), (req, res) => {
    res.status(200).json({ updated: true });
  });

  router.delete('/workspaces', workspaceAccess('OWNER'), (req, res) => {
    res.status(204).send();
  });

  return router;
}
