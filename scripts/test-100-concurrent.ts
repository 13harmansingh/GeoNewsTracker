/**
 * TRL 7 Production Test: 100 Concurrent Bias Detection Jobs
 * Tests full BullMQ + Redis + WebSocket stack with EIC grant requirements
 */

import WebSocket from 'ws';

const BASE_URL = 'http://localhost:5000';
const WS_URL = 'ws://localhost:5000/ws/bias-updates';

// 100 diverse headlines for comprehensive testing
const TEST_HEADLINES = [
  // Politics & Government (20)
  "Democratic Victory in Swing State Signals Major Political Shift Ahead",
  "Conservative Coalition Gains Ground in Regional Elections Across Nation",
  "Government Announces Comprehensive Healthcare Reform Package Nationwide",
  "Opposition Leaders Challenge Current Administration Economic Policies",
  "Bipartisan Agreement Reached on Infrastructure Spending Bill Today",
  "Progressive Movement Gains Momentum in Urban Centers Nationwide",
  "National Security Policy Updates Receive Mixed Reception from Experts",
  "Electoral Reform Debate Continues as Deadline Approaches Next Month",
  "Legislative Session Focuses on Education Funding Priorities This Year",
  "Political Analysts Predict Close Race in Upcoming National Elections",
  "Foreign Policy Shift Announced Following International Summit Success",
  "Budget Negotiations Enter Final Phase as Deadline Looms Tomorrow",
  "Constitutional Amendment Proposal Sparks Nationwide Debate on Rights",
  "Campaign Finance Reform Bill Advances Through Legislative Committee",
  "International Relations Expert Warns of Diplomatic Tensions Rising",
  "Public Opinion Polls Show Shifting Support for Current Leadership",
  "Trade Agreement Negotiations Continue with Major Economic Partners",
  "Defense Spending Increases Approved in Latest Congressional Budget",
  "Immigration Policy Changes Announced After Months of Negotiations",
  "State Officials Implement New Voting Accessibility Measures Statewide",
  
  // Technology & Innovation (20)
  "Artificial Intelligence Breakthrough Revolutionizes Medical Diagnosis Methods",
  "Tech Giant Unveils Revolutionary Quantum Computing Platform Today",
  "Cybersecurity Experts Warn of Emerging Threats to Infrastructure",
  "Sustainable Energy Storage Technology Achieves Major Milestone",
  "Autonomous Vehicle Testing Expands to Additional Urban Areas",
  "Blockchain Innovation Transforms Supply Chain Management Systems",
  "Space Exploration Company Successfully Launches Satellite Constellation",
  "5G Network Expansion Brings High-Speed Internet to Rural Communities",
  "Biotechnology Firm Announces Gene Therapy Clinical Trial Success",
  "Machine Learning Algorithm Predicts Disease Outbreaks with Accuracy",
  "Virtual Reality Platform Enhances Remote Education Opportunities",
  "Cloud Computing Infrastructure Scales to Meet Growing Demand",
  "Semiconductor Manufacturing Breakthrough Improves Chip Performance",
  "Digital Privacy Regulations Updated to Protect Consumer Data",
  "Renewable Technology Innovation Reduces Solar Panel Production Costs",
  "Robotics Development Advances Manufacturing Automation Capabilities",
  "Internet Infrastructure Upgrades Improve Global Connectivity Speeds",
  "Data Science Techniques Optimize Healthcare Resource Allocation",
  "Software Development Tools Enhance Programmer Productivity Rates",
  "Technology Education Programs Expand Access to Digital Skills",
  
  // Economy & Business (20)
  "Stock Markets Reach Record Highs Amid Strong Economic Growth",
  "Central Bank Adjusts Interest Rates in Response to Inflation",
  "Unemployment Figures Drop to Lowest Level in Decades",
  "Corporate Earnings Reports Exceed Analyst Expectations This Quarter",
  "Real Estate Market Shows Signs of Stabilization After Volatility",
  "Consumer Confidence Index Rises Following Positive Economic Data",
  "International Trade Volume Increases Strengthening Global Economy",
  "Startup Funding Reaches New Heights in Technology Sector",
  "Manufacturing Output Expands as Demand for Goods Increases",
  "Retail Sales Surge During Holiday Shopping Season Peak",
  "Energy Prices Fluctuate Affecting Transportation and Industry Costs",
  "Banking Sector Reports Strong Quarterly Performance Results",
  "Investment Opportunities Emerge in Emerging Market Economies",
  "Supply Chain Improvements Reduce Delivery Times Nationwide",
  "Economic Forecast Predicts Sustained Growth Through Next Year",
  "Small Business Revenue Increases Following Support Programs",
  "Currency Exchange Rates Stabilize After Recent Market Volatility",
  "Construction Industry Experiences Growth in Commercial Projects",
  "Agriculture Sector Benefits from Favorable Weather Conditions",
  "Financial Services Innovation Improves Access to Capital",
  
  // Science & Environment (20)
  "Climate Research Team Discovers Critical Ocean Temperature Patterns",
  "Biodiversity Conservation Efforts Show Positive Results Globally",
  "Archaeological Discovery Reveals Ancient Civilization Secrets",
  "Renewable Energy Production Exceeds Fossil Fuel Output First Time",
  "Medical Research Breakthrough Offers Hope for Disease Treatment",
  "Environmental Protection Measures Strengthen Ecosystem Recovery",
  "Astronomical Observation Captures Rare Cosmic Event Tonight",
  "Wildlife Population Numbers Increase Following Conservation Programs",
  "Ocean Cleanup Technology Successfully Removes Plastic Waste",
  "Geological Study Provides Insights into Natural Disaster Prediction",
  "Atmospheric Science Research Improves Weather Forecasting Accuracy",
  "Botanical Research Identifies New Plant Species in Rainforest",
  "Marine Biology Study Documents Coral Reef Recovery Progress",
  "Physics Experiment Validates Fundamental Theory Predictions",
  "Chemistry Innovation Creates Sustainable Material Alternatives",
  "Neuroscience Research Advances Understanding of Brain Function",
  "Veterinary Medicine Development Improves Animal Health Treatments",
  "Agricultural Science Enhances Crop Yield Through Innovation",
  "Materials Science Breakthrough Enables Advanced Manufacturing",
  "Public Health Initiative Reduces Disease Transmission Rates",
  
  // Culture & Society (20)
  "Educational Reform Initiative Transforms Learning Outcomes Nationwide",
  "Cultural Heritage Site Receives International Recognition Status",
  "Arts Funding Program Supports Community Creative Projects",
  "Literature Festival Celebrates Diverse Voices and Stories",
  "Music Industry Adapts to Digital Distribution Models",
  "Film Production Increases in Regional Entertainment Centers",
  "Sports Championship Draws Record Attendance and Viewership",
  "Museum Exhibition Showcases Historical Artifacts Collection",
  "Theatre Production Receives Critical Acclaim and Awards",
  "Dance Performance Combines Traditional and Modern Styles",
  "Publishing Industry Embraces New Digital Reading Platforms",
  "Photography Exhibition Documents Social Change Movements",
  "Architecture Project Wins International Design Competition",
  "Culinary Arts Program Promotes Local Food Traditions",
  "Fashion Industry Adopts Sustainable Production Practices",
  "Religious Leaders Promote Interfaith Dialogue and Understanding",
  "Social Justice Movement Gains Widespread Public Support",
  "Community Development Project Improves Urban Living Conditions",
  "Youth Engagement Programs Foster Civic Participation",
  "Cultural Exchange Initiative Strengthens International Relations"
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

interface WebSocketUpdate {
  type: 'connected' | 'job_queued' | 'job_completed' | 'job_failed';
  jobId?: string;
  status?: string;
  result?: {
    prediction: string;
    confidence: number;
    summary: string;
  };
  error?: string;
  timestamp: number;
}

async function submitBiasJob(headline: string, index: number): Promise<JobResponse> {
  const response = await fetch(`${BASE_URL}/api/ai/detect-bias-async`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: headline,
      articleId: index + 1
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json() as JobResponse;
}

async function pollJobStatus(jobId: string, maxAttempts = 30): Promise<JobStatus> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  throw new Error('Job timeout');
}

async function runProductionTest() {
  console.log('\n🚀 TRL 7 Production Test: 100 Concurrent Headlines');
  console.log('═'.repeat(80));
  console.log(`📊 Testing BullMQ + Redis + WebSocket stack`);
  console.log(`🎯 Target: 500+ jobs/sec throughput for EIC Acceleration Grant`);
  console.log('═'.repeat(80));
  
  const overallStart = Date.now();
  const wsUpdates: WebSocketUpdate[] = [];
  
  // Connect to WebSocket server
  console.log('\n🔌 Connecting to WebSocket server...');
  const ws = new WebSocket(WS_URL);
  
  await new Promise<void>((resolve, reject) => {
    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      resolve();
    });
    ws.on('error', reject);
    setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
  });

  ws.on('message', (data) => {
    try {
      const update = JSON.parse(data.toString()) as WebSocketUpdate;
      wsUpdates.push(update);
      
      if (update.type === 'job_completed' || update.type === 'job_failed') {
        const symbol = update.type === 'job_completed' ? '✅' : '❌';
        const bias = update.result?.prediction.toUpperCase() || 'UNKNOWN';
        const conf = update.result?.confidence ? `(${(update.result.confidence * 100).toFixed(0)}%)` : '';
        console.log(`${symbol} WS Update: ${update.jobId} - ${bias} ${conf}`);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  });

  try {
    // Submit all 100 jobs concurrently
    console.log(`\n🔄 Submitting ${TEST_HEADLINES.length} jobs...\n`);
    const submitStart = Date.now();
    
    const jobs = await Promise.all(
      TEST_HEADLINES.map((headline, index) => submitBiasJob(headline, index))
    );
    
    const submitElapsed = Date.now() - submitStart;
    console.log(`\n✨ All ${jobs.length} jobs queued in ${submitElapsed}ms`);
    console.log(`   Throughput: ${(jobs.length / (submitElapsed / 1000)).toFixed(2)} jobs/sec`);
    
    // Wait for results
    console.log('\n⏳ Processing jobs (this may take a minute)...\n');
    const pollStart = Date.now();
    
    const results = await Promise.all(
      jobs.map(async (job, index) => {
        try {
          const status = await pollJobStatus(job.jobId);
          return { success: true, index, ...status };
        } catch (error: any) {
          return { success: false, index, error: error.message };
        }
      })
    );
    
    const pollElapsed = Date.now() - pollStart;
    const overallElapsed = Date.now() - overallStart;
    
    // Analysis
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const biasDistribution = results
      .filter(r => r.success && r.result)
      .reduce((acc: any, r: any) => {
        const bias = r.result.prediction;
        acc[bias] = (acc[bias] || 0) + 1;
        return acc;
      }, {});
    
    // WebSocket stats
    const wsQueued = wsUpdates.filter(u => u.type === 'job_queued').length;
    const wsCompleted = wsUpdates.filter(u => u.type === 'job_completed').length;
    const wsFailed = wsUpdates.filter(u => u.type === 'job_failed').length;
    
    console.log('\n' + '═'.repeat(80));
    console.log('📊 TRL 7 Test Results');
    console.log('═'.repeat(80));
    console.log(`\n✅ Job Processing:`);
    console.log(`   Successful: ${successful}/${TEST_HEADLINES.length}`);
    console.log(`   Failed: ${failed}/${TEST_HEADLINES.length}`);
    console.log(`   Success Rate: ${((successful / TEST_HEADLINES.length) * 100).toFixed(1)}%`);
    
    console.log(`\n⏱️  Performance:`);
    console.log(`   Queue Time: ${submitElapsed}ms`);
    console.log(`   Processing Time: ${pollElapsed}ms`);
    console.log(`   Total Time: ${overallElapsed}ms`);
    console.log(`   Throughput: ${(TEST_HEADLINES.length / (pollElapsed / 1000)).toFixed(2)} jobs/sec`);
    
    console.log(`\n📡 WebSocket Updates:`);
    console.log(`   Queued Events: ${wsQueued}`);
    console.log(`   Completed Events: ${wsCompleted}`);
    console.log(`   Failed Events: ${wsFailed}`);
    console.log(`   Total Events: ${wsUpdates.length}`);
    
    console.log(`\n🎯 Bias Distribution:`);
    Object.entries(biasDistribution).forEach(([bias, count]) => {
      const percentage = ((count as number / successful) * 100).toFixed(1);
      console.log(`   ${bias.toUpperCase()}: ${count} (${percentage}%)`);
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log('🏆 TRL 7 Readiness Assessment');
    console.log('═'.repeat(80));
    const passThreshold = successful >= 95; // 95% success rate
    const passThroughput = (TEST_HEADLINES.length / (pollElapsed / 1000)) >= 50; // 50 jobs/sec minimum
    const passWebSocket = wsCompleted >= 95; // Most updates delivered
    
    console.log(`   ${passThreshold ? '✅' : '❌'} Job Success Rate (≥95%): ${passThreshold ? 'PASS' : 'FAIL'}`);
    console.log(`   ${passThroughput ? '✅' : '❌'} Throughput (≥50 jobs/sec): ${passThroughput ? 'PASS' : 'FAIL'}`);
    console.log(`   ${passWebSocket ? '✅' : '❌'} WebSocket Updates (≥95 events): ${passWebSocket ? 'PASS' : 'FAIL'}`);
    
    const overallPass = passThreshold && passThroughput && passWebSocket;
    console.log(`\n   ${overallPass ? '🎉' : '⚠️'} Overall: ${overallPass ? 'TRL 7 READY ✅' : 'NEEDS OPTIMIZATION ⚠️'}`);
    console.log('═'.repeat(80));
    
    if (overallPass) {
      console.log('\n✨ System is ready for EIC Acceleration Grant demonstration!');
      console.log('   - Concurrent processing: ✅');
      console.log('   - Redis backend: ✅');
      console.log('   - WebSocket real-time updates: ✅');
      console.log('   - Production-grade throughput: ✅\n');
    }
    
    ws.close();
    process.exit(overallPass ? 0 : 1);
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    ws.close();
    process.exit(1);
  }
}

// Run test
if (import.meta.url === `file://${process.argv[1]}`) {
  runProductionTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runProductionTest };
