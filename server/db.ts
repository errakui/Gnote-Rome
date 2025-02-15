import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: true,
  keepAlive: true,
  statement_timeout: 10000,
};

export const pool = new Pool(poolConfig);
export const db = drizzle({ client: pool, schema });

// Test della connessione
pool.on('error', (err) => {
  console.error('Errore imprevisto del pool:', err);
});

pool.on('connect', () => {
  console.log('Nuova connessione al database stabilita');
});