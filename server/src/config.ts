// Configuración del servidor a partir de las variables de entorno (en Netlify: Site configuration → Environment variables).
import { neon } from '@neondatabase/serverless';
import type { ApiOptions, Query } from './api';

export function databaseUrl() {
  // DATABASE_URL a mano, o NETLIFY_DATABASE_URL si la base de datos se creó desde Netlify.
  const url = process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL');
  return url;
}

export function serverOptions(query: ApiOptions['query']): ApiOptions {
  return {
    query,
    // Webs que pueden usar la API (CORS): el juego publicado y los servidores de desarrollo.
    allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'https://loganmancebo.github.io,http://localhost:5173,http://localhost:4173')
      .split(',')
      .map((o) => o.trim()),
    // Sin IP_SALT se usa la URL de la base de datos, que también es secreta.
    ipSalt: process.env.IP_SALT ?? process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL ?? 'moni',
  };
}

// Consultas a Neon por HTTP (sirve dentro de funciones sin conexiones abiertas).
export function neonQuery(url: string): Query {
  const sql = neon(url);
  return (text, params) => sql.query(text, params) as unknown as Promise<never[]>;
}
