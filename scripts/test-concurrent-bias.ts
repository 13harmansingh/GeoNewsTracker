/**
 * Test script for concurrent bias detection using BullMQ job queue
 * Simulates Celery-style background processing with 10 concurrent headlines
 */

const BASE_URL = 'http://localhost:5000';

const TEST_HEADLINES = [
  "Breaking: Global Markets Show Strong Recovery After Economic Stimulus",
  "International Summit Addresses Climate Change with Bold New Initiatives",
  "Technology Innovation Transforms Healthcare Industry Worldwide",
  "Major Archaeological Discovery Announced by Research Team",
  "Sports Championship Draws Record Viewers and Revenue",
  "New Space Exploration Mission Launched by International Coalition",
  "Cultural Festival Celebrates Diversity in Major Metropolitan Area",
  "Economic Growth Exceeds Expectations in Developing Nations",
  "Scientific Breakthrough in Renewable Energy Storage Technology",
  "Historic Agreement Signed by World Leaders at Peace Conference"
];

interface JobResponse {
  jobId: string;
  status: string;
  statusUrl: string;
}

interface JobStatus {
  status: string;
  result?: {
    prediction: string;
    confidence: number;
    summary: string;
  };
  error?: string;
}

async function submitBiasJob(headline: string, index: number): Promise<JobResponse> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/detect-bias-async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: headline,
        articleId: index + 1
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const job = await response.json() as JobResponse;
    const elapsed = Date.now() - startTime;
    
    console.log(`✅ [${index + 1}] Job queued in ${elapsed}ms: ${job.jobId}`);
    console.log(`   Headline: "${headline.substring(0, 50)}..."`);
    
    return job;
  } catch (error: any) {
    console.error(`❌ [${index + 1}] Failed to queue job:`, error.message);
    throw error;
  }
}

async function pollJobStatus(jobId: string, maxAttempts = 30): Promise<JobStatus> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}/api/ai/job/${jobId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const status = await response.json() as JobStatus;
      
      if (status.status === 'completed') {
        return status;
      } else if (status.status === 'failed') {
        throw new Error(status.error || 'Job failed');
      }
      
      // Wait 200ms before next poll
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error: any) {
      if (attempt === maxAttempts) {
        throw error;
      }
    }
  }
  
  throw new Error('Job timeout - max polling attempts reached');
}

async function runConcurrentTest() {
  console.log('\n🚀 Starting Concurrent Bias Detection Test');
  console.log('═'.repeat(70));
  console.log(`📊 Testing with ${TEST_HEADLINES.length} concurrent headlines`);
  console.log('═'.repeat(70));
  
  const overallStart = Date.now();
  
  try {
    // Check queue stats before test
    console.log('\n📈 Queue stats before test:');
    const statsBefore = await fetch(`${BASE_URL}/api/ai/queue/stats`).then(r => r.json());
    console.log(`   Waiting: ${statsBefore.waiting}, Active: ${statsBefore.active}`);
    console.log(`   Completed: ${statsBefore.completed}, Failed: ${statsBefore.failed}`);
    
    // Submit all jobs concurrently
    console.log('\n🔄 Submitting jobs...\n');
    const submitStart = Date.now();
    
    const jobs = await Promise.all(
      TEST_HEADLINES.map((headline, index) => 
        submitBiasJob(headline, index)
      )
    );
    
    const submitElapsed = Date.now() - submitStart;
    console.log(`\n✨ All ${jobs.length} jobs queued in ${submitElapsed}ms`);
    console.log(`   Average: ${(submitElapsed / jobs.length).toFixed(0)}ms per job`);
    
    // Poll for results
    console.log('\n⏳ Waiting for results...\n');
    const pollStart = Date.now();
    
    const results = await Promise.all(
      jobs.map(async (job, index) => {
        try {
          const status = await pollJobStatus(job.jobId);
          console.log(`✅ [${index + 1}] Completed: ${status.result?.prediction.toUpperCase()} (${(status.result!.confidence * 100).toFixed(0)}%)`);
          console.log(`   Summary: "${status.result!.summary.substring(0, 60)}..."`);
          return { success: true, ...status };
        } catch (error: any) {
          console.error(`❌ [${index + 1}] Failed:`, error.message);
          return { success: false, error: error.message };
        }
      })
    );
    
    const pollElapsed = Date.now() - pollStart;
    
    // Check queue stats after test
    console.log('\n📈 Queue stats after test:');
    const statsAfter = await fetch(`${BASE_URL}/api/ai/queue/stats`).then(r => r.json());
    console.log(`   Waiting: ${statsAfter.waiting}, Active: ${statsAfter.active}`);
    console.log(`   Completed: ${statsAfter.completed}, Failed: ${statsAfter.failed}`);
    
    // Summary
    const overallElapsed = Date.now() - overallStart;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log('\n' + '═'.repeat(70));
    console.log('📊 Test Results Summary');
    console.log('═'.repeat(70));
    console.log(`✅ Successful: ${successful}/${TEST_HEADLINES.length}`);
    console.log(`❌ Failed: ${failed}/${TEST_HEADLINES.length}`);
    console.log(`⏱️  Total time: ${overallElapsed}ms`);
    console.log(`📈 Processing time: ${pollElapsed}ms`);
    console.log(`⚡ Throughput: ${(TEST_HEADLINES.length / (pollElapsed / 1000)).toFixed(2)} jobs/sec`);
    console.log('═'.repeat(70));
    
    // Bias distribution
    const biasDistribution = results
      .filter(r => r.success && r.result)
      .reduce((acc: any, r: any) => {
        const bias = r.result.prediction;
        acc[bias] = (acc[bias] || 0) + 1;
        return acc;
      }, {});
    
    console.log('\n🎯 Bias Distribution:');
    Object.entries(biasDistribution).forEach(([bias, count]) => {
      console.log(`   ${bias.toUpperCase()}: ${count}`);
    });
    console.log('\n✨ Test completed successfully!\n');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test
if (import.meta.url === `file://${process.argv[1]}`) {
  runConcurrentTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runConcurrentTest };
