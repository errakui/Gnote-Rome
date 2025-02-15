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
  connectionString: process.env.DATABASE_URL?.replace('.us-east-2', '-pooler.us-east-2'),
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 5000,
  ssl: {
    rejectUnauthorized: false
  }
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