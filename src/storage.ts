// localStorage puede no estar disponible (modo privado, iframes...): todo con try/catch.
export function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // sin persistencia, el juego sigue funcionando
  }
}

export function getHighScore(): number {
  return Number(load('moni.highscore')) || 0;
}

export function setHighScore(score: number): void {
  save('moni.highscore', String(Math.floor(score)));
}
