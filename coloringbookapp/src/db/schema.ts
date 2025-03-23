import { pgTable, serial, text, timestamp, json } from "drizzle-orm/pg-core";

// Table for storing generated images
export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  uuid: text("uuid").notNull().unique(), // External ID used in URLs
  prompt: text("prompt").notNull(),
  imageUrl: text("image_url").notNull(),
  masks: json("masks"), // Store segmentation masks as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Table for storing user drawings
export const drawings = pgTable("drawings", {
  id: serial("id").primaryKey(),
  imageId: text("image_id").notNull().references(() => images.uuid), 
  lines: json("lines").notNull(), // Store the drawing data as JSON
  fills: json("fills"), // Store fill data as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}); 