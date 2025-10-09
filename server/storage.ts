import { users, newsArticles, type User, type UpsertUser, type NewsArticle, type InsertNewsArticle } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
}

class MemStorage implements IStorage {
  private users: Map<string, User>;
  private newsArticles: Map<number, NewsArticle>;
  private currentNewsId: number;

  constructor() {
    this.users = new Map();
    this.newsArticles = new Map();
    this.currentNewsId = 1;
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
      .set({ views: db.$increment(newsArticles.views, 1) })
      .where(eq(newsArticles.id, id));
  }
}

export const storage: IStorage = db ? new DatabaseStorage() : new MemStorage();
