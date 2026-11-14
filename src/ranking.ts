// Cliente del ranking online (servidor en server/). Si no hay red o el servidor falla, todo devuelve
// null y el juego sigue como sin ranking.
import { CharacterKey } from './config';
import { Period, RANKING, ScoreEntry, TopTable } from './shared/ranking';
import { load, save } from './storage';

const API = (import.meta.env.VITE_RANKING_URL as string | undefined)?.replace(/\/$/, '');
const TIMEOUT_MS = 6000;

export const rankingEnabled = Boolean(API);

export interface SubmitResult {
  rankWeek: number;
  rankAll: number;
}

async function request<T>(path: string, body?: unknown): Promise<T | null> {
  if (!API) return null;
  try {
    const res = await fetch(`${API}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// Token de partida: se pide al empezar cada partida; el servidor mide cuánto ha durado.
export async function startRun(character: CharacterKey): Promise<string | null> {
  const data = await request<{ runId: string }>('/run', { character });
  return data?.runId ?? null;
}

// Últimos tops descargados, para tenerlos al instante en el game over y en la pantalla de ranking.
const topCache: Partial<Record<Period, TopTable>> = {};

export async function fetchTop(period: Period): Promise<TopTable | null> {
  const data = await request<TopTable>(`/top?period=${period}`);
  if (data) topCache[period] = data;
  return data ?? topCache[period] ?? null;
}

export function cachedTop(period: Period): TopTable | undefined {
  return topCache[period];
}

export async function submitScore(runId: string, name: string, score: number): Promise<SubmitResult | null> {
  const result = await request<SubmitResult>('/score', { runId, name, score });
  delete topCache.week; // el top ha podido cambiar
  delete topCache.all;
  return result;
}

// ¿Entra la puntuación en el top? (si entra en el histórico, entra también en el semanal)
export function qualifies(top: ScoreEntry[], score: number) {
  if (score < RANKING.minScore) return false;
  return top.length < RANKING.topSize || score > top[top.length - 1].score;
}

export function lastInitials() {
  return load('moni.initials') ?? 'AAA';
}

export function saveInitials(name: string) {
  save('moni.initials', name);
}
