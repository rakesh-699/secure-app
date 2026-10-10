import { randomUUID } from 'node:crypto';
export interface User { id: string; name: string; email: string; }
const users = new Map<string, User>();
export function listUsers() { return [...users.values()]; }
export function getUser(id: string) { return users.get(id); }
export function createUser(name: string, email: string) { const user = { id: randomUUID(), name, email }; users.set(user.id, user); return user; }
export function updateUser(id: string, name: string, email: string) { const existing = users.get(id); if (!existing) return undefined; const updated = { ...existing, name, email }; users.set(id, updated); return updated; }
export function deleteUser(id: string) { return users.delete(id); }
export function resetUsers() { users.clear(); }
