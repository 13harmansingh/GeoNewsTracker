import { 
  users, newsArticles, proSubscriptions, biasAnalyses, mediaOwnership, witnessReports, eventHistory,
  type User, type UpsertUser, type NewsArticle, type InsertNewsArticle,
  type ProSubscription, type InsertProSubscription,
  type BiasAnalysis, type InsertBiasAnalysis,
  type MediaOwnership, type InsertMediaOwnership,
  type WitnessReport, type InsertWitnessReport,
  type EventHistory, type InsertEventHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // News methods
  getNewsArticles(): Promise<NewsArticle[]>;
  getNewsArticlesByLocation(lat: number, lng: number, radius?: number): Promise<NewsArticle[]>;
  getNewsArticlesByCategory(category: string): Promise<NewsArticle[]>;
  getNewsArticle(id: number): Promise<NewsArticle | undefined>;
  createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle>;
  incrementViews(id: number): Promise<void>;
  
  // Pro subscription methods
  getProSubscription(userId: string): Promise<ProSubscription | undefined>;
  createProSubscription(subscription: InsertProSubscription): Promise<ProSubscription>;
  
  // Bias analysis methods
  getBiasAnalysis(articleId: number): Promise<BiasAnalysis | undefined>;
  createBiasAnalysis(analysis: InsertBiasAnalysis): Promise<BiasAnalysis>;
  updateBiasAnalysis(id: number, data: Partial<InsertBiasAnalysis>): Promise<BiasAnalysis>;
  
  // Media ownership methods
  getMediaOwnership(sourceName: string): Promise<MediaOwnership | undefined>;
  getAllMediaOwnership(): Promise<MediaOwnership[]>;
  createMediaOwnership(ownership: InsertMediaOwnership): Promise<MediaOwnership>;
  
  // Witness report methods
  getWitnessReports(articleId?: number): Promise<WitnessReport[]>;
  createWitnessReport(report: InsertWitnessReport): Promise<WitnessReport>;
  
  // Event history methods
  getEventHistory(limit?: number): Promise<EventHistory[]>;
  createEventHistory(event: InsertEventHistory): Promise<EventHistory>;
}

class MemStorage implements IStorage {
  private users: Map<string, User>;
  private newsArticles: Map<number, NewsArticle>;
  private proSubscriptions: Map<string, ProSubscription>;
  private biasAnalyses: Map<number, BiasAnalysis>;
  private mediaOwnership: Map<string, MediaOwnership>;
  private witnessReports: WitnessReport[];
  private eventHistory: EventHistory[];
  private currentNewsId: number;
  private currentProId: number;
  private currentBiasId: number;
  private currentOwnershipId: number;
  private currentReportId: number;
  private currentEventId: number;

