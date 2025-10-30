import PgBoss from 'pg-boss';
import { biasDetectionService } from './biasDetectionService';
import { biasWebSocketServer } from './websocket';
import { storage } from './storage';

interface BiasJobData {
  text: string;
  articleId?: number;
  jobId: string;
}

interface BiasJobResult {
  prediction: 'left' | 'center' | 'right';
  confidence: number;
  summary: string;
}

class BiasJobQueue {
  private boss: PgBoss | null = null;
  private isInitialized: boolean = false;
  private metrics = {
    totalProcessed: 0,
    totalFailed: 0,
    totalProcessingTime: 0,
    startTime: Date.now()
  };

  async initialize() {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      
      if (!databaseUrl) {
        console.error('❌ DATABASE_URL not found. Background jobs disabled.');
        return;
      }

      console.log('🔵 Initializing pg-boss with PostgreSQL for background job processing...');
      
      this.boss = new PgBoss({
        connectionString: databaseUrl,
        retryLimit: 3,
        retryDelay: 1000,
        retryBackoff: true,
        expireInHours: 24,
        archiveCompletedAfterSeconds: 3600, // Archive after 1 hour
        deleteAfterHours: 48, // Delete after 2 days
        monitorStateIntervalSeconds: 60,
        noSupervisor: false,
      });

      this.boss.on('error', error => console.error('pg-boss error:', error));

      await this.boss.start();
      
      // Register worker for bias detection jobs with concurrency of 3
      await this.boss.work(
        'detect-bias',
        { teamSize: 3, teamConcurrency: 1 }, // Process 3 jobs concurrently
        async (job: PgBoss.Job<BiasJobData>) => {
          const startTime = Date.now();
          const data = job.data;
          
          console.log(`⚡ Processing bias job ${job.id} for: "${data.text.substring(0, 50)}..."`);
          
          try {
            let jobResult: BiasJobResult;
            
            // CACHE CHECK: If articleId provided, check if bias analysis already exists
            if (data.articleId) {
              const existing = await storage.getBiasAnalysis(data.articleId);
              if (existing && existing.aiSummary) {
                console.log(`✅ CACHE HIT: Reusing saved AI analysis for article ${data.articleId}`);
                jobResult = {
                  prediction: (existing.aiPrediction || 'center') as 'left' | 'center' | 'right',
                  confidence: existing.aiConfidence || 0.5,
                  summary: existing.aiSummary
                };
              } else {
                console.log(`❌ CACHE MISS: No saved AI analysis, calling HuggingFace...`);
                const [result, summary] = await Promise.all([
                  biasDetectionService.detectBias(data.text),
                  biasDetectionService.generateNeutralSummary(data.text, 80)
                ]);
                jobResult = {
                  prediction: result.prediction,
                  confidence: result.confidence,
                  summary
                };
              }
            } else {
              // No articleId, just run the AI
              const [result, summary] = await Promise.all([
                biasDetectionService.detectBias(data.text),
                biasDetectionService.generateNeutralSummary(data.text, 80)
              ]);
              jobResult = {
                prediction: result.prediction,
                confidence: result.confidence,
                summary
              };
            }

            const elapsed = Date.now() - startTime;
            console.log(`✅ Job ${job.id} completed in ${elapsed}ms`);
            
            this.metrics.totalProcessed++;
            
            // Broadcast completion via WebSocket
            biasWebSocketServer.notifyJobCompleted(data.jobId, jobResult);
            
            return jobResult;
          } catch (error: any) {
            this.metrics.totalFailed++;
            console.error(`❌ Job ${job.id} failed:`, error.message);
            
            // Broadcast failure via WebSocket
            biasWebSocketServer.notifyJobFailed(data.jobId, error.message);
            
            throw error; // pg-boss will handle retry
          }
        }
      );

      this.isInitialized = true;
      console.log('✅ pg-boss initialized with PostgreSQL backend (3 concurrent jobs)');
    } catch (error) {
      console.error('❌ Failed to initialize pg-boss:', error);
      this.isInitialized = false;
    }
  }

  async addBiasJob(data: BiasJobData): Promise<{ jobId: string; status: string }> {
    if (!this.isInitialized || !this.boss) {
      console.warn('⚠️  pg-boss not initialized. Job will not be processed:', data.jobId);
      return {
        jobId: data.jobId,
        status: 'failed'
      };
    }

    try {
      const jobId = await this.boss.send('detect-bias', data, {
        retryLimit: 3,
        retryDelay: 1000,
        retryBackoff: true,
        expireInHours: 1,
      });

      // Broadcast job queued via WebSocket
      biasWebSocketServer.notifyJobQueued(data.jobId);

      return {
        jobId: jobId as string,
        status: 'queued'
      };
    } catch (error: any) {
      console.error('Failed to add bias job:', error);
      biasWebSocketServer.notifyJobFailed(data.jobId, error.message);
      return {
        jobId: data.jobId,
        status: 'failed'
      };
    }
  }

  async getJobStatus(jobId: string): Promise<{ status: string; result?: BiasJobResult; error?: string }> {
    if (!this.isInitialized || !this.boss) {
      return { status: 'not_found' };
    }

    try {
      const job = await this.boss.getJobById(jobId);
      
      if (!job) {
        return { status: 'not_found' };
      }

      if (job.state === 'completed') {
        return {
          status: 'completed',
          result: job.output as BiasJobResult
        };
      } else if (job.state === 'failed') {
        return {
          status: 'failed',
          error: job.output?.message || 'Job failed'
        };
      } else if (job.state === 'active') {
        return { status: 'processing' };
      } else {
        return { status: job.state };
      }
    } catch (error) {
      console.error('Failed to get job status:', error);
      return { status: 'error' };
    }
  }

  async getQueueStats(): Promise<{ waiting: number; active: number; completed: number; failed: number }> {
    if (!this.isInitialized || !this.boss) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0
      };
    }

    try {
      // pg-boss doesn't have a direct equivalent, but we can return metrics
      return {
        waiting: 0, // Would need custom tracking
        active: 0,
        completed: this.metrics.totalProcessed,
        failed: this.metrics.totalFailed
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0
      };
    }
  }

  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    const throughput = this.metrics.totalProcessed / (uptime / 1000);
    
    return {
      totalProcessed: this.metrics.totalProcessed,
      totalFailed: this.metrics.totalFailed,
      uptimeMs: uptime,
      throughputPerSecond: parseFloat(throughput.toFixed(2)),
      successRate: this.metrics.totalProcessed > 0 
        ? parseFloat(((this.metrics.totalProcessed / (this.metrics.totalProcessed + this.metrics.totalFailed)) * 100).toFixed(2))
        : 0
    };
  }

  async close() {
    if (this.boss) {
      await this.boss.stop();
    }
  }
}

export const biasJobQueue = new BiasJobQueue();
