import { users, newsArticles, type User, type InsertUser, type NewsArticle, type InsertNewsArticle } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // News methods
  getNewsArticles(): Promise<NewsArticle[]>;
  getNewsArticlesByLocation(lat: number, lng: number, radius?: number): Promise<NewsArticle[]>;
  getNewsArticlesByCategory(category: string): Promise<NewsArticle[]>;
  getNewsArticle(id: number): Promise<NewsArticle | undefined>;
  createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle>;
  incrementViews(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private newsArticles: Map<number, NewsArticle>;
  private currentUserId: number;
  private currentNewsId: number;

  constructor() {
    this.users = new Map();
    this.newsArticles = new Map();
    this.currentUserId = 1;
    this.currentNewsId = 1;
    
    // Initialize with sample news data
    this.initializeSampleNews();
  }

  private initializeSampleNews() {
    const sampleNews: Omit<NewsArticle, 'id'>[] = [
      {
        title: "Major Infrastructure Development Announced",
        summary: "City officials have announced a significant infrastructure project that will transform the downtown area with new transit lines and public spaces.",
        content: "The comprehensive infrastructure development plan includes new subway lines, expanded bus routes, and the creation of several public parks. The project is expected to be completed over the next three years.",
        category: "BREAKING",
        latitude: 40.7589,
        longitude: -73.9851,
        imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        isBreaking: true,
        views: 1200,
        publishedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        location: "Downtown Manhattan"
      },
      {
        title: "New Community Center Opens",
        summary: "The long-awaited community center has officially opened its doors to residents with state-of-the-art facilities and programs.",
        content: "The new community center features a gymnasium, library, computer lab, and meeting rooms. It will serve as a hub for local activities and programs.",
        category: "LOCAL",
        latitude: 40.7505,
        longitude: -73.9934,
        imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        isBreaking: false,
        views: 850,
        publishedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        location: "Chelsea"
      },
      {
        title: "Traffic Pattern Changes Downtown",
        summary: "New traffic flow improvements are being implemented to reduce congestion and improve pedestrian safety in the business district.",
        content: "The changes include new bike lanes, adjusted traffic light timing, and improved crosswalk signals. The initiative aims to reduce commute times by 15%.",
        category: "CIVIC",
        latitude: 40.7614,
        longitude: -73.9776,
        imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        isBreaking: false,
        views: 650,
        publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        location: "Midtown East"
      },
      {
        title: "Local Team Advances to Championships",
        summary: "The city's professional team has secured their spot in the upcoming championship series after a decisive victory last night.",
        content: "In a thrilling match that went into overtime, the team demonstrated exceptional skill and teamwork. The championship series begins next month.",
        category: "SPORTS",
        latitude: 40.7282,
        longitude: -73.7949,
        imageUrl: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        isBreaking: false,
        views: 2100,
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        location: "Queens"
      }
    ];

    sampleNews.forEach(article => {
      const id = this.currentNewsId++;
      this.newsArticles.set(id, { ...article, id });
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getNewsArticles(): Promise<NewsArticle[]> {
    return Array.from(this.newsArticles.values());
  }

  async getNewsArticlesByLocation(lat: number, lng: number, radius: number = 0.01): Promise<NewsArticle[]> {
    return Array.from(this.newsArticles.values()).filter(article => {
      const distance = Math.sqrt(
        Math.pow(article.latitude - lat, 2) + Math.pow(article.longitude - lng, 2)
      );
      return distance <= radius;
    });
  }

  async getNewsArticlesByCategory(category: string): Promise<NewsArticle[]> {
    return Array.from(this.newsArticles.values()).filter(
      article => article.category.toLowerCase() === category.toLowerCase()
    );
  }

  async getNewsArticle(id: number): Promise<NewsArticle | undefined> {
    return this.newsArticles.get(id);
  }

  async createNewsArticle(insertArticle: InsertNewsArticle): Promise<NewsArticle> {
    const id = this.currentNewsId++;
    const article: NewsArticle = {
      ...insertArticle,
      id,
      views: 0,
      publishedAt: new Date(),
      imageUrl: insertArticle.imageUrl || null,
      isBreaking: insertArticle.isBreaking || false,
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

export const storage = new MemStorage();