  constructor() {
    this.users = new Map();
    this.newsArticles = new Map();
    this.proSubscriptions = new Map();
    this.biasAnalyses = new Map();
    this.mediaOwnership = new Map();
    this.witnessReports = [];
    this.eventHistory = [];
    this.currentNewsId = 1;
    this.currentProId = 1;
    this.currentBiasId = 1;
    this.currentOwnershipId = 1;
    this.currentReportId = 1;
    this.currentEventId = 1;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user: User = {
      id: userData.id || crypto.randomUUID(),
      email: userData.email ?? null,
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async getNewsArticles(): Promise<NewsArticle[]> {
    return Array.from(this.newsArticles.values());
  }

  async getNewsArticlesByLocation(lat: number, lng: number, radius: number = 0.01): Promise<NewsArticle[]> {
    return Array.from(this.newsArticles.values()).filter((article: NewsArticle) => {
      const distance = Math.sqrt(
        Math.pow(article.latitude - lat, 2) + Math.pow(article.longitude - lng, 2)
      );
      return distance <= radius;
    });
  }

  async getNewsArticlesByCategory(category: string): Promise<NewsArticle[]> {
    return Array.from(this.newsArticles.values()).filter(
      (article: NewsArticle) => article.category.toLowerCase() === category.toLowerCase()
    );
  }

  async getNewsArticle(id: number): Promise<NewsArticle | undefined> {
    return this.newsArticles.get(id);
  }

  async createNewsArticle(insertArticle: InsertNewsArticle): Promise<NewsArticle> {
    const id = this.currentNewsId++;
    const article: NewsArticle = {
      id,
      title: insertArticle.title,
      summary: insertArticle.summary,
      content: insertArticle.content,
      category: insertArticle.category,
      latitude: insertArticle.latitude,
      longitude: insertArticle.longitude,
      location: insertArticle.location,
      imageUrl: insertArticle.imageUrl ?? null,
      isBreaking: insertArticle.isBreaking ?? null,
      views: 0,
      publishedAt: new Date(),
      sourceUrl: insertArticle.sourceUrl ?? null,
      sourceName: insertArticle.sourceName ?? null,
      country: insertArticle.country ?? null,
      language: insertArticle.language ?? null,
      externalId: insertArticle.externalId ?? null,
    };
    this.newsArticles.set(id, article);
    return article;
  }

  async incrementViews(id: number): Promise<void> {
    const article = this.newsArticles.get(id);
    if (article) {
      article.views = (article.views || 0) + 1;
      this.newsArticles.set(id, article);
    }
  }

  async getProSubscription(userId: string): Promise<ProSubscription | undefined> {
    return this.proSubscriptions.get(userId);
  }

  async createProSubscription(subscription: InsertProSubscription): Promise<ProSubscription> {
    const sub: ProSubscription = {
      id: this.currentProId++,
      userId: subscription.userId,
      stripeSessionId: subscription.stripeSessionId ?? null,
      isActive: subscription.isActive ?? true,
      purchasedAt: new Date(),
      expiresAt: subscription.expiresAt ?? null,
    };
    this.proSubscriptions.set(subscription.userId, sub);
    return sub;
  }

  async getBiasAnalysis(articleId: number): Promise<BiasAnalysis | undefined> {
    return this.biasAnalyses.get(articleId);
  }

  async createBiasAnalysis(analysis: InsertBiasAnalysis): Promise<BiasAnalysis> {
    const bias: BiasAnalysis = {
      id: this.currentBiasId++,
      articleId: analysis.articleId,
      aiPrediction: analysis.aiPrediction ?? null,
      aiConfidence: analysis.aiConfidence ?? null,
      manualTag: analysis.manualTag ?? null,
      aiSummary: analysis.aiSummary ?? null,
      taggedBy: analysis.taggedBy ?? null,
      taggedAt: new Date(),
    };
    this.biasAnalyses.set(analysis.articleId, bias);
    return bias;
  }

  async updateBiasAnalysis(id: number, data: Partial<InsertBiasAnalysis>): Promise<BiasAnalysis> {
    const existing = Array.from(this.biasAnalyses.values()).find(b => b.id === id);
    if (!existing) {
      throw new Error("Bias analysis not found");
    }
    const updated: BiasAnalysis = { ...existing, ...data };
    this.biasAnalyses.set(existing.articleId, updated);
    return updated;
  }

  async getMediaOwnership(sourceName: string): Promise<MediaOwnership | undefined> {
    return this.mediaOwnership.get(sourceName);
  }

  async getAllMediaOwnership(): Promise<MediaOwnership[]> {
    return Array.from(this.mediaOwnership.values());
  }

  async createMediaOwnership(ownership: InsertMediaOwnership): Promise<MediaOwnership> {
    const media: MediaOwnership = {
      id: this.currentOwnershipId++,
      sourceName: ownership.sourceName,
      ownershipData: ownership.ownershipData,
    };
    this.mediaOwnership.set(ownership.sourceName, media);
    return media;
  }

  async getWitnessReports(articleId?: number): Promise<WitnessReport[]> {
    if (articleId !== undefined) {
      return this.witnessReports.filter(r => r.articleId === articleId);
    }
    return this.witnessReports;
  }

  async createWitnessReport(report: InsertWitnessReport): Promise<WitnessReport> {
    const witnessReport: WitnessReport = {
      id: this.currentReportId++,
      articleId: report.articleId ?? null,
      content: report.content,
      voiceNoteUrl: report.voiceNoteUrl ?? null,
      anonymousUsername: report.anonymousUsername,
      location: report.location ?? null,
      latitude: report.latitude ?? null,
      longitude: report.longitude ?? null,
      createdAt: new Date(),
    };
    this.witnessReports.push(witnessReport);
    return witnessReport;
  }

  async getEventHistory(limit: number = 50): Promise<EventHistory[]> {
    return this.eventHistory.slice(0, limit);
  }

  async createEventHistory(event: InsertEventHistory): Promise<EventHistory> {
    const historyEvent: EventHistory = {
      id: this.currentEventId++,
      eventType: event.eventType,
      articleId: event.articleId ?? null,
      reportId: event.reportId ?? null,
      biasId: event.biasId ?? null,
      country: event.country ?? null,
      location: event.location ?? null,
      summary: event.summary,
      metadata: event.metadata ?? null,
      createdAt: new Date(),
    };
    this.eventHistory.unshift(historyEvent); // Add to beginning for recent first
    return historyEvent;
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getNewsArticles(): Promise<NewsArticle[]> {
    return await db.select().from(newsArticles);
  }

  async getNewsArticlesByLocation(lat: number, lng: number, radius: number = 0.01): Promise<NewsArticle[]> {
    const articles = await db.select().from(newsArticles);
    return articles.filter((article: NewsArticle) => {
      const distance = Math.sqrt(
        Math.pow(article.latitude - lat, 2) + Math.pow(article.longitude - lng, 2)
      );
      return distance <= radius;
    });
  }

  async getNewsArticlesByCategory(category: string): Promise<NewsArticle[]> {
    const articles = await db.select().from(newsArticles);
    return articles.filter(
      (article: NewsArticle) => article.category.toLowerCase() === category.toLowerCase()
    );
  }

  async getNewsArticle(id: number): Promise<NewsArticle | undefined> {
    const [article] = await db.select().from(newsArticles).where(eq(newsArticles.id, id));
    return article;
  }

  async createNewsArticle(insertArticle: InsertNewsArticle): Promise<NewsArticle> {
    const [article] = await db
      .insert(newsArticles)
      .values(insertArticle)
      .returning();
    return article;
  }

  async incrementViews(id: number): Promise<void> {
    await db
      .update(newsArticles)
      .set({ views: sql`${newsArticles.views} + 1` })
      .where(eq(newsArticles.id, id));
  }

  async getProSubscription(userId: string): Promise<ProSubscription | undefined> {
    const [sub] = await db.select().from(proSubscriptions).where(eq(proSubscriptions.userId, userId));
    return sub;
  }

  async createProSubscription(subscription: InsertProSubscription): Promise<ProSubscription> {
    const [sub] = await db.insert(proSubscriptions).values(subscription).returning();
    return sub;
  }

  async getBiasAnalysis(articleId: number): Promise<BiasAnalysis | undefined> {
    const [analysis] = await db.select().from(biasAnalyses).where(eq(biasAnalyses.articleId, articleId));
    return analysis;
  }

  async createBiasAnalysis(analysis: InsertBiasAnalysis): Promise<BiasAnalysis> {
    const [bias] = await db.insert(biasAnalyses).values(analysis).returning();
    return bias;
  }

  async updateBiasAnalysis(id: number, data: Partial<InsertBiasAnalysis>): Promise<BiasAnalysis> {
    const [bias] = await db.update(biasAnalyses).set(data).where(eq(biasAnalyses.id, id)).returning();
    return bias;
  }

  async getMediaOwnership(sourceName: string): Promise<MediaOwnership | undefined> {
    const [ownership] = await db.select().from(mediaOwnership).where(eq(mediaOwnership.sourceName, sourceName));
    return ownership;
  }

  async getAllMediaOwnership(): Promise<MediaOwnership[]> {
    return await db.select().from(mediaOwnership);
  }

  async createMediaOwnership(ownership: InsertMediaOwnership): Promise<MediaOwnership> {
    const [media] = await db.insert(mediaOwnership).values(ownership).returning();
    return media;
  }

  async getWitnessReports(articleId?: number): Promise<WitnessReport[]> {
    if (articleId !== undefined) {
      return await db.select().from(witnessReports).where(eq(witnessReports.articleId, articleId));
    }
    return await db.select().from(witnessReports).orderBy(desc(witnessReports.createdAt));
  }

  async createWitnessReport(report: InsertWitnessReport): Promise<WitnessReport> {
    const [witnessReport] = await db.insert(witnessReports).values(report).returning();
    return witnessReport;
  }

  async getEventHistory(limit: number = 50): Promise<EventHistory[]> {
    return await db.select().from(eventHistory).orderBy(desc(eventHistory.createdAt)).limit(limit);
  }

  async createEventHistory(event: InsertEventHistory): Promise<EventHistory> {
    const [historyEvent] = await db.insert(eventHistory).values(event).returning();
    return historyEvent;
  }
}

export const storage: IStorage = db ? new DatabaseStorage() : new MemStorage();
