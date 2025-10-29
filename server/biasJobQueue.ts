import { Queue, Worker, Job } from 'bullmq';
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
  private queue: Queue<BiasJobData, BiasJobResult> | null = null;
  private worker: Worker<BiasJobData, BiasJobResult> | null = null;
  private useRedis: boolean = false;
  private inMemoryJobs: Map<string, { status: string; result?: BiasJobResult; error?: string }> = new Map();
  private metrics = {
    totalProcessed: 0,
    totalFailed: 0,
    totalProcessingTime: 0,
    startTime: Date.now()
  };

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
      
      if (redisUrl) {
        console.log('🔴 Initializing BullMQ with Redis for background job processing...');
        
        const connection = {
          url: redisUrl,
        };

        this.queue = new Queue<BiasJobData, BiasJobResult>('bias-detection', { connection });
        this.worker = new Worker<BiasJobData, BiasJobResult>(
          'bias-detection',
          async (job: Job<BiasJobData, BiasJobResult>) => {
            const startTime = Date.now();
            console.log(`⚡ Processing bias job ${job.id} for: "${job.data.text.substring(0, 50)}..."`);
            
            // CACHE CHECK: If articleId provided, check if bias analysis already exists
            if (job.data.articleId) {
              const existing = await storage.getBiasAnalysis(job.data.articleId);
              if (existing && existing.aiSummary) {
                console.log(`✅ CACHE HIT: Reusing saved AI analysis for article ${job.data.articleId}`);
                return {
                  prediction: (existing.aiPrediction || 'center') as 'left' | 'center' | 'right',
                  confidence: existing.aiConfidence || 0.5,
                  summary: existing.aiSummary
                };
              }
              console.log(`❌ CACHE MISS: No saved AI analysis, calling HuggingFace...`);
            }
            
            // Process bias detection and summary in parallel for better performance
            const [result, summary] = await Promise.all([
              biasDetectionService.detectBias(job.data.text),
              biasDetectionService.generateNeutralSummary(job.data.text, 80)
            ]);

            const elapsed = Date.now() - startTime;
            console.log(`✅ Job ${job.id} completed in ${elapsed}ms`);

            return {
              prediction: result.prediction,
              confidence: result.confidence,
              summary
            };
          },
          { 
            connection,
            concurrency: 50, // Process up to 50 jobs concurrently
            limiter: {
              max: 100, // Max 100 jobs per...
              duration: 1000 // ...1 second (100 jobs/sec per worker)
            }
          }
        );

        this.worker.on('completed', (job) => {
          this.metrics.totalProcessed++;
          console.log(`✅ Job ${job.id} completed successfully (Total: ${this.metrics.totalProcessed})`);
          
          // Broadcast completion via WebSocket
          if (job.returnvalue) {
            biasWebSocketServer.notifyJobCompleted(
              job.data.jobId,
              job.returnvalue
            );
          }
        });

        this.worker.on('failed', (job, err) => {
          this.metrics.totalFailed++;
          console.error(`❌ Job ${job?.id} failed:`, err.message);
          
          // Broadcast failure via WebSocket
          if (job) {
            biasWebSocketServer.notifyJobFailed(
              job.data.jobId,
              err.message
            );
          }
        });

        this.useRedis = true;
        console.log('✅ BullMQ initialized with Redis backend');
      } else {
        console.log('⚠️  No Redis URL found. Using in-memory job processing (synchronous fallback)');
        console.log('   To enable background processing, set REDIS_URL or UPSTASH_REDIS_URL environment variable');
        this.useRedis = false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Redis connection. Falling back to in-memory processing:', error);
      this.useRedis = false;
    }
  }

  async addBiasJob(data: BiasJobData): Promise<{ jobId: string; status: string }> {
    if (this.useRedis && this.queue) {
      const job = await this.queue.add('detect-bias', data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50,
      });

      // Broadcast job queued via WebSocket
      biasWebSocketServer.notifyJobQueued(data.jobId);

      return {
        jobId: job.id as string,
        status: 'queued'
      };
    } else {
      // In-memory fallback (synchronous processing)
      const jobId = data.jobId;
      
      // Broadcast job queued via WebSocket
      biasWebSocketServer.notifyJobQueued(jobId);
      
      this.inMemoryJobs.set(jobId, { status: 'processing' });

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
            const result = await biasDetectionService.detectBias(data.text);
            const summary = await biasDetectionService.generateNeutralSummary(data.text, 80);
            jobResult = {
              prediction: result.prediction,
              confidence: result.confidence,
              summary
            };
          }
        } else {
          // No articleId, just run the AI
          const result = await biasDetectionService.detectBias(data.text);
          const summary = await biasDetectionService.generateNeutralSummary(data.text, 80);
          jobResult = {
            prediction: result.prediction,
            confidence: result.confidence,
            summary
          };
        }

        this.inMemoryJobs.set(jobId, { status: 'completed', result: jobResult });
        
        // Broadcast completion via WebSocket
        biasWebSocketServer.notifyJobCompleted(jobId, jobResult);
      } catch (error: any) {
        this.inMemoryJobs.set(jobId, { status: 'failed', error: error.message });
        
        // Broadcast failure via WebSocket
        biasWebSocketServer.notifyJobFailed(jobId, error.message);
      }

      return {
        jobId,
        status: 'completed' // Synchronous, so already done
      };
    }
  }

  async getJobStatus(jobId: string): Promise<{ status: string; result?: BiasJobResult; error?: string }> {
    if (this.useRedis && this.queue) {
      const job = await this.queue.getJob(jobId);
      
      if (!job) {
        return { status: 'not_found' };
      }

      const state = await job.getState();
      
      if (state === 'completed') {
        return {
          status: 'completed',
          result: job.returnvalue
        };
      } else if (state === 'failed') {
        return {
          status: 'failed',
          error: job.failedReason
        };
      } else {
        return { status: state };
      }
    } else {
      // In-memory fallback
      const job = this.inMemoryJobs.get(jobId);
      return job || { status: 'not_found' };
    }
  }

  async getQueueStats(): Promise<{ waiting: number; active: number; completed: number; failed: number }> {
    if (this.useRedis && this.queue) {
      const counts = await this.queue.getJobCounts('waiting', 'active', 'completed', 'failed');
      return {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0
      };
    }

    // In-memory stats
    let completed = 0;
    let failed = 0;
    const jobs = Array.from(this.inMemoryJobs.values());
    for (const job of jobs) {
      if (job.status === 'completed') completed++;
      if (job.status === 'failed') failed++;
    }

    return {
      waiting: 0,
      active: 0,
      completed,
      failed
    };
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
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
  }
}

export const biasJobQueue = new BiasJobQueue();
