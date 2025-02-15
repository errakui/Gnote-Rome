
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL deve essere impostato");
}

// Configurazione più robusta del pool
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 1, // Limita a una singola connessione
  idleTimeoutMillis: 60000, // 1 minuto timeout
  connectionTimeoutMillis: 20000, // 20 secondi timeout
  ssl: true,
  keepAlive: true
};

// Crea il pool
export const pool = new Pool(poolConfig);

// Gestione errori
pool.on('error', (err) => {
  console.error('Errore pool database:', err);
  process.exit(1); // Termina in caso di errore critico
});

pool.on('connect', () => {
  console.log('Nuova connessione al database stabilita');
});

// Test iniziale della connessione
async function initDatabase() {
  try {
    const client = await pool.connect();
    console.log('Test connessione database riuscito');
    client.release();
  } catch (err) {
    console.error('Errore connessione database:', err);
    process.exit(1);
  }
}

initDatabase();

// Esporta il client drizzle
export const db = drizzle({ client: pool, schema });
