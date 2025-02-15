import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL deve essere impostato");
}

// Usa il connection pooler di Neon
const poolUrl = process.env.DATABASE_URL.replace('.us-east-2', '-pooler.us-east-2');

const poolConfig = {
  connectionString: poolUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: true
};

export const pool = new Pool(poolConfig);

// Gestione errori
pool.on('error', (err) => {
  console.error('Errore database:', err);
});

pool.on('connect', () => {
  console.log('Connessione al database stabilita');
});


// Esporta il client drizzle
export const db = drizzle({ client: pool, schema });