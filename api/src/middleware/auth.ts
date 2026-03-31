import { Request, Response, NextFunction } from 'express';
import jwt, { JwtHeader, JwtPayload, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config/env';
import { AppError } from './errorHandler';
import { logger } from './logger';

// JWKS URI and issuer are derived from the tenant's well-known OIDC config.
// For Entra External ID (CIAM), these follow a specific pattern:
//   jwks_uri → https://{tenantDomain}/{tenantId}/discovery/v2.0/keys
//   issuer   → https://{tenantId}.ciamlogin.com/{tenantId}/v2.0
// Always derive these from the actual well-known document — don't guess the pattern.
const client = jwksClient({
  jwksUri: `https://${config.azure.tenantDomain}/${config.azure.tenantId}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutes — Entra rotates keys infrequently; caching is safe
});

// Called by jsonwebtoken to retrieve the public key for a given key ID (kid).
// The kid is embedded in the JWT header — Entra rotates keys periodically,
// so we look up the right one rather than hardcoding.
function getSigningKey(header: JwtHeader, callback: SigningKeyCallback): void {
  if (!header.kid) {
    callback(new Error('No kid in token header'));
    return;
  }
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    callback(null, key?.getPublicKey());
  });
}

export interface AuthenticatedUser {
  oid: string;        // Entra Object ID — used as userId in MongoDB
  name?: string;
  email?: string;
  roles?: string[];
}

// Extend Express Request type so TypeScript knows req.user exists after this middleware
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// The main auth middleware — attach to any route you want protected
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Missing or invalid Authorization header', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(
    token,
    getSigningKey,
    {
      // audience: the API's client ID — tokens issued for other apps are rejected
      audience: config.azure.clientId,
      // issuer must match the value in the well-known document exactly — not the custom domain
      issuer: `https://${config.azure.tenantId}.ciamlogin.com/${config.azure.tenantId}/v2.0`,
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        logger.warn('Token validation failed', { error: err.message });
        throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
      }

      const claims = decoded as JwtPayload;

      // oid is the stable, unique identifier for a user in Entra.
      // Never use 'sub' as a user ID — it can change if the user signs in via a different identity provider.
      if (!claims.oid) {
        throw new AppError('Token missing oid claim', 401, 'UNAUTHORIZED');
      }

      req.user = {
        oid: claims.oid,
        name: claims.name,
        email: claims.preferred_username || claims.email,
        roles: claims.roles,
      };

      next();
    }
  );
}

// Optional: scope/role guard factory
// Usage: router.get('/admin', authenticate, requireRole('Admin'), handler)
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRoles = req.user?.roles ?? [];
    const hasRole = roles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }
    next();
  };
}
