export function logGateway(entry: { method: string; path: string; sourceIp: string; status: number; userId?: string }) {
  process.stdout.write(JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + '\n');
}
