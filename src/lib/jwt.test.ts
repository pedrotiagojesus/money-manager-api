import { afterEach, describe, expect, it, vi } from 'vitest';
import { signAccessToken, verifyAccessToken } from './jwt.js';

describe('JWT', () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  it('assinar e verificar devolve o mesmo id', async () => {
    const userId = 'user123';
    const token = await signAccessToken(userId);
    const verifiedUserId = await verifyAccessToken(token);
    expect(verifiedUserId).toBe(userId);
  });
  it('um token adulterado é recusado', async () => {
    const userId = 'user123';
    const token = await signAccessToken(userId);
    const tokenParts = token.split('.');
    tokenParts[2] = (tokenParts[2]?.startsWith('A') ? 'B' : 'A') + (tokenParts[2]?.slice(1) ?? '');
    await expect(verifyAccessToken(tokenParts.join('.'))).rejects.toThrow();
  });
  it('um token expirado é recusado', async () => {
    vi.useFakeTimers();
    const userId = 'user123';
    const token = await signAccessToken(userId);
    vi.setSystemTime(Date.now() + 16 * 60 * 1000);
    const verifiedUserId = verifyAccessToken(token);
    await expect(verifiedUserId).rejects.toThrow();
  });
});
