import { pgTable, text, integer, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

/**
 * Database schema for the record collection
 * Stores information about vinyl records fetched from Discogs or entered manually
 *
 * Important: This schema preserves non-ASCII characters in artist names and album titles
 */
export const recordsTable = pgTable("records", {
  // Primary key - UUID for unique identification
  recordId: uuid("record_id").primaryKey().defaultRandom(),

  // Core record information
  // Note: text type is used to preserve non-ASCII characters (e.g., Björk, Motörhead, etc.)
  artistName: text("artist_name").notNull(),
  albumTitle: text("album_title").notNull(),

  // Release information
  yearReleased: integer("year_released"),
  labelName: text("label_name"),

  // Discogs-specific data
  catalogNumber: text("catalog_number"),
  discogsId: text("discogs_id").unique(),
  discogsUri: text("discogs_uri"),
  isSyncedWithDiscogs: boolean("is_synced_with_discogs").default(false).notNull(),

  // Album artwork
  thumbnailUrl: text("thumbnail_url"),
  coverImageUrl: text("cover_image_url"),

  // Additional metadata
  genres: text("genres").array(),
  styles: text("styles").array(),
  upcCode: text("upc_code"),

  // Vinyl-specific information
  recordSize: text("record_size"), // e.g., "12\"", "7\"", "10\""
  vinylColor: text("vinyl_color"), // e.g., "Black", "Clear", "Blue Marble"
  isShapedVinyl: boolean("is_shaped_vinyl").default(false), // true if not round (picture disc, shaped, etc.)

  // Data source tracking
  dataSource: text("data_source").notNull().default("discogs"), // 'discogs' or 'manual'

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * TypeScript type for a record in the database
 */
export type Record = typeof recordsTable.$inferSelect;

/**
 * TypeScript type for inserting a new record into the database
 */
export type NewRecord = typeof recordsTable.$inferInsert;
