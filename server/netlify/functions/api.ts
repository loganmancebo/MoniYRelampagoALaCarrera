// Función de Netlify con la API del ranking (Postgres en Neon).
import { createHandler } from '../../src/api';
import { databaseUrl, neonQuery, serverOptions } from '../../src/config';

const handle = createHandler(serverOptions(neonQuery(databaseUrl())));

export default (request: Request, context: { ip: string }) => handle(request, context.ip);

export const config = { path: ['/run', '/score', '/top'] };
