import { Router } from 'express';

export type HealthCheck = () => Promise<unknown>;

interface HealthOptions {
  checkDatabase?: HealthCheck;
  timeoutMs?: number;
}

type CheckStatus = 'up' | 'down' | 'not_configured';

async function runCheck(check: HealthCheck | undefined, timeoutMs: number): Promise<CheckStatus> {
  if (!check) return 'not_configured';
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('timeout'));
    }, timeoutMs);
  });
  try {
    await Promise.race([check(), timeout]);
    return 'up';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

export function healthRouter({ checkDatabase, timeoutMs = 2000 }: HealthOptions = {}): Router {
  const router = Router();

  router.get('/health', async (_req, res) => {
    const database = await runCheck(checkDatabase, timeoutMs);
    const healthy = database !== 'down';

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'error',
      checks: { api: 'up', database },
      uptime: Math.round(process.uptime()),
    });
  });

  return router;
}
