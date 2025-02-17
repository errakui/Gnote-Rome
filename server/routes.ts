import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import express from "express";
import { insertNoteSchema } from "@shared/schema";
import { z } from "zod";
import { join } from 'path';

export function registerRoutes(app: Express): Server {
  // Aumenta il limite del body parser per gestire gli allegati
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  setupAuth(app);

  // API Routes
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

  app.get("/api/notes/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.id) {
      console.log("Tentativo di accesso non autorizzato alla nota");
      return res.sendStatus(401);
    }

    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) {
      return res.status(400).json({ error: "ID nota non valido" });
    }

    try {
      console.log(`[GET /api/notes/:id] Recupero nota ID: ${noteId}`);
      const note = await storage.getNote(noteId, req.user.id);

      if (!note) {
        console.log(`[GET /api/notes/:id] Nota non trovata: ${noteId}`);
        return res.status(404).json({ error: "Nota non trovata" });
      }

      console.log(`[GET /api/notes/:id] Nota recuperata con successo: ${noteId}`);
      res.json(note);
    } catch (error) {
      console.error("[GET /api/notes/:id] Errore nel recupero della nota:", error);
      res.status(500).json({ 
        error: "Errore nel recupero della nota",
        details: error instanceof Error ? error.message : "Errore sconosciuto"
      });
    }
  });

  app.patch("/api/notes/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.id) {
      console.log("Tentativo di modifica non autorizzato della nota");
      return res.sendStatus(401);
    }

    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) {
      return res.status(400).json({ error: "ID nota non valido" });
    }

    try {
      console.log(`[PATCH /api/notes/:id] Aggiornamento nota ID: ${noteId}`);

      // Validiamo i dati di aggiornamento
      const updateSchema = insertNoteSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        console.log("[PATCH /api/notes/:id] Dati di aggiornamento non validi");
        return res.status(400).json({ error: validationResult.error.errors });
      }

      const updatedNote = await storage.updateNote(noteId, req.user.id, req.body);

      if (!updatedNote) {
        console.log(`[PATCH /api/notes/:id] Nota non trovata: ${noteId}`);
        return res.status(404).json({ error: "Nota non trovata" });
      }

      console.log(`[PATCH /api/notes/:id] Nota aggiornata con successo: ${noteId}`);
      res.json(updatedNote);
    } catch (error) {
      console.error("[PATCH /api/notes/:id] Errore nell'aggiornamento della nota:", error);
      res.status(500).json({
        error: "Errore nell'aggiornamento della nota",
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

      console.log("[POST /api/notes] Corpo richiesta ricevuto:", req.body);

      const { title, content } = req.body;

      if (!title?.trim() || !content?.trim()) {
        console.error("[POST /api/notes] Validazione fallita: titolo o contenuto mancante", {
          title: title?.trim(),
          contentLength: content?.trim()?.length
        });
        return res.status(400).json({ error: "Titolo e contenuto sono obbligatori" });
      }

      console.log("[POST /api/notes] Inizio creazione nota nel database");
      const note = await storage.createNote(req.user.id, {
        title: title.trim(),
        content: content.trim(),
        attachments: req.body.attachments || []
      });

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

  app.delete("/api/notes/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.id) {
      console.log("Tentativo di eliminazione non autorizzato della nota");
      return res.sendStatus(401);
    }

    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) {
      return res.status(400).json({ error: "ID nota non valido" });
    }

    try {
      console.log(`[DELETE /api/notes/:id] Eliminazione nota ID: ${noteId}`);
      const success = await storage.deleteNote(noteId, req.user.id);

      if (!success) {
        console.log(`[DELETE /api/notes/:id] Nota non trovata: ${noteId}`);
        return res.status(404).json({ error: "Nota non trovata" });
      }

      console.log(`[DELETE /api/notes/:id] Nota eliminata con successo: ${noteId}`);
      res.sendStatus(200);
    } catch (error) {
      console.error("[DELETE /api/notes/:id] Errore nell'eliminazione della nota:", error);
      res.status(500).json({
        error: "Errore nell'eliminazione della nota",
        details: error instanceof Error ? error.message : "Errore sconosciuto"
      });
    }
  });

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    console.log("Configurazione file statici per produzione");
    const staticPath = join(process.cwd(), 'dist', 'public');
    console.log("Path file statici:", staticPath);

    app.use(express.static(staticPath));

    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.sendStatus(404);
      }
      console.log("Serving index.html per:", req.path);
      res.sendFile(join(staticPath, 'index.html'));
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}