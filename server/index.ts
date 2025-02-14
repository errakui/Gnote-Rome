import express from "express";
import { setupVite } from "./vite";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup authentication
setupAuth(app);

// Register API routes
const httpServer = registerRoutes(app);

// Development environment setup with Vite
if (process.env.NODE_ENV !== "production") {
  setupVite(app, httpServer);
}

const port = Number(process.env.PORT) || 3000;
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Server in esecuzione sulla porta ${port}`);
});