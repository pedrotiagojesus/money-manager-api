import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { workspaceAccess } from '../../middleware/workspaceAccess.js';

export function workspaceRouter() {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);

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
