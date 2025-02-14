import { sql } from "drizzle-orm";
import { text, serial, timestamp, pgTable, jsonb } from "drizzle-orm/pg-core";
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
  attachments: jsonb("attachments").$type<{
    type: "image" | "video";
    data: string; // Base64 encrypted data
    fileName: string;
    mimeType: string;
  }[]>(),
  userId: serial("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Schema per la validazione dell'input
export const insertUserSchema = createInsertSchema(users).extend({
  password: z.string().min(6, "La password deve essere di almeno 6 caratteri"),
});

const attachmentSchema = z.object({
  type: z.enum(["image", "video"]),
  data: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
});

export const insertNoteSchema = createInsertSchema(notes, {
  title: z.string().min(1, "Il titolo è obbligatorio"),
  content: z.string().min(1, "Il contenuto è obbligatorio"),
  attachments: z.array(attachmentSchema).optional(),
}).omit({ userId: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;