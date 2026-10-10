import type { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

export function createApiProxy(target: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,

    on: {
      proxyReq(proxyReq, req: Request) {
        const verifiedUser = req.header('X-Verified-User');

        if (verifiedUser) {
          proxyReq.setHeader('X-Verified-User', verifiedUser);
        }

        // Do not pass the original access token to the backend.
        proxyReq.removeHeader('authorization');
      },

      error(_err, _req: Request, res: Response) {
        if (!res.headersSent) {
          res.status(502).json({
            error: 'Bad Gateway',
          });
        }
      },
    },
  });
}