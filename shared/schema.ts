import { sql } from "drizzle-orm";
import { text, serial, timestamp, pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  userId: serial("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Schema per la validazione dell'input
export const insertUserSchema = createInsertSchema(users).extend({
  password: z.string().min(6, "La password deve essere di almeno 6 caratteri"),
});

export const insertNoteSchema = createInsertSchema(notes, {
  title: z.string().min(1, "Il titolo è obbligatorio"),
  content: z.string()
    .min(1, "Il contenuto è obbligatorio")
    .max(156, "Il contenuto non può superare i 156 byte")
}).omit({ userId: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;