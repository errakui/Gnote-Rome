import { notes, users, type User, type InsertUser, type Note, type InsertNote } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getNotes(userId: number): Promise<Note[]>;
  createNote(userId: number, note: InsertNote): Promise<Note>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getNotes(userId: number): Promise<Note[]> {
    return await db.select().from(notes).where(eq(notes.userId, userId));
  }

  async createNote(userId: number, insertNote: InsertNote): Promise<Note> {
    try {
      console.log("Tentativo di creazione nota con dati:", {
        userId,
        title: insertNote.title,
        contentLength: insertNote.content?.length,
        attachmentsCount: insertNote.attachments?.length
      });

      // Validazione base
      if (!userId) {
        throw new Error("ID utente non valido");
      }

      if (!insertNote.title || !insertNote.content) {
        throw new Error("Titolo e contenuto sono obbligatori");
      }

      // Gestione allegati
      let processedAttachments = null;
      if (insertNote.attachments && insertNote.attachments.length > 0) {
        const totalSize = insertNote.attachments.reduce((sum, att) => sum + att.data.length, 0);
        console.log("Dimensione totale allegati:", totalSize / 1024 / 1024, "MB");

        // Validazione dimensione totale aumentata a 50MB
        if (totalSize > 50 * 1024 * 1024) {
          throw new Error("La dimensione totale degli allegati supera i 50MB");
        }
        processedAttachments = insertNote.attachments;
      }

      console.log("Inserimento nota nel database...");
      const [note] = await db.insert(notes).values({
        userId,
        title: insertNote.title,
        content: insertNote.content,
        attachments: processedAttachments,
      }).returning();

      console.log("Nota creata con successo:", note.id);
      return note;
    } catch (error) {
      console.error("Errore durante la creazione della nota:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();