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

      const note = await storage.createNote(req.user.id, req.body);
      console.log("Note created successfully:", note.id);
      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating note:", error);
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}