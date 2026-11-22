// Acceso a la base de datos para los scripts: Neon si hay DATABASE_URL (en server/.env), si no PGlite en
// server/.data (un Postgres local en un archivo, sin instalar nada).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { Query } from '../src/api';
import { neonQuery } from '../src/config';

const MIGRATIONS_DIR = join(import.meta.dirname, '..', 'migrations');

export async function openDb(): Promise<{ query: Query; where: string }> {
  const url = process.env.DATABASE_URL;
  if (url) {
    return { query: neonQuery(url), where: `Neon (${new URL(url).host})` };
  }
  const db = await PGlite.create(join(import.meta.dirname, '..', '.data'));
  return { query: async (text, params) => (await db.query(text, params)).rows as never[], where: 'PGlite local (server/.data)' };
}

// Aplica las migraciones de migrations/ que falten, en orden, apuntándolas en `schema_migrations`.
export async function migrate(query: Query) {
  await query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at BIGINT NOT NULL)');
  const done = new Set((await query<{ name: string }>('SELECT name FROM schema_migrations')).map((r) => r.name));
  const applied: string[] = [];
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    if (done.has(file)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8').replace(/--.*$/gm, '');
    for (const statement of sql.split(';').map((s) => s.trim()).filter(Boolean)) await query(statement);
    await query('INSERT INTO schema_migrations (name, applied_at) VALUES ($1, $2)', [file, Date.now()]);
    applied.push(file);
  }
  return applied;
}
