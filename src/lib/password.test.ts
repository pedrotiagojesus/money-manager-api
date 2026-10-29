import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('gera um hash argon2id que valida a password certa', async () => {
    const passwordHash = await hashPassword('password-segura');

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(passwordHash, 'password-segura')).toBe(true);
    expect(await verifyPassword(passwordHash, 'outra-password')).toBe(false);
  });
});
