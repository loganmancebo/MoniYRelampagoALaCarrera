// Reglas del ranking online compartidas por el juego y el servidor (server/src/index.ts).
import { CHARACTERS, CharacterKey, COUNTDOWN, DASH, SCORE_PER_PX, SPEED } from '../config';

export const RANKING = {
  topSize: 10,
  nameLength: 3,
  minScore: 10, // por debajo no se ofrece entrar en el ranking
  // La puntuación enviada no puede superar la máxima posible en el tiempo real de la partida,
  // multiplicada por este margen (más unos puntos de holgura).
  scoreMargin: 1.15,
  scoreSlack: 25,
  runMaxAgeMs: 3 * 60 * 60 * 1000, // un token de partida caduca a las 3 horas
  maxRunsPerWindow: 60, // partidas que se pueden empezar desde una misma IP…
  runWindowMs: 10 * 60 * 1000, // …en este tiempo
};

export type Period = 'week' | 'all';
export interface ScoreEntry {
  name: string;
  score: number;
}
export type TopTable = Record<CharacterKey, ScoreEntry[]>;

// Iniciales que no se aceptan (con 3 letras también salen palabrotas).
const BLOCKED_NAMES = new Set([
  'ASS', 'CUL', 'PUT', 'PTA', 'PTO', 'HDP', 'CTM', 'MRD', 'VRG', 'FUK', 'FUC', 'FCK', 'FUQ', 'WTF',
  'SEX', 'XXX', 'KKK', 'NAZ', 'NZI', 'DIK', 'DIC', 'COK', 'CUM', 'FAG', 'NIG', 'NGR', 'TIT', 'POL',
  'PIS', 'CAC', 'CKA', 'PNE',
]);

export function isValidName(name: unknown): name is string {
  return typeof name === 'string' && new RegExp(`^[A-Z]{${RANKING.nameLength}}$`).test(name) && !BLOCKED_NAMES.has(name);
}

export function isCharacter(c: unknown): c is CharacterKey {
  return typeof c === 'string' && (CHARACTERS as readonly string[]).includes(c);
}

// Puntuación máxima creíble tras `elapsedMs` de partida: corriendo siempre a la velocidad máxima
// posible en cada momento y con el dash usado nada más recargarse.
export function maxPlausibleScore(elapsedMs: number) {
  const t = Math.max(0, (elapsedMs - COUNTDOWN.from * COUNTDOWN.stepMs) / 1000);
  const tMax = (SPEED.max - SPEED.start) / SPEED.accel;
  const ta = Math.min(t, tMax);
  const distance = SPEED.start * ta + (SPEED.accel * ta * ta) / 2 + SPEED.max * Math.max(0, t - tMax);
  const dashBoost = 1 + ((DASH.speedMultiplier - 1) * DASH.durationMs) / (DASH.durationMs + DASH.cooldownMs);
  return distance * SCORE_PER_PX * dashBoost * RANKING.scoreMargin + RANKING.scoreSlack;
}

// Lunes a las 00:00 UTC de la semana de `now`: el ranking semanal empieza ahí.
export function weekStart(now: number) {
  const d = new Date(now);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysSinceMonday);
}
