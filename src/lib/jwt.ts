import { jwtVerify, SignJWT } from 'jose';
import { env } from '../config/env.js';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export function signAccessToken(userId: string): Promise<string> {
  const sJwt = new SignJWT();
  sJwt.setProtectedHeader({ alg: 'HS256' });
  sJwt.setSubject(userId);
  sJwt.setIssuedAt();
  sJwt.setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`);
  return sJwt.sign(secret);
}

export async function verifyAccessToken(token: string): Promise<string> {
  const res = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  if (!res.payload.sub) {
    throw new Error('Token inválido');
  }
  return res.payload.sub;
}
