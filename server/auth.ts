import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { AuthRole, AuthUser, PublicUser, UserRole } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'volttrack-dev-secret-change-me';
const TOKEN_TTL = '7d';

export type AuthPayload = {
  userId: string;
  role: AuthRole;
  username: string;
};

export const authRoleToUserRole = (role: AuthRole): UserRole => {
  if (role === 'Tester') return 'Admin_Tested';
  if (role === 'Reviewer') return 'Admin_Reviewed';
  return 'Admin_Authorized';
};

export function toPublicUser(user: AuthUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function signToken(payload: AuthPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

export type AuthedRequest = Request & {
  auth?: AuthPayload;
  userRole?: UserRole;
};

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = verifyToken(token);
    req.auth = payload;
    req.userRole = authRoleToUserRole(payload.role);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
