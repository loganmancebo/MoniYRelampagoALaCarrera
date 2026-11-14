-- Partidas empezadas: el token que el juego pide al empezar y que se gasta al enviar la puntuación.
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  character TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  started_at INTEGER NOT NULL, -- ms
  used INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX runs_ip ON runs (ip_hash, started_at);

-- Puntuaciones del ranking: cada partida es una entrada, como en las recreativas.
CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  character TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at INTEGER NOT NULL, -- ms
  run_id TEXT NOT NULL UNIQUE
);
CREATE INDEX scores_top ON scores (character, score DESC);
CREATE INDEX scores_recent ON scores (character, created_at);
