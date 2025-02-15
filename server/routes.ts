import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import express from "express";

export function registerRoutes(app: Express): Server {
  // Aumenta il limite del body parser per gestire gli allegati
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  setupAuth(app);

  app.get("/api/notes", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.id) {
      console.log("Tentativo di accesso non autorizzato alle note");
      return res.sendStatus(401);
    }
    try {
      console.log(`[GET /api/notes] Recupero note per l'utente ID: ${req.user.id}`);
      const notes = await storage.getNotes(req.user.id);
      console.log(`[GET /api/notes] Recuperate ${notes.length} note con successo`);
      res.json(notes);
    } catch (error) {
      console.error("[GET /api/notes] Errore nel recupero delle note:", error);
      res.status(500).json({ 
        error: "Errore nel recupero delle note", 
        details: error instanceof Error ? error.message : "Errore sconosciuto" 
      });
    }
  });

  app.post("/api/notes", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.id) {
        console.error("[POST /api/notes] Creazione nota fallita: Utente non autenticato");
        return res.sendStatus(401);
      }

      console.log("[POST /api/notes] Richiesta ricevuta:", {
        userId: req.user.id,
        title: req.body.title,
        contentLength: req.body.content?.length || 0,
        attachmentsCount: req.body.attachments?.length || 0
      });

      if (!req.body.title || !req.body.content) {
        console.error("[POST /api/notes] Validazione fallita: titolo o contenuto mancante");
        return res.status(400).json({ error: "Titolo e contenuto sono obbligatori" });
      }

      console.log("[POST /api/notes] Inizio creazione nota nel database");
      const note = await storage.createNote(req.user.id, req.body);
      console.log(`[POST /api/notes] Nota creata con successo, ID: ${note.id}`);
      res.status(201).json(note);
    } catch (error) {
      console.error("[POST /api/notes] Errore durante la creazione della nota:", error);
      res.status(500).json({
        error: "Errore nella creazione della nota",
        details: error instanceof Error ? error.message : "Errore sconosciuto"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}