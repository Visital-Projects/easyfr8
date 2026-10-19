import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim().length > 0) {
    return secret.trim();
  }
  return 'easyfr8_default_secure_jwt_secret_key_2026_production';
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

/**
 * Hash a plaintext password using bcrypt
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

/**
 * Check if a stored password is legacy plaintext needing upgrade to bcrypt
 */
export function needsRehash(storedPassword: string): boolean {
  if (!storedPassword) return false;
  return !storedPassword.startsWith('$2a$') && !storedPassword.startsWith('$2b$');
}

/**
 * Verify a plaintext password against a stored password.
 * Supports standard bcrypt hashes ($2a$, $2b$) as well as legacy plaintext passwords.
 */
export function verifyPassword(providedPassword: string, storedPasswordHashOrPlain: string): boolean {
  if (!providedPassword || !storedPasswordHashOrPlain) return false;
  if (storedPasswordHashOrPlain.startsWith('$2a$') || storedPasswordHashOrPlain.startsWith('$2b$')) {
    try {
      return bcrypt.compareSync(providedPassword, storedPasswordHashOrPlain);
    } catch {
      return false;
    }
  }
  return providedPassword === storedPasswordHashOrPlain;
}

export interface TokenPayload {
  id: string;
  name?: string;
  email?: string;
  role: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

/**
 * Generate a cryptographically signed HMAC-SHA256 JWT.
 * Defaults to 30 days expiration.
 */
export function generateToken(payload: TokenPayload, expiresInSeconds = 30 * 24 * 60 * 60): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${header}.${body}`;

  const secret = getJwtSecret();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(dataToSign)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Verify a cryptographically signed HMAC-SHA256 JWT.
 * Validates structure, signature, and expiration.
 * Mock tokens are completely rejected.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;

    const parts = token.trim().split('.');
    if (parts.length !== 3) return null;

    const [headerB64, bodyB64, signatureB64] = parts;
    const dataToSign = `${headerB64}.${bodyB64}`;
    const secret = getJwtSecret();

    // Verify cryptographic signature using constant-time comparison
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(dataToSign)
      .digest('base64url');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    const providedBuffer = Buffer.from(signatureB64, 'utf-8');

    if (expectedBuffer.length !== providedBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
      return null;
    }

    // Decode and parse payload
    const payloadStr = base64UrlDecode(bodyB64);
    const payload = JSON.parse(payloadStr) as TokenPayload;

    if (!payload || typeof payload !== 'object') return null;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && typeof payload.exp === 'number') {
      const expSec = payload.exp > 10000000000 ? Math.floor(payload.exp / 1000) : payload.exp;
      if (now > expSec) {
        return null; // Expired
      }
    }

    return payload;
  } catch {
    return null;
  }
}

export interface AuthResult {
  authenticated: boolean;
  user?: TokenPayload;
  error?: string;
  status: number;
}

/**
 * Extract token from Request headers (Authorization: Bearer <token>) or Cookies
 */
export function extractTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const parts = authHeader.split(' ');
    if (parts.length >= 2 && parts[1].trim()) {
      return parts[1].trim();
    }
  }

  // Cookie fallback: easyfr8_token or easyfr8_session
  const cookieHeader = req.headers.get('cookie') || '';
  const tokenMatch = cookieHeader.match(/(?:easyfr8_token|easyfr8_session)=([^;]+)/);
  if (tokenMatch) {
    try {
      const raw = decodeURIComponent(tokenMatch[1]).trim();
      // If cookie contains full JWT directly
      if (raw.split('.').length === 3) {
        return raw;
      }
      // If cookie contains JSON string with token inside
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.token === 'string') {
        return parsed.token;
      }
    } catch {
      // Continue
    }
  }

  return null;
}

/**
 * Central authorization helper for API routes.
 * Verifies authentication token and checks optional role permissions.
 */
export function authenticateRequest(req: Request, allowedRoles?: string[]): AuthResult {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return {
      authenticated: false,
      error: 'Unauthorized: Authentication token is required.',
      status: 401,
    };
  }

  const user = verifyToken(token);
  if (!user) {
    return {
      authenticated: false,
      error: 'Unauthorized: Invalid or expired authentication token.',
      status: 401,
    };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user.role || '').toLowerCase().trim();
    const hasRole = allowedRoles.some((r) => r.toLowerCase().trim() === userRole);
    if (!hasRole) {
      return {
        authenticated: false,
        user,
        error: `Forbidden: Action requires one of roles [${allowedRoles.join(', ')}].`,
        status: 403,
      };
    }
  }

  return {
    authenticated: true,
    user,
    status: 200,
  };
}
