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
      });

      this.boss.on('error', error => console.error('pg-boss error:', error));

      await this.boss.start();
      
      // Register worker for bias detection jobs (processes one job at a time per worker)
      // teamSize: 3 means up to 3 workers can run concurrently
      await this.boss.work(
        'detect-bias',
        { teamSize: 3 }, // Up to 3 concurrent workers
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
                
                // PERSIST: Save AI results to database for future cache hits
                if (data.articleId) {
                  await storage.createBiasAnalysis({
                    articleId: data.articleId,
                    aiPrediction: jobResult.prediction,
                    aiConfidence: jobResult.confidence,
                    aiSummary: jobResult.summary,
                    createdAt: new Date()
                  });
                  console.log(`💾 Saved AI analysis to database for article ${data.articleId}`);
                }
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
            
            // CRITICAL: Return the result so pg-boss stores it as the job output
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
      const jobId = await this.boss.send('detect-bias', data);

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
          error: String(job.output) || 'Job failed'
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
