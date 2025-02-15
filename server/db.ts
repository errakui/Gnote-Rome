
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
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false,
    requestCert: true
  }
};

export const pool = new Pool(poolConfig);

// Gestione errori del pool
pool.on('error', (err) => {
  console.error('Errore imprevisto del pool:', err);
});

pool.on('connect', () => {
  console.log('Connessione al database stabilita');
});

// Test connessione iniziale
pool.connect()
  .then(client => {
    console.log('Test connessione DB riuscito');
    client.release();
  })
  .catch(err => {
    console.error('Errore test connessione DB:', err);
  });

export const db = drizzle({ client: pool, schema });
