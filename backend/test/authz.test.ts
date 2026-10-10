import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { resetUsers } from '../src/users.js';

describe('Zero Trust backend boundary', () => {
  beforeEach(() => resetUsers());
  it('blocks direct access without gateway identity', async () => {
    const response = await request(app).get('/api/users');
    expect(response.status).toBe(403);
  });
  it('allows a request carrying gateway identity', async () => {
    const response = await request(app).get('/api/users').set('X-Verified-User', 'auth0|alice');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
  it('supports CRUD with the gateway identity', async () => {
    const created = await request(app).post('/api/users').set('X-Verified-User', 'alice').send({ name: 'Alice', email: 'alice@example.com' });
    expect(created.status).toBe(201);
    const id = created.body.id;
    expect((await request(app).get(`/api/users/${id}`).set('X-Verified-User', 'alice')).status).toBe(200);
    expect((await request(app).put(`/api/users/${id}`).set('X-Verified-User', 'alice').send({ name: 'Alice Updated', email: 'alice2@example.com' })).status).toBe(200);
    expect((await request(app).delete(`/api/users/${id}`).set('X-Verified-User', 'alice')).status).toBe(204);
  });
});
