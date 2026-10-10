import express, { type Request, type Response, type NextFunction } from 'express';
import { requireGatewayIdentity } from './authz.js';
import { listUsers, getUser, createUser, updateUser, deleteUser } from './users.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use('/api/users', requireGatewayIdentity);

function validBody(body: unknown): body is { name: string; email: string } {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return typeof b.name === 'string' && b.name.trim().length > 0 && typeof b.email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email);
}

app.get('/api/users', (_req, res) => res.json(listUsers()));
app.get('/api/users/:id', (req, res) => { const user = getUser(req.params.id); return user ? res.json(user) : res.status(404).json({ error: 'Not Found' }); });
app.post('/api/users', (req, res) => { if (!validBody(req.body)) return res.status(400).json({ error: 'Invalid request body' }); return res.status(201).json(createUser(req.body.name.trim(), req.body.email.trim())); });
app.put('/api/users/:id', (req, res) => { if (!validBody(req.body)) return res.status(400).json({ error: 'Invalid request body' }); const user = updateUser(req.params.id, req.body.name.trim(), req.body.email.trim()); return user ? res.json(user) : res.status(404).json({ error: 'Not Found' }); });
app.delete('/api/users/:id', (req, res) => deleteUser(req.params.id) ? res.status(204).send() : res.status(404).json({ error: 'Not Found' }));
app.use((_err: unknown, _req: Request, res: Response, _next: NextFunction) => res.status(500).json({ error: 'Internal Server Error' }));

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT ?? 3001);
  app.listen(port, () => console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: 'backend', port })));
}
