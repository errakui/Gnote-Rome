import express from "express";
import { setupVite } from "./vite";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";
import cors from "cors";
import dotenv from "dotenv";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Configurazione CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: false, limit: '10mb' })); 

console.log("Inizializzazione del server...");
console.log("Ambiente:", process.env.NODE_ENV);

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
} else {
  console.log("Ambiente di produzione: configurazione servizio file statici...");
  const buildPath = path.resolve(__dirname, "..", "dist", "public");
  app.use(express.static(buildPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

const port = process.env.PORT || 5000;
httpServer.listen(port, () => {
  console.log(`Server in esecuzione sulla porta ${port}`);
  console.log("Database URL configurato:", !!process.env.DATABASE_URL);
  console.log("Session Secret configurato:", !!process.env.SESSION_SECRET);
  console.log("Limite dimensione payload:", app.get('json parser'));
  console.log("Current working directory:", process.cwd());
});