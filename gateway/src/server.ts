import 'dotenv/config';

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';

import { createTokenVerifier } from './auth.js';
import { createApiProxy } from './proxy.js';
import { logGateway } from './logger.js';

const app = express();

const port = Number(process.env.PORT ?? 3000);
const backendUrl =
  process.env.BACKEND_URL ?? 'http://localhost:3001';

const issuer = process.env.OIDC_ISSUER;
const audience = process.env.OIDC_AUDIENCE;
const jwksUri = process.env.OIDC_JWKS_URI;

if (!issuer || !audience || !jwksUri) {
  throw new Error(
    'OIDC_ISSUER, OIDC_AUDIENCE and OIDC_JWKS_URI are required',
  );
}

const verifyToken = createTokenVerifier({
  issuer,
  audience,
  jwksUri,
  jwksCacheTtlMs: Number(
    process.env.JWKS_CACHE_TTL_MS ?? 3600000,
  ),
});

app.disable('x-powered-by');

// Validate every request under /api before proxying.
app.use(
  '/api',
  async (req: Request, res: Response, next: NextFunction) => {
    const started = Date.now();
    const auth = req.header('authorization');

    let userId: string | undefined;
    let status = 401;

    try {
      if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
        });
      }

      const token = auth.slice('Bearer '.length).trim();

      if (!token) {
        return res.status(401).json({
          error: 'Unauthorized',
        });
      }

      // Verify signature, expiration, issuer and audience.
      const identity = await verifyToken(token);

      userId = identity.sub;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
        });
      }

      // Overwrite any client-supplied identity header.
      req.headers['x-verified-user'] = userId;

      status = 200;
      next();
    } catch {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    } finally {
      logGateway({
        method: req.method,
        path: req.path,
        sourceIp: req.ip,
        status,
        userId,
      });

      void started;
    }
  },
);

// Mount at /, not /api, so the proxy receives /api/users
// rather than /users after Express strips the mount prefix.
app.use('/', createApiProxy(backendUrl));

// Handle requests that do not match a proxied route.
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not Found',
  });
});

// Generic error handler.
app.use(
  (
    _err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
      });
    }
  },
);

app.listen(port, () => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'gateway',
      port,
    }),
  );
});
