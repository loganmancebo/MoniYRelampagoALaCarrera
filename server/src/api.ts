// API del ranking online. Rutas:
//   POST /run    { character }               → { runId }   (al empezar cada partida)
//   POST /score  { runId, name, score }      → { rankWeek, rankAll }
//   GET  /top?period=week|all                → { moni: [...], relampago: [...] }
// No depende de dónde se ejecute: recibe la función de consulta a Postgres (Neon en producción,
// PGlite en desarrollo, ver scripts/dev.ts).
import { CHARACTERS } from '../../src/config';
import { isCharacter, isValidName, maxPlausibleScore, Period, RANKING, ScoreEntry, weekStart } from '../../src/shared/ranking';

export type Query = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;

export interface ApiOptions {
  query: Query;
  allowedOrigins: string[];
  ipSalt: string;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function createHandler({ query, allowedOrigins, ipSalt }: ApiOptions) {
  return async (request: Request, ip: string): Promise<Response> => {
    const origin = request.headers.get('Origin') ?? '';
    const cors: Record<string, string> = allowedOrigins.includes(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};

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
      if (route === 'POST /run') body = await startRun(await readJson(request), await ipHash(ip, ipSalt), query);
      else if (route === 'POST /score') body = await submitScore(await readJson(request), query);
      else if (route === 'GET /top') body = await getTop(url, query);
      else throw new HttpError(404, 'no existe');

      return Response.json(body, { headers: { ...cors, 'Cache-Control': 'no-store' } });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      return Response.json({ error: e instanceof HttpError ? e.message : 'error interno' }, { status, headers: cors });
    }
  };
}

// Limpieza diaria: los tokens de partida solo hacen falta unas horas.
export async function cleanupRuns(query: Query) {
  await query('DELETE FROM runs WHERE started_at < $1', [Date.now() - 24 * 60 * 60 * 1000]);
}

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
async function ipHash(ip: string, salt: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function count(query: Query, text: string, params: unknown[]) {
  const [row] = await query<{ n: string | number }>(text, params);
  return Number(row?.n ?? 0);
}

async function startRun({ character }: Record<string, unknown>, hash: string, query: Query) {
  if (!isCharacter(character)) throw new HttpError(400, 'personaje no válido');

  const now = Date.now();
  const recent = await count(query, 'SELECT COUNT(*) AS n FROM runs WHERE ip_hash = $1 AND started_at > $2', [hash, now - RANKING.runWindowMs]);
  if (recent >= RANKING.maxRunsPerWindow) throw new HttpError(429, 'demasiadas partidas seguidas');

  const runId = crypto.randomUUID();
  await query('INSERT INTO runs (id, character, ip_hash, started_at) VALUES ($1, $2, $3, $4)', [runId, character, hash, now]);
  return { runId };
}

async function submitScore({ runId, name, score }: Record<string, unknown>, query: Query) {
  if (typeof runId !== 'string') throw new HttpError(400, 'falta la partida');
  if (!isValidName(name)) throw new HttpError(400, 'nombre no válido');
  if (typeof score !== 'number' || !Number.isInteger(score) || score < RANKING.minScore) throw new HttpError(400, 'puntuación no válida');

  // El token se gasta aunque la puntuación no sea creíble: así no se puede ir probando.
  const now = Date.now();
  const [run] = await query<{ character: string; started_at: string | number }>(
    'UPDATE runs SET used = TRUE WHERE id = $1 AND used = FALSE RETURNING character, started_at',
    [runId],
  );
  if (!run) throw new HttpError(409, 'partida desconocida o ya enviada');
  const elapsed = now - Number(run.started_at);
  if (elapsed > RANKING.runMaxAgeMs) throw new HttpError(410, 'partida caducada');
  if (score > maxPlausibleScore(elapsed)) throw new HttpError(422, 'puntuación imposible');

  await query('INSERT INTO scores (name, character, score, created_at, run_id) VALUES ($1, $2, $3, $4, $5)', [name, run.character, score, now, runId]);
  // Puesto = cuántas puntuaciones son mejores + 1 (a igualdad, va antes la más antigua).
  const better = (from: number) =>
    count(query, 'SELECT COUNT(*) AS n FROM scores WHERE character = $1 AND score > $2 AND created_at >= $3', [run.character, score, from]);
  const [week, all] = await Promise.all([better(weekStart(now)), better(0)]);
  return { rankWeek: week + 1, rankAll: all + 1 };
}

async function getTop(url: URL, query: Query) {
  const period = (url.searchParams.get('period') ?? 'week') as Period;
  if (period !== 'week' && period !== 'all') throw new HttpError(400, 'periodo no válido');
  const since = period === 'week' ? weekStart(Date.now()) : 0;
  const tops = await Promise.all(
    CHARACTERS.map((c) =>
      query<ScoreEntry>(
        'SELECT name, score FROM scores WHERE character = $1 AND created_at >= $2 ORDER BY score DESC, created_at ASC LIMIT $3',
        [c, since, RANKING.topSize],
      ),
    ),
  );
  return Object.fromEntries(CHARACTERS.map((c, i) => [c, tops[i]]));
}
