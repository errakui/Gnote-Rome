
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
  connectionTimeoutMillis: 30000,
  ssl: true,
  idleTimeoutMillis: 0,
  allowExitOnIdle: true,
  retryDelay: 1000,
  maxRetries: 3
});

pool.on('connect', () => {
  console.log('Database connesso correttamente');
});

pool.on('error', (err) => {
  console.error('Errore database:', err);
});

// Gestione errori basilare
pool.on('error', (err) => {
  console.error('Errore database:', err);
});

// Esporta il client drizzle
export const db = drizzle(pool, { schema });
export { pool };
