import type { NewsArticle } from "@shared/schema";
import { newsAPIService, type SupportedLanguage } from "./newsApiService";
import { newsService } from "./newsService";
import { redisCache, CacheKeys } from "./redisCache";

// Category detection keywords
const CATEGORY_KEYWORDS = {
  SPORTS: ['sports', 'football', 'soccer', 'basketball', 'cricket', 'tennis', 'olympics', 'championship', 'match', 'game', 'player', 'team', 'league', 'win', 'score'],
  GLOBAL: ['international', 'world', 'global', 'countries', 'united nations', 'summit', 'diplomatic', 'foreign', 'treaty', 'global'],
  TRENDING: ['viral', 'trending', 'popular', 'breaking', 'major', 'significant', 'important', 'urgent', 'alert'],
  TECH: ['technology', 'tech', 'ai', 'artificial intelligence', 'software', 'app', 'digital', 'cyber', 'innovation', 'startup'],
  BUSINESS: ['business', 'economy', 'market', 'stock', 'finance', 'investment', 'trade', 'company', 'corporate', 'earnings'],
  ENTERTAINMENT: ['entertainment', 'movie', 'music', 'celebrity', 'hollywood', 'film', 'actor', 'concert', 'award'],
  HEALTH: ['health', 'medical', 'doctor', 'hospital', 'disease', 'vaccine', 'treatment', 'wellness', 'mental health'],
  SCIENCE: ['science', 'research', 'study', 'discovery', 'space', 'nasa', 'climate', 'environment', 'nature'],
};

interface CachedNews {
  articles: NewsArticle[];
  timestamp: number;
  category?: string;
}

class NewsOrchestrator {
  private cache: Map<string, CachedNews> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private dedupeSet: Set<string> = new Set();

  // Detect category from article content
  detectCategory(article: { title: string; summary: string; category?: string }): string {
    const text = `${article.title} ${article.summary}`.toLowerCase();
    
    // Check explicit category first
    if (article.category && article.category !== 'BREAKING') {
      return article.category;
    }

    // Score each category based on keyword matches
    const scores: Record<string, number> = {};
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      scores[category] = keywords.filter(keyword => text.includes(keyword)).length;
    }

    // Find category with highest score
    const bestCategory = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    
    if (bestCategory && bestCategory[1] > 0) {
      return bestCategory[0];
    }

    // Default to GLOBAL for general news
    return 'GLOBAL';
  }

  // Create unique hash for article deduplication
  private getArticleHash(article: { title: string; sourceName?: string | null }): string {
    return `${article.title.toLowerCase().trim()}-${article.sourceName || 'unknown'}`.replace(/\s+/g, '-');
  }

  // Check if cache is still valid
  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.CACHE_DURATION;
  }

  // Fetch diverse news from multiple categories
  async fetchDiverseNews(language: SupportedLanguage = "en"): Promise<NewsArticle[]> {
    const cacheKey = CacheKeys.news(language);
    
    // Try Redis cache first
    const cachedArticles = await redisCache.get<NewsArticle[]>(cacheKey);
    if (cachedArticles && cachedArticles.length > 0) {
      console.log(`✅ Using Redis cached diverse news (${cachedArticles.length} articles) for language: ${language}`);
      return cachedArticles;
    }
    
    // Fallback to in-memory cache
    if (this.isCacheValid(`diverse-global-${language}`)) {
      const cached = this.cache.get(`diverse-global-${language}`)!.articles;
      console.log(`✅ Using in-memory cached diverse news (${cached.length} articles) for language: ${language}`);
      return cached;
    }

    try {
      // Fetch from NewsAPI with language support
      console.log(`🌍 Fetching diverse news from multiple sources (language: ${language})...`);
      const articles = await newsAPIService.getWorldwideHeadlines(language);
      
      console.log(`📥 Received ${articles.length} raw articles from NewsAPI`);
      
      if (!articles || articles.length === 0) {
        throw new Error('No articles from NewsAPI');
      }

      // Deduplicate and categorize
      const processedArticles = this.processArticles(articles);
      
      // Cache the result in both Redis and in-memory
      await redisCache.set(cacheKey, processedArticles, 300); // 5 minutes
      this.cache.set(`diverse-global-${language}`, {
        articles: processedArticles,
        timestamp: Date.now(),
      });

      console.log(`✅ Fetched ${processedArticles.length} diverse news articles after deduplication`);
      return processedArticles;
    } catch (error) {
      console.warn('NewsAPI failed, trying NewsData.io fallback:', error);
      
      try {
        const fallbackArticles = await newsService.fetchWorldwideNews();
        const processed = this.processArticles(fallbackArticles);
        
        // Cache fallback results
        await redisCache.set(cacheKey, processed, 300);
        this.cache.set(`diverse-global-${language}`, {
          articles: processed,
          timestamp: Date.now(),
        });
        
        return processed;
      } catch (fallbackError) {
        console.error('All news sources failed:', fallbackError);
        return [];
      }
    }
  }

  // Fetch news by specific category
  async fetchByCategory(category: string, language: SupportedLanguage = "en"): Promise<NewsArticle[]> {
    const cacheKey = `category-${category}-${language}`;
    
    if (this.isCacheValid(cacheKey)) {
      console.log(`✅ Using cached news for category: ${category} (${language})`);
      return this.cache.get(cacheKey)!.articles;
    }

    try {
      // First try to get all news and filter by detected category
      const allNews = await this.fetchDiverseNews(language);
      const filtered = allNews.filter(article => {
        const detected = this.detectCategory(article);
        return detected === category.toUpperCase();
      });

      if (filtered.length > 0) {
        this.cache.set(cacheKey, {
          articles: filtered,
          timestamp: Date.now(),
          category,
        });
        return filtered;
      }

      // If no matches, return diverse news
      return allNews.slice(0, 10);
    } catch (error) {
      console.error(`Error fetching news for category ${category}:`, error);
      return [];
    }
  }

  // Process articles: deduplicate and categorize
  private processArticles(articles: NewsArticle[]): NewsArticle[] {
    const localDedupeSet = new Set<string>();
    const processed: NewsArticle[] = [];
    let duplicateCount = 0;

    for (const article of articles) {
      const hash = this.getArticleHash(article);
      
      // Skip duplicates
      if (localDedupeSet.has(hash)) {
        duplicateCount++;
        continue;
      }

      localDedupeSet.add(hash);
      
      // Detect and assign category
      const detectedCategory = this.detectCategory(article);
      
      processed.push({
        ...article,
        category: detectedCategory,
      });
    }

    if (duplicateCount > 0) {
      console.log(`🔄 Removed ${duplicateCount} duplicate articles`);
    }

    return processed;
  }

  // Clear cache (useful for testing or forced refresh)
  clearCache() {
    this.cache.clear();
    this.dedupeSet.clear();
  }
}

export const newsOrchestrator = new NewsOrchestrator();
