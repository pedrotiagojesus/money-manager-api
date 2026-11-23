import { z } from 'zod';

const workspaceDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']),
});

export const singleWorkspaceResponseSchema = z.object({
  workspace: workspaceDtoSchema,
});

export const listWorkspacesResponseSchema = z.object({
  workspaces: z.array(workspaceDtoSchema),
});
