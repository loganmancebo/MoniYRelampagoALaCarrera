// Función programada de Netlify: borra cada día los tokens de partida viejos.
import { cleanupRuns } from '../../src/api';
import { databaseUrl, neonQuery } from '../../src/config';

export default async () => {
  await cleanupRuns(neonQuery(databaseUrl()));
};

export const config = { schedule: '@daily' };
