import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.get("/api/notes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    const notes = await storage.getNotes(req.user.id);
    res.json(notes);
  });

  app.post("/api/notes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.error("Note creation failed: User not authenticated");
        return res.sendStatus(401);
      }

      console.log("Creating note with data:", {
        userId: req.user.id,
        title: req.body.title,
        contentLength: req.body.content?.length || 0,
        hasAttachments: Boolean(req.body.attachments?.length)
      });

      // Verifica dimensione richiesta
      const contentLength = parseInt(req.get('content-length') || '0');
      const limit = 10 * 1024 * 1024; // 10MB in bytes

      console.log("Request size:", {
        contentLength,
        limit,
        exceedsLimit: contentLength > limit
      });

      if (contentLength > limit) {
        return res.status(413).json({
          error: "La dimensione totale della richiesta supera il limite di 10MB"
        });
      }

      // Log dettagli allegati
      if (req.body.attachments) {
        const attachmentsInfo = req.body.attachments.map(att => ({
          type: att.type,
          fileSize: att.data.length,
          fileName: att.fileName
        }));
        console.log("Attachments info:", attachmentsInfo);
      }

      const note = await storage.createNote(req.user.id, req.body);
      console.log("Note created successfully:", note.id);
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