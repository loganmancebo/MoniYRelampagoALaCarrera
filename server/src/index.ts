// API del ranking online. Rutas:
//   POST /run    { character }               → { runId }   (al empezar cada partida)
//   POST /score  { runId, name, score }      → { rankWeek, rankAll }
//   GET  /top?period=week|all                → { moni: [...], relampago: [...] }
import { CHARACTERS } from '../../src/config';
import { isCharacter, isValidName, maxPlausibleScore, Period, RANKING, ScoreEntry, weekStart } from '../../src/shared/ranking';

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  IP_SALT?: string;
}

interface Run {
  id: string;
  character: string;
  started_at: number;
  used: number;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '';
    const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
    const cors: Record<string, string> = allowed.includes(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      const url = new URL(request.url);
      const route = `${request.method} ${url.pathname}`;
      // Solo se escribe desde el juego. Frena envíos desde otras webs; contra scripts están las comprobaciones.
      if (request.method === 'POST' && !cors['Access-Control-Allow-Origin']) throw new HttpError(403, 'origen no permitido');

      let body: unknown;
      if (route === 'POST /run') body = await startRun(request, env);
      else if (route === 'POST /score') body = await submitScore(request, env);
      else if (route === 'GET /top') body = await getTop(url, env);
      else throw new HttpError(404, 'no existe');

      return Response.json(body, { headers: { ...cors, 'Cache-Control': 'no-store' } });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      return Response.json({ error: e instanceof HttpError ? e.message : 'error interno' }, { status, headers: cors });
    }
  },

  // Limpieza diaria: los tokens de partida solo hacen falta unas horas.
  async scheduled(_event: ScheduledController, env: Env) {
    await env.DB.prepare('DELETE FROM runs WHERE started_at < ?').bind(Date.now() - 24 * 60 * 60 * 1000).run();
  },
};

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const data = await request.json();
    if (data && typeof data === 'object') return data as Record<string, unknown>;
  } catch {
    // cae al error de abajo
  }
  throw new HttpError(400, 'JSON no válido');
}

// La IP se guarda resumida (hash con sal): sirve para limitar partidas sin guardar datos personales.
async function ipHash(request: Request, env: Env) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.IP_SALT ?? 'moni'}:${ip}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function startRun(request: Request, env: Env) {
  const { character } = await readJson(request);
  if (!isCharacter(character)) throw new HttpError(400, 'personaje no válido');

  const now = Date.now();
  const hash = await ipHash(request, env);
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM runs WHERE ip_hash = ? AND started_at > ?')
    .bind(hash, now - RANKING.runWindowMs)
    .first<number>('n');
  if ((recent ?? 0) >= RANKING.maxRunsPerWindow) throw new HttpError(429, 'demasiadas partidas seguidas');

  const runId = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO runs (id, character, ip_hash, started_at) VALUES (?, ?, ?, ?)')
    .bind(runId, character, hash, now)
    .run();
  return { runId };
}

async function submitScore(request: Request, env: Env) {
  const { runId, name, score } = await readJson(request);
  if (typeof runId !== 'string') throw new HttpError(400, 'falta la partida');
  if (!isValidName(name)) throw new HttpError(400, 'nombre no válido');
  if (typeof score !== 'number' || !Number.isInteger(score) || score < RANKING.minScore) throw new HttpError(400, 'puntuación no válida');

  const now = Date.now();
  const run = await env.DB.prepare('SELECT id, character, started_at, used FROM runs WHERE id = ?').bind(runId).first<Run>();
  if (!run) throw new HttpError(404, 'partida desconocida');
  if (run.used) throw new HttpError(409, 'partida ya enviada');
  const elapsed = now - run.started_at;
  if (elapsed > RANKING.runMaxAgeMs) throw new HttpError(410, 'partida caducada');

  // El token se gasta aunque la puntuación no sea creíble: así no se puede ir probando.
  const claimed = await env.DB.prepare('UPDATE runs SET used = 1 WHERE id = ? AND used = 0').bind(runId).run();
  if (!claimed.meta.changes) throw new HttpError(409, 'partida ya enviada');
  if (score > maxPlausibleScore(elapsed)) throw new HttpError(422, 'puntuación imposible');

  await env.DB.prepare('INSERT INTO scores (name, character, score, created_at, run_id) VALUES (?, ?, ?, ?, ?)')
    .bind(name, run.character, score, now, runId)
    .run();
  // Puesto = cuántas puntuaciones son mejores + 1 (a igualdad, va antes la más antigua).
  const better = (from: number) =>
    env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE character = ? AND score > ? AND created_at >= ?')
      .bind(run.character, score, from)
      .first<number>('n');
  const [week, all] = await Promise.all([better(weekStart(now)), better(0)]);
  return { rankWeek: (week ?? 0) + 1, rankAll: (all ?? 0) + 1 };
}

async function getTop(url: URL, env: Env) {
  const period = (url.searchParams.get('period') ?? 'week') as Period;
  if (period !== 'week' && period !== 'all') throw new HttpError(400, 'periodo no válido');
  const since = period === 'week' ? weekStart(Date.now()) : 0;
  const stmt = env.DB.prepare(
    'SELECT name, score FROM scores WHERE character = ? AND created_at >= ? ORDER BY score DESC, created_at ASC LIMIT ?',
  );
  const results = await env.DB.batch<ScoreEntry>(CHARACTERS.map((c) => stmt.bind(c, since, RANKING.topSize)));
  return Object.fromEntries(CHARACTERS.map((c, i) => [c, results[i].results]));
}
