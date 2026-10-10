import { describe, expect, it } from 'vitest';
import { generateKeyPair, SignJWT, exportJWK } from 'jose';
import { createTokenVerifier } from '../src/auth.js';

// Unit-test the claim/signature policy without contacting a real IdP.
describe('token policy', () => {
  it('accepts a correctly signed token with issuer and audience', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    const issuer = 'https://issuer.example/';
    const audience = 'https://api.example';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ keys: [{ ...jwk, kid: 'test-key', alg: 'RS256', use: 'sig' }] }), { headers: { 'content-type': 'application/json' } });
    try {
      const verify = createTokenVerifier({ issuer, audience, jwksUri: 'https://issuer.example/.well-known/jwks.json', jwksCacheTtlMs: 60000 });
      const token = await new SignJWT({ email: 'alice@example.com' }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setSubject('auth0|alice').setIssuer(issuer).setAudience(audience).setExpirationTime('5m').sign(privateKey);
      await expect(verify(token)).resolves.toMatchObject({ sub: 'auth0|alice', email: 'alice@example.com' });
    } finally { globalThis.fetch = originalFetch; }
  });

  it('rejects a token with the wrong audience', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    const issuer = 'https://issuer.example/';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ keys: [{ ...jwk, kid: 'test-key', alg: 'RS256', use: 'sig' }] }), { headers: { 'content-type': 'application/json' } });
    try {
      const verify = createTokenVerifier({ issuer, audience: 'correct-audience', jwksUri: 'https://issuer.example/.well-known/jwks.json', jwksCacheTtlMs: 60000 });
      const token = await new SignJWT().setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setSubject('alice').setIssuer(issuer).setAudience('wrong-audience').setExpirationTime('5m').sign(privateKey);
      await expect(verify(token)).rejects.toBeTruthy();
    } finally { globalThis.fetch = originalFetch; }
  });
});
