import { notes, users, type User, type InsertUser, type Note, type InsertNote } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
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
  getNote(noteId: number, userId: number): Promise<Note | undefined>;
  createNote(userId: number, note: InsertNote): Promise<Note>;
  updateNote(noteId: number, userId: number, note: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(noteId: number, userId: number): Promise<boolean>;
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

  async getNote(noteId: number, userId: number): Promise<Note | undefined> {
    console.log("[Storage] Recupero nota ID:", noteId, "per utente ID:", userId);
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
    console.log("[Storage] Nota trovata:", note ? "Sì" : "No");
    return note;
  }

  async createNote(userId: number, insertNote: InsertNote): Promise<Note> {
    console.log("[Storage] Inizio creazione nota:", {
      userId,
      title: insertNote.title,
      contentLength: insertNote.content?.length || 0,
      hasAttachments: insertNote.attachments && insertNote.attachments.length > 0
    });

    try {
      // Validazione base
      if (!userId) {
        console.error("[Storage] ID utente non valido");
        throw new Error("ID utente non valido");
      }

      if (!insertNote.title?.trim() || !insertNote.content?.trim()) {
        console.error("[Storage] Titolo o contenuto mancanti");
        throw new Error("Titolo e contenuto sono obbligatori");
      }

      // Log dei dati prima dell'inserimento
      console.log("[Storage] Dati da inserire:", {
        userId,
        title: insertNote.title,
        contentPresent: !!insertNote.content,
        attachmentsCount: insertNote.attachments?.length || 0
      });

      const [note] = await db.insert(notes).values({
        userId,
        title: insertNote.title.trim(),
        content: insertNote.content.trim(),
        attachments: insertNote.attachments || []
      }).returning();

      console.log("[Storage] Nota creata con successo:", {
        noteId: note.id,
        userId: note.userId,
        hasAttachments: note.attachments && note.attachments.length > 0
      });

      return note;
    } catch (error) {
      console.error("[Storage] Errore durante la creazione della nota:", error);
      throw error;
    }
  }

  async updateNote(noteId: number, userId: number, updateData: Partial<InsertNote>): Promise<Note | undefined> {
    console.log("[Storage] Aggiornamento nota ID:", noteId, "per utente ID:", userId);
    const [updated] = await db.update(notes)
      .set(updateData)
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
      .returning();
    console.log("[Storage] Nota aggiornata:", updated ? "Sì" : "No");
    return updated;
  }

  async deleteNote(noteId: number, userId: number): Promise<boolean> {
    console.log("[Storage] Eliminazione nota ID:", noteId, "per utente ID:", userId);
    try {
      const result = await db.delete(notes)
        .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
      const deleted = result.rowCount === 1;
      console.log("[Storage] Nota eliminata:", deleted);
      return deleted;
    } catch (error) {
      console.error("[Storage] Errore durante l'eliminazione della nota:", error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();