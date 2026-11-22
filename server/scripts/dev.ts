// npm run dev — la API del ranking en http://localhost:8787 con una base de datos local (PGlite en server/.data).
// Es la misma lógica que la función de Netlify (src/api.ts); solo cambia la base de datos.
import { createServer } from 'node:http';
import { createHandler } from '../src/api';
import { serverOptions } from '../src/config';
import { migrate, openDb } from './db';

const PORT = 8787;

delete process.env.DATABASE_URL; // en desarrollo nunca se toca la base de datos de verdad
const { query, where } = await openDb();
await migrate(query);
const handle = createHandler(serverOptions(query));

createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const request = new Request(`http://localhost:${PORT}${req.url}`, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body: chunks.length ? Buffer.concat(chunks) : undefined,
  });
  const response = await handle(request, req.socket.remoteAddress ?? 'local');
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(PORT, () => console.log(`Ranking en http://localhost:${PORT} · ${where}`));
