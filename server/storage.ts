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
    console.log("Inizio creazione nota per utente:", userId);
    console.log("Dati nota:", {
      titolo: insertNote.title,
      lunghezza_contenuto: insertNote.content.length,
      numero_allegati: insertNote.attachments?.length || 0
    });

    try {
      // Validazione degli allegati
      if (insertNote.attachments) {
        console.log("Validazione allegati...");
        insertNote.attachments.forEach((attachment, index) => {
          if (!attachment.type || !attachment.data || !attachment.fileName || !attachment.mimeType) {
            console.error("Allegato invalido all'indice:", index, "Dati allegato:", {
              type: !!attachment.type,
              data: !!attachment.data,
              fileName: !!attachment.fileName,
              mimeType: !!attachment.mimeType
            });
            throw new Error(`Allegato invalido all'indice ${index}`);
          }
        });
        console.log("Validazione allegati completata con successo");
      }

      // Creazione nota nel database
      console.log("Inserimento nota nel database...");
      const [note] = await db
        .insert(notes)
        .values({
          userId,
          title: insertNote.title,
          content: insertNote.content,
          attachments: insertNote.attachments || null
        })
        .returning();

      console.log("Nota creata con successo:", {
        id: note.id,
        titolo: note.title,
        numero_allegati: note.attachments?.length || 0
      });

      return note;
    } catch (error) {
      console.error("Errore durante la creazione della nota:", error);
      throw new Error(`Errore durante la creazione della nota: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }
}

export const storage = new DatabaseStorage();