import 'express';
import type { WorkspaceRole } from '../generated/prisma/client.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      workspaceId?: string;
      workspaceRole?: WorkspaceRole;
    }
  }
}
