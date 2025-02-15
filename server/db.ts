
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL deve essere impostato");
}

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 120000,
  connectionTimeoutMillis: 30000,
  ssl: true
};

export const pool = new Pool(poolConfig);

// Gestione errori del pool
pool.on('error', (err) => {
  console.error('Errore del pool:', err);
});

pool.on('connect', () => {
  console.log('Connessione al database stabilita');
});

// Test della connessione
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Test connessione DB riuscito');
    client.release();
  } catch (err) {
    console.error('Errore test connessione DB:', err);
    process.exit(1);
  }
}

testConnection();

export const db = drizzle({ client: pool, schema });
