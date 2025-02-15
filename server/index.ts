import express from "express";
import { setupVite } from "./vite";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";
import cors from "cors";

const app = express();

// Configurazione CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: false, limit: '10mb' })); 

console.log("Inizializzazione del server...");

// Setup authentication
console.log("Configurazione autenticazione...");
setupAuth(app);

// Register API routes
console.log("Registrazione routes API...");
const httpServer = registerRoutes(app);

// Development environment setup with Vite
if (process.env.NODE_ENV !== "production") {
  console.log("Configurazione ambiente di sviluppo con Vite...");
  setupVite(app, httpServer);
}

const port = 5000;
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Server in esecuzione sulla porta ${port}`);
  console.log("Database URL configurato:", !!process.env.DATABASE_URL);
  console.log("Session Secret configurato:", !!process.env.SESSION_SECRET);
  console.log("Limite dimensione payload:", app.get('json parser'));
});