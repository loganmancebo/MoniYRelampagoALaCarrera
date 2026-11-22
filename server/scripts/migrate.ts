// npm run db:migrate — aplica las migraciones pendientes (Neon si server/.env tiene DATABASE_URL, si no PGlite local).
import { migrate, openDb } from './db';

const { query, where } = await openDb();
const applied = await migrate(query);
console.log(`${where}: ${applied.length ? `aplicadas ${applied.join(', ')}` : 'nada pendiente'}`);
process.exit(0);
