import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export interface AuthConfig {
  issuer: string;
  audience: string;
  jwksUri: string;
  jwksCacheTtlMs?: number;
}

export interface VerifiedIdentity {
  sub: string;
  email?: string;
  payload: JWTPayload;
}

export function createTokenVerifier(config: AuthConfig) {
  const issuer = config.issuer.replace(/\/$/, '') + '/';
  const jwksUrl = new URL(config.jwksUri);
  const cacheMaxAge = Math.max(1000, config.jwksCacheTtlMs ?? 3600000);
  const jwks = createRemoteJWKSet(jwksUrl, { cacheMaxAge, cooldownDuration: Math.min(cacheMaxAge, 30000) });

  return async function verifyToken(token: string): Promise<VerifiedIdentity> {
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: config.audience,
      algorithms: ['RS256'],
    });

    if (!payload.sub) throw new Error('Token subject is missing');
    return { sub: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined, payload };
  };
}
