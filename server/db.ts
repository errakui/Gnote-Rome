
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL deve essere impostato");
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1,
  ssl: true
});

pool.on('connect', () => {
  console.log('Database connesso correttamente');
});

pool.on('error', (err) => {
  console.error('Errore database:', err);
});

// Gestione errori avanzata
pool.on('error', (err) => {
  console.error('Errore critico database:', err);
  process.exit(1); // Exit on critical DB errors
});

// Esporta il client drizzle
export const db = drizzle(pool, { schema });
export { pool };
