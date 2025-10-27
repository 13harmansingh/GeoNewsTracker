import Redis from 'ioredis';

class RedisCache {
  private client: Redis | null = null;
  private enabled: boolean = false;
  private readonly DEFAULT_TTL = 300; // 5 minutes in seconds

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
      
      if (redisUrl) {
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            if (times > 3) return null;
            return Math.min(times * 100, 3000);
          },
        });

        this.client.on('connect', () => {
          console.log('✅ Redis cache connected');
          this.enabled = true;
        });

        this.client.on('error', (err) => {
          console.error('❌ Redis cache error:', err.message);
          this.enabled = false;
        });
      } else {
        console.log('⚠️  Redis cache disabled (no REDIS_URL found)');
        this.enabled = false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Redis cache:', error);
      this.enabled = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to set cache key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Failed to delete cache key ${key}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.enabled || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Failed to check cache key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.enabled || !this.client) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error(`Failed to get TTL for key ${key}:`, error);
      return -1;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.enabled || !this.client) {
      return [];
    }

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`Failed to get keys for pattern ${pattern}:`, error);
      return [];
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }
}

export const redisCache = new RedisCache();

// Cache key builders for consistent naming
export const CacheKeys = {
  news: (language: string) => `news:${language}:all`,
  newsCategory: (language: string, category: string) => `news:${language}:category:${category}`,
  newsLocationFresh: (lat: number, lng: number, language: string) => 
    `news:location:${lat.toFixed(4)},${lng.toFixed(4)}:${language}`,
  biasDetection: (text: string) => `bias:${Buffer.from(text).toString('base64').substring(0, 50)}`,
  aiSummary: (articleId: number) => `summary:article:${articleId}`,
  queueStats: () => `queue:stats`,
};
