import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.get("/api/notes", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.id) {
      console.log("Tentativo di accesso non autorizzato alle note");
      return res.sendStatus(401);
    }
    try {
      const notes = await storage.getNotes(req.user.id);
      console.log(`Note recuperate per l'utente ${req.user.id}`);
      res.json(notes);
    } catch (error) {
      console.error("Errore nel recupero delle note:", error);
      res.status(500).json({ error: "Errore nel recupero delle note" });
    }
  });

  app.post("/api/notes", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.id) {
        console.error("Creazione nota fallita: Utente non autenticato");
        return res.sendStatus(401);
      }

      const fileSize = parseInt(req.get('content-length') || '0');
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (fileSize > maxSize) {
        return res.status(413).json({
          error: "File troppo grande. Massimo 10MB permesso."
        });
      }

      console.log("Ricevuta richiesta di creazione nota:", {
        userId: req.user?.id,
        isAuthenticated: req.isAuthenticated(),
        hasTitle: !!req.body.title,
        hasContent: !!req.body.content,
        attachmentsCount: req.body.attachments?.length,
        contentLength: req.get('content-length')
      });

      const contentLength = parseInt(req.get('content-length') || '0');
      const limit = 10 * 1024 * 1024; // 10MB in bytes

      if (contentLength > limit) {
        return res.status(413).json({
          error: "La dimensione totale della richiesta supera il limite di 10MB"
        });
      }

      const note = await storage.createNote(req.user.id, req.body);
      console.log("Nota creata con successo:", note.id);
      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating note:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to create note" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}