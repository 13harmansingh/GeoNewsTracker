import { pgTable, text, serial, integer, boolean, real, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const newsArticles = pgTable("news_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  imageUrl: text("image_url"),
  isBreaking: boolean("is_breaking").default(false),
  views: integer("views").default(0),
  publishedAt: timestamp("published_at").defaultNow(),
  location: text("location").notNull(),
  sourceUrl: text("source_url"),
  sourceName: text("source_name"),
  country: text("country"),
  language: text("language").default("en"),
  externalId: text("external_id"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

// Pro subscriptions table
export const proSubscriptions = pgTable("pro_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  stripeSessionId: varchar("stripe_session_id"),
  isActive: boolean("is_active").default(true),
  purchasedAt: timestamp("purchased_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// Bias analysis table
export const biasAnalyses = pgTable("bias_analyses", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => newsArticles.id),
  aiPrediction: text("ai_prediction"), // left, center, right
  aiConfidence: real("ai_confidence"), // 0-1
  manualTag: text("manual_tag"), // left, center, right
  aiSummary: text("ai_summary"),
  taggedBy: varchar("tagged_by").references(() => users.id),
  taggedAt: timestamp("tagged_at").defaultNow(),
});

// Media ownership data
export const mediaOwnership = pgTable("media_ownership", {
  id: serial("id").primaryKey(),
  sourceName: text("source_name").notNull().unique(),
  ownershipData: jsonb("ownership_data").notNull(), // { "BlackRock": 55, "AT&T": 31.3, ... }
});

// Witness reports
export const witnessReports = pgTable("witness_reports", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").references(() => newsArticles.id),
  content: text("content").notNull(),
  voiceNoteUrl: text("voice_note_url"),
  anonymousUsername: text("anonymous_username").notNull(),
  location: text("location"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Event history
export const eventHistory = pgTable("event_history", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // 'news', 'tag', 'report'
  articleId: integer("article_id").references(() => newsArticles.id),
  reportId: integer("report_id").references(() => witnessReports.id),
  biasId: integer("bias_id").references(() => biasAnalyses.id),
  country: text("country"),
  location: text("location"),
  summary: text("summary").notNull(),
  metadata: jsonb("metadata"), // Additional data
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNewsArticleSchema = createInsertSchema(newsArticles).omit({
  id: true,
  views: true,
  publishedAt: true,
});

export const insertProSubscriptionSchema = createInsertSchema(proSubscriptions).omit({
  id: true,
  purchasedAt: true,
});

export const insertBiasAnalysisSchema = createInsertSchema(biasAnalyses).omit({
  id: true,
  taggedAt: true,
});

export const insertMediaOwnershipSchema = createInsertSchema(mediaOwnership).omit({
  id: true,
});

export const insertWitnessReportSchema = createInsertSchema(witnessReports).omit({
  id: true,
  createdAt: true,
});

export const insertEventHistorySchema = createInsertSchema(eventHistory).omit({
  id: true,
  createdAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewsArticle = typeof newsArticles.$inferSelect & {
  isLocationCreated?: boolean; // For user-created location markers
};
export type InsertNewsArticle = z.infer<typeof insertNewsArticleSchema>;
export type ProSubscription = typeof proSubscriptions.$inferSelect;
export type InsertProSubscription = z.infer<typeof insertProSubscriptionSchema>;
export type BiasAnalysis = typeof biasAnalyses.$inferSelect;
export type InsertBiasAnalysis = z.infer<typeof insertBiasAnalysisSchema>;
export type MediaOwnership = typeof mediaOwnership.$inferSelect;
export type InsertMediaOwnership = z.infer<typeof insertMediaOwnershipSchema>;
export type WitnessReport = typeof witnessReports.$inferSelect;
export type InsertWitnessReport = z.infer<typeof insertWitnessReportSchema>;
export type EventHistory = typeof eventHistory.$inferSelect;
export type InsertEventHistory = z.infer<typeof insertEventHistorySchema>;
