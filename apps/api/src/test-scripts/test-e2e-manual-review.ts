import axios from 'axios';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
config({ path: path.join(__dirname, '../../.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_API_KEY = 'test_key';
const OUTPUT_DIR = path.join(__dirname, '../../e2e-test-outputs');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface TestResult {
  step: string;
  timestamp: string;
  data: any;
  notes?: string;
}

const testResults: TestResult[] = [];

function saveResult(step: string, data: any, notes?: string) {
  const result: TestResult = {
    step,
    timestamp: new Date().toISOString(),
    data,
    notes
  };
  testResults.push(result);
  
  // Save individual step result
  const filename = `${step.toLowerCase().replace(/\s+/g, '-')}.json`;
  fs.writeFileSync(
    path.join(OUTPUT_DIR, filename),
    JSON.stringify(result, null, 2)
  );
  
  console.log(`\n✅ Saved: ${step}`);
  if (notes) {
    console.log(`📝 Notes: ${notes}`);
  }
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runComprehensiveE2ETest() {
  console.log('🚀 Starting Comprehensive E2E Test with Manual Review Points\n');
  console.log(`📁 Output directory: ${OUTPUT_DIR}\n`);

  try {
    // Step 1: Trigger PR Analysis
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('STEP 1: Triggering PR Analysis');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const prAnalysisRequest = {
      repositoryUrl: 'https://github.com/vercel/next.js',
      prNumber: 59000,
      analysisMode: 'comprehensive',
      includeEducational: true
    };
    
    console.log('Request:', JSON.stringify(prAnalysisRequest, null, 2));
    
    const prAnalysisResponse = await axios.post(
      `${API_BASE_URL}/v1/analyze-pr`,
      prAnalysisRequest,
      {
        headers: {
          'X-API-Key': TEST_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const analysisId = prAnalysisResponse.data.analysisId;
    saveResult('1-pr-analysis-triggered', prAnalysisResponse.data, 'Initial PR analysis request');
    
    console.log(`\n📊 Analysis ID: ${analysisId}`);
    
    // Step 2: Monitor Progress and Capture Intermediate Data
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('STEP 2: Monitoring Analysis Progress');
    console.log('═══════════════════════════════════════════════════════════════');
    
    let analysisComplete = false;
    let checkCount = 0;
    const maxChecks = 60; // 5 minutes max
    
    while (!analysisComplete && checkCount < maxChecks) {
      await delay(5000); // Check every 5 seconds
      checkCount++;
      
      try {
        // Try both regular status and debug endpoints
        const [statusResponse, debugResponse] = await Promise.allSettled([
          axios.get(
            `${API_BASE_URL}/v1/analysis/${analysisId}`,
            {
              headers: {
                'X-API-Key': TEST_API_KEY
              }
            }
          ),
          axios.get(
            `${API_BASE_URL}/v1/analysis/${analysisId}/debug`,
            {
              headers: {
                'X-API-Key': TEST_API_KEY
              }
            }
          ).catch(() => null) // Fallback if debug endpoint doesn't exist
        ]);
        
        const status = statusResponse.status === 'fulfilled' ? statusResponse.value.data : null;
        const debug = debugResponse.status === 'fulfilled' && debugResponse.value ? debugResponse.value.data : null;
        
        if (!status) {
          console.log('⏳ Waiting for analysis to start...');
          continue;
        }
        
        console.log(`\n[Check ${checkCount}] Status: ${status.status} - ${status.currentStep || 'initializing'}`);
        
        // Capture intermediate states
        if (status.currentStage === 'deepwiki-analysis' && !testResults.find(r => r.step === '2-deepwiki-report')) {
          saveResult('2-deepwiki-report', status.deepwikiReport || status, 'DeepWiki analysis results');
        }
        
        if (status.prContext && !testResults.find(r => r.step === '3-pr-context')) {
          saveResult('3-pr-context', status.prContext, 'PR context prepared for agents');
        }
        
        if (status.agentReports && Object.keys(status.agentReports).length > 0) {
          Object.entries(status.agentReports).forEach(([agent, report]) => {
            const stepName = `4-agent-${agent}-report`;
            if (!testResults.find(r => r.step === stepName)) {
              saveResult(stepName, report, `${agent} agent analysis results`);
            }
          });
        }
        
        if (status.mcpToolsReports && Object.keys(status.mcpToolsReports).length > 0) {
          Object.entries(status.mcpToolsReports).forEach(([agent, tools]) => {
            const stepName = `5-mcp-tools-${agent}`;
            if (!testResults.find(r => r.step === stepName)) {
              saveResult(stepName, tools, `MCP tools used by ${agent} agent`);
            }
          });
        }
        
        if (status.status === 'completed' || status.status === 'failed') {
          analysisComplete = true;
          
          // Capture final states
          if (status.orchestratorDeduplication) {
            saveResult('6-orchestrator-deduplication', status.orchestratorDeduplication, 'Deduplicated findings');
          }
          
          if (status.educationalContent) {
            saveResult('7-educational-content', status.educationalContent, 'Educational enhancement results');
          }
          
          if (status.finalReport) {
            saveResult('8-final-report', status.finalReport, 'Final formatted report');
          }
          
          // Save complete final status
          saveResult('9-complete-analysis', status, 'Complete analysis results');
        }
        
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log('⏳ Analysis not ready yet...');
        } else {
          console.error('❌ Error checking status:', error.message);
        }
      }
    }
    
    if (!analysisComplete) {
      throw new Error('Analysis timed out after 5 minutes');
    }
    
    // Step 3: Generate Summary Report
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('STEP 3: Generating Summary Report');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const summary = {
      testRun: {
        startTime: testResults[0]?.timestamp,
        endTime: testResults[testResults.length - 1]?.timestamp,
        totalSteps: testResults.length
      },
      capturedData: testResults.map(r => ({
        step: r.step,
        timestamp: r.timestamp,
        notes: r.notes
      })),
      outputFiles: fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json'))
    };
    
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'test-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    // Create markdown report
    const markdownReport = `# E2E Test Manual Review Report

## Test Run Information
- **Start Time:** ${summary.testRun.startTime}
- **End Time:** ${summary.testRun.endTime}
- **Total Steps Captured:** ${summary.testRun.totalSteps}

## Data Transition Points

${testResults.map(r => `### ${r.step}
- **Timestamp:** ${r.timestamp}
- **Notes:** ${r.notes || 'N/A'}
- **File:** ${r.step.toLowerCase().replace(/\s+/g, '-')}.json
`).join('\n')}

## Review Checklist

### 1. DeepWiki Report Quality
- [ ] Repository understanding is accurate
- [ ] Code structure analysis is complete
- [ ] Technology stack identified correctly
- [ ] Key insights are valuable

### 2. PR Context Completeness
- [ ] All changed files captured
- [ ] Diff analysis is accurate
- [ ] Impact assessment is reasonable
- [ ] Risk factors identified

### 3. Agent Analysis Quality
- [ ] Security agent findings are relevant
- [ ] Performance agent identifies real issues
- [ ] Architecture agent provides valuable insights
- [ ] Code quality agent suggestions are actionable

### 4. MCP Tools Usage
- [ ] Tools are used appropriately
- [ ] Tool inputs are well-formed
- [ ] Tool outputs are utilized effectively
- [ ] No redundant tool calls

### 5. Orchestrator Deduplication
- [ ] Duplicate findings removed
- [ ] Related findings grouped properly
- [ ] Priority ordering makes sense
- [ ] No important findings lost

### 6. Educational Content
- [ ] Explanations are clear
- [ ] Examples are relevant
- [ ] Learning resources are appropriate
- [ ] Content matches findings

### 7. Final Report
- [ ] Well-structured and readable
- [ ] All findings included
- [ ] Actionable recommendations
- [ ] Professional presentation

## Enhancement Opportunities
(To be filled after review)

1. 
2. 
3. 
`;
    
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'manual-review-report.md'),
      markdownReport
    );
    
    console.log('\n✅ Test completed successfully!');
    console.log(`\n📊 Review the results in: ${OUTPUT_DIR}`);
    console.log('\nKey files to review:');
    console.log('  - manual-review-report.md (Start here!)');
    console.log('  - test-summary.json (Overview)');
    console.log('  - Individual JSON files for each step');
    
  } catch (error: any) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    
    // Save error information
    saveResult('error', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    }, 'Test execution error');
  }
}

// Run the test
runComprehensiveE2ETest().catch(console.error);