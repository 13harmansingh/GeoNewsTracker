import { redisCache } from "./redisCache";

export class QuotaManager {
  private readonly WORLD_NEWS_DAILY_LIMIT = 50;
  
  // Get Redis key for today's quota
  private getQuotaKey(): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD in UTC
    return `worldnews:quota:${today}`;
  }
  
  // Calculate seconds until midnight UTC
  private getSecondsUntilMidnightUTC(): number {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0
    ));
    return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
  }
  
  // Check if World News API quota is available
  async hasQuotaAvailable(): Promise<boolean> {
    try {
      const quotaKey = this.getQuotaKey();
      const currentUsage = await redisCache.get<number>(quotaKey);
      
      const usage = currentUsage || 0;
      const available = usage < this.WORLD_NEWS_DAILY_LIMIT;
      
      console.log(`📊 World News API quota: ${usage}/${this.WORLD_NEWS_DAILY_LIMIT} used today (available: ${available})`);
      
      return available;
    } catch (error) {
      console.error('Error checking World News API quota:', error);
      // If Redis fails, assume no quota to avoid unexpected API charges
      return false;
    }
  }
  
  // Increment quota usage (call after successful World News API call)
  async incrementQuota(): Promise<void> {
    try {
      const quotaKey = this.getQuotaKey();
      const currentUsage = await redisCache.get<number>(quotaKey);
      const newUsage = (currentUsage || 0) + 1;
      
      // Set with TTL to expire at midnight UTC
      const ttl = this.getSecondsUntilMidnightUTC();
      await redisCache.set(quotaKey, newUsage, ttl);
      
      console.log(`✅ World News API quota incremented: ${newUsage}/${this.WORLD_NEWS_DAILY_LIMIT} (resets in ${Math.floor(ttl / 3600)}h ${Math.floor((ttl % 3600) / 60)}m)`);
    } catch (error) {
      console.error('Error incrementing World News API quota:', error);
    }
  }
  
  // Get current quota status (for monitoring/debugging)
  async getQuotaStatus(): Promise<{ used: number; limit: number; available: number; resetsIn: string }> {
    try {
      const quotaKey = this.getQuotaKey();
      const currentUsage = await redisCache.get<number>(quotaKey) || 0;
      const ttl = this.getSecondsUntilMidnightUTC();
      const hours = Math.floor(ttl / 3600);
      const minutes = Math.floor((ttl % 3600) / 60);
      
      return {
        used: currentUsage,
        limit: this.WORLD_NEWS_DAILY_LIMIT,
        available: this.WORLD_NEWS_DAILY_LIMIT - currentUsage,
        resetsIn: `${hours}h ${minutes}m`
      };
    } catch (error) {
      console.error('Error getting quota status:', error);
      // Return safe defaults on Redis failure
      const ttl = this.getSecondsUntilMidnightUTC();
      const hours = Math.floor(ttl / 3600);
      const minutes = Math.floor((ttl % 3600) / 60);
      return {
        used: 0,
        limit: this.WORLD_NEWS_DAILY_LIMIT,
        available: this.WORLD_NEWS_DAILY_LIMIT,
        resetsIn: `${hours}h ${minutes}m`
      };
    }
  }
}

// Export singleton instance
export const quotaManager = new QuotaManager();
