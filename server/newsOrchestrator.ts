import type { NewsArticle } from "@shared/schema";
import { newsAPIService, type SupportedLanguage } from "./newsApiService";
import { newsService } from "./newsService";
import { redisCache, CacheKeys } from "./redisCache";
import { worldNewsApi, type SentimentMetrics } from "./worldNewsApi";

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

  // Get sentiment metrics for a language (KNEW Global Mood Meter)
  async getSentimentMetrics(language: SupportedLanguage = "en"): Promise<SentimentMetrics> {
    const sentimentKey = `sentiment:${language}`;
    
    // Try Redis cache first
    const cachedSentiment = await redisCache.get<SentimentMetrics>(sentimentKey);
    if (cachedSentiment) {
      console.log(`✅ Using cached sentiment metrics for ${language}: ${cachedSentiment.positive}% positive`);
      return cachedSentiment;
    }

    // If no cache, fetch fresh news which will populate sentiment
    try {
      const { sentiment } = await worldNewsApi.searchNews({ language, number: 20 });
      await redisCache.set(sentimentKey, sentiment, 300);
      return sentiment;
    } catch (error) {
      console.error('Failed to fetch sentiment:', error);
      // Return neutral sentiment as fallback
      return {
        positive: 33,
        neutral: 34,
        negative: 33,
        averageScore: 0,
        totalArticles: 0
      };
    }
  }

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

  // Fetch diverse news from multiple categories with sentiment
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
      // PRIMARY: Fetch from World News API with sentiment analysis
      console.log(`🌍 Fetching diverse news from World News API (language: ${language})...`);
      const { articles, sentiment } = await worldNewsApi.searchNews({
        language,
        number: 20 // Get top 20 headlines
      });
      
      console.log(`📥 Received ${articles.length} articles with sentiment: ${sentiment.positive}% positive, ${sentiment.negative}% negative`);
      
      if (!articles || articles.length === 0) {
        throw new Error('No articles from World News API');
      }

      // Store sentiment data in cache
      await redisCache.set(`sentiment:${language}`, sentiment, 300);

      // Deduplicate and categorize
      const processedArticles = this.processArticles(articles);
      
      // Cache the result in both Redis and in-memory
      await redisCache.set(cacheKey, processedArticles, 300); // 5 minutes
      this.cache.set(`diverse-global-${language}`, {
        articles: processedArticles,
        timestamp: Date.now(),
      });

      console.log(`✅ Fetched ${processedArticles.length} diverse news articles with sentiment from World News API`);
      return processedArticles;
    } catch (error) {
      console.warn('World News API failed, trying NewsAPI fallback:', error);
      
      try {
        const articles = await newsAPIService.getWorldwideHeadlines(language);
        const processed = this.processArticles(articles);
        
        // Cache fallback results
        await redisCache.set(cacheKey, processed, 300);
        this.cache.set(`diverse-global-${language}`, {
          articles: processed,
          timestamp: Date.now(),
        });
        
        return processed;
      } catch (fallbackError) {
        console.warn('NewsAPI failed, trying NewsData.io fallback:', fallbackError);
        
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
        } catch (finalError) {
          console.error('All news sources failed:', finalError);
          return [];
        }
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
