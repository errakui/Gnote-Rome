import { notes, users, type User, type InsertUser, type Note, type InsertNote } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresStore = connectPg(session);
const sessionStore = new PostgresStore({
  pool,
  tableName: 'session',
  createTableIfMissing: true
});

sessionStore.on('error', (error) => {
  console.error('Errore SessionStore:', error);
});

export { sessionStore };

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
    this.sessionStore = new PostgresStore({
      pool,
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    console.log("[Storage] Ricerca utente con ID:", id);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    console.log("[Storage] Utente trovato:", user ? "Sì" : "No");
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log("[Storage] Ricerca utente con username:", username);
    const [user] = await db.select().from(users).where(eq(users.username, username));
    console.log("[Storage] Utente trovato:", user ? "Sì" : "No");
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log("[Storage] Creazione nuovo utente:", insertUser.username);
    const [user] = await db.insert(users).values(insertUser).returning();
    console.log("[Storage] Nuovo utente creato con ID:", user.id);
    return user;
  }

  async getNotes(userId: number): Promise<Note[]> {
    console.log("[Storage] Recupero note per utente ID:", userId);
    const notesList = await db.select().from(notes).where(eq(notes.userId, userId));
    console.log("[Storage] Numero di note trovate:", notesList.length);
    return notesList;
  }

  async createNote(userId: number, insertNote: InsertNote): Promise<Note> {
    try {
      console.log("[Storage] Inizio creazione nota:", {
        userId,
        title: insertNote.title,
        contentLength: insertNote.content?.length,
        attachmentsCount: insertNote.attachments?.length
      });

      // Validazione base
      if (!userId) {
        const error = new Error("ID utente non valido");
        console.error("[Storage] Errore validazione:", error.message);
        throw error;
      }

      if (!insertNote.title || !insertNote.content) {
        const error = new Error("Titolo e contenuto sono obbligatori");
        console.error("[Storage] Errore validazione:", error.message);
        throw error;
      }

      // Gestione allegati
      let processedAttachments = null;
      if (insertNote.attachments && insertNote.attachments.length > 0) {
        console.log("[Storage] Processamento allegati...");
        const totalSize = insertNote.attachments.reduce((sum, att) => sum + att.data.length, 0);
        console.log("[Storage] Dimensione totale allegati:", totalSize / 1024 / 1024, "MB");

        if (totalSize > 10 * 1024 * 1024) {
          const error = new Error("La dimensione totale degli allegati supera i 10MB");
          console.error("[Storage] Errore dimensione allegati:", error.message);
          throw error;
        }
        processedAttachments = insertNote.attachments;
        console.log("[Storage] Allegati processati con successo");
      }

      console.log("[Storage] Inserimento nota nel database...");
      const [note] = await db.insert(notes).values({
        userId,
        title: insertNote.title,
        content: insertNote.content,
        attachments: processedAttachments,
      }).returning();

      console.log("[Storage] Nota creata con successo:", {
        noteId: note.id,
        userId: note.userId,
        hasAttachments: !!note.attachments
      });

      return note;
    } catch (error) {
      console.error("[Storage] Errore critico durante la creazione della nota:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();