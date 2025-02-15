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
    url: string;
    fileName: string;
    mimeType: string;
    size: number;
  }[]>(),
  userId: serial("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).extend({
  password: z.string().min(6, "La password deve essere di almeno 6 caratteri"),
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

const attachmentSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().url("URL non valido"),
  fileName: z.string().max(255, "Nome file troppo lungo"),
  mimeType: z.string().refine(
    (mime) => [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].includes(mime),
    "Tipo di file non supportato"
  ),
  size: z.number().max(MAX_FILE_SIZE, "File troppo grande (max 5MB)"),
});

export const insertNoteSchema = createInsertSchema(notes, {
  title: z.string().min(1, "Il titolo è obbligatorio").max(255, "Titolo troppo lungo"),
  content: z.string().min(1, "Il contenuto è obbligatorio"),
  attachments: z.array(attachmentSchema)
    .max(5, "Massimo 5 allegati per nota")
    .optional()
    .transform(val => val || []),
}).omit({ userId: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;