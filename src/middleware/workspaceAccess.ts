import type { Request, Response, NextFunction } from 'express';
import z from 'zod';
import { prisma } from '../lib/prisma.js';
import type { WorkspaceRole } from '../generated/prisma/browser.js';

const uuidSchema = z.uuid();

const ROLE_WEIGHT: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

export function workspaceAccess(minRole: WorkspaceRole) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: 'Não autenticado' });
      return;
    }

    const parsedId = uuidSchema.safeParse(req.params.workspaceId);
    if (!parsedId.success) {
      res.status(404).json({ message: 'Workspace não encontrado' });
      return;
    }

    const workspaceId = parsedId.data;

    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!member) {
      res.status(404).json({ message: 'Acesso negado ao workspace' });
      return;
    }

    if (ROLE_WEIGHT[member.role] < ROLE_WEIGHT[minRole]) {
      res.status(403).json({ message: 'Permissões insuficientes neste workspace' });
      return;
    }

    req.workspaceId = workspaceId;
    req.workspaceRole = member.role;

    next();
  };
}
