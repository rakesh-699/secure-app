import type { Request, Response, NextFunction } from 'express';

export function requireGatewayIdentity(req: Request, res: Response, next: NextFunction) {
  const user = req.header('X-Verified-User');
  if (!user || user.length > 512 || /[\r\n]/.test(user)) return res.status(403).json({ error: 'Forbidden' });
  next();
}
