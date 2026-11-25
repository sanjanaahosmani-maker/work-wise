import crypto from 'node:crypto';
import type { AuthUser } from '../src/types.js';

interface StoredUser {
  id: string;
  name: string;
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

const usersByEmail = new Map<string, StoredUser>();
const usersById = new Map<string, StoredUser>();
const revokedTokens = new Set<string>();

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function toPublicUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export function registerAccount(
  name: string,
  email: string,
  password: string
): { user?: AuthUser; error?: string; status?: number } {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanName || !cleanEmail || !password) {
    return { error: 'All fields are required.', status: 400 };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    return { error: 'Please enter a valid email address.', status: 400 };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters long.', status: 400 };
  }
  if (usersByEmail.has(cleanEmail)) {
    return { error: 'An account with this email already exists.', status: 409 };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const stored: StoredUser = {
    id: crypto.randomUUID(),
    name: cleanName,
    email: cleanEmail,
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  usersByEmail.set(cleanEmail, stored);
  usersById.set(stored.id, stored);

  return { user: toPublicUser(stored) };
}

export function verifyAccount(
  email: string,
  password: string
): { user?: AuthUser; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const stored = usersByEmail.get(cleanEmail);
  if (!stored) {
    return { error: 'Invalid email or password.' };
  }

  const candidateHash = hashPassword(password, stored.salt);
  const expectedBuf = Buffer.from(stored.passwordHash, 'hex');
  const candidateBuf = Buffer.from(candidateHash, 'hex');

  if (
    expectedBuf.length !== candidateBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, candidateBuf)
  ) {
    return { error: 'Invalid email or password.' };
  }

  return { user: toPublicUser(stored) };
}

export function issueSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      iat: Date.now(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      jti: crypto.randomBytes(12).toString('hex'),
    })
  ).toString('base64url');

  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');

  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): AuthUser | null {
  if (!token || revokedTokens.has(token)) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string;
      exp?: number;
    };
    if (!parsed.sub || !parsed.exp || Date.now() > parsed.exp) {
      return null;
    }
    const stored = usersById.get(parsed.sub);
    return stored ? toPublicUser(stored) : null;
  } catch {
    return null;
  }
}

export function revokeSessionToken(token: string): void {
  if (token) {
    revokedTokens.add(token);
  }
}
