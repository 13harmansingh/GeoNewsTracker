// PostgreSQL-backed quota manager for World News API (with in-memory fallback)
export class QuotaManager {
  private readonly WORLD_NEWS_DAILY_LIMIT = 50;
  private db: any = null;
  
  // In-memory fallback when database is unavailable
  private memoryQuota: Map<string, number> = new Map();
  
  // Get quota key for today
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
  
  async initialize() {
    try {
      // Use the pg-boss database connection for quota tracking
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        console.warn('⚠️  No DATABASE_URL, using in-memory quota tracking');
        return;
      }
      
      const { Pool } = await import('pg');
      this.db = new Pool({ connectionString: databaseUrl });
      
      // Create quota table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS world_news_quota (
          id INTEGER PRIMARY KEY DEFAULT 1,
          count INTEGER NOT NULL DEFAULT 0,
          date DATE NOT NULL DEFAULT CURRENT_DATE,
          CHECK (id = 1)
        )
      `);
      
      // Initialize with a row if it doesn't exist
      await this.db.query(`
        INSERT INTO world_news_quota (id, count, date)
        VALUES (1, 0, CURRENT_DATE)
        ON CONFLICT (id) DO NOTHING
      `);
      
      console.log('✅ Quota manager initialized with PostgreSQL persistence');
    } catch (error) {
      console.warn('⚠️  Failed to initialize quota manager with PostgreSQL, using in-memory:', error);
      this.db = null;
    }
  }
  
  // Check if World News API quota is available
  async hasQuotaAvailable(): Promise<boolean> {
    try {
      const currentUsage = await this.getQuotaCount();
      const available = currentUsage < this.WORLD_NEWS_DAILY_LIMIT;
      
      console.log(`📊 World News API quota: ${currentUsage}/${this.WORLD_NEWS_DAILY_LIMIT} used today (available: ${available})`);
      
      return available;
    } catch (error) {
      console.error('Error checking World News API quota:', error);
      // If check fails, assume no quota to avoid unexpected API charges
      return false;
    }
  }
  
  // Get current quota count
  private async getQuotaCount(): Promise<number> {
    if (this.db) {
      try {
        // Reset quota if it's a new day
        await this.db.query(`
          UPDATE world_news_quota
          SET count = 0, date = CURRENT_DATE
          WHERE id = 1 AND date < CURRENT_DATE
        `);
        
        const result = await this.db.query(`
          SELECT count FROM world_news_quota WHERE id = 1
        `);
        
        return result.rows[0]?.count || 0;
      } catch (error) {
        console.warn('⚠️  Failed to get quota from database, using in-memory fallback:', error);
        // Fall through to memory quota
      }
    }
    
    // In-memory fallback
    const quotaKey = this.getQuotaKey();
    return this.memoryQuota.get(quotaKey) || 0;
  }
  
  // Increment quota usage (call BEFORE making World News API call to reserve slot)
  // Returns true if quota was successfully reserved, false if limit reached
  async reserveQuota(): Promise<boolean> {
    try {
      if (this.db) {
        try {
          // STEP 1: Reset quota if it's a new day (ensures daily quota resets at midnight UTC)
          await this.db.query(`
            UPDATE world_news_quota
            SET count = 0, date = CURRENT_DATE
            WHERE id = 1 AND date < CURRENT_DATE
          `);
          
          // STEP 2: ATOMIC INCREMENT - Reserve quota ONLY if under limit
          // This prevents race conditions where multiple requests exceed the limit
          const result = await this.db.query(`
            UPDATE world_news_quota
            SET count = count + 1
            WHERE id = 1 AND count < $1
            RETURNING count
          `, [this.WORLD_NEWS_DAILY_LIMIT]);
          
          if (result.rows.length === 0) {
            // Update didn't happen - quota limit reached
            console.warn(`⚠️  World News API quota limit reached (${this.WORLD_NEWS_DAILY_LIMIT}/day)`);
            return false;
          }
          
          const count = result.rows[0].count;
          const ttl = this.getSecondsUntilMidnightUTC();
          const hours = Math.floor(ttl / 3600);
          const minutes = Math.floor((ttl % 3600) / 60);
          console.log(`✅ World News API quota reserved: ${count}/${this.WORLD_NEWS_DAILY_LIMIT} (resets in ${hours}h ${minutes}m)`);
          return true;
        } catch (error) {
          console.warn('⚠️  Failed to reserve quota in database, using in-memory fallback:', error);
          // Fall through to memory quota
        }
      }
      
      // In-memory fallback (still atomic within single process)
      const quotaKey = this.getQuotaKey();
      const currentUsage = this.memoryQuota.get(quotaKey) || 0;
      
      if (currentUsage >= this.WORLD_NEWS_DAILY_LIMIT) {
        console.warn(`⚠️  World News API quota limit reached (${this.WORLD_NEWS_DAILY_LIMIT}/day) - in-memory`);
        return false;
      }
      
      const newUsage = currentUsage + 1;
      this.memoryQuota.set(quotaKey, newUsage);
      
      const ttl = this.getSecondsUntilMidnightUTC();
      console.log(`✅ World News API quota reserved: ${newUsage}/${this.WORLD_NEWS_DAILY_LIMIT} (resets in ${Math.floor(ttl / 3600)}h ${Math.floor((ttl % 3600) / 60)}m) - in-memory`);
      return true;
    } catch (error) {
      console.error('Error reserving World News API quota:', error);
      return false; // Fail safe - don't allow quota if error
    }
  }
  
  // Legacy method for backward compatibility - redirects to reserveQuota
  async incrementQuota(): Promise<void> {
    await this.reserveQuota();
  }
  
  // Get current quota status (for monitoring/debugging)
  async getQuotaStatus(): Promise<{ used: number; limit: number; available: number; resetsIn: string }> {
    try {
      const currentUsage = await this.getQuotaCount();
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
      // Return safe defaults on failure
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
