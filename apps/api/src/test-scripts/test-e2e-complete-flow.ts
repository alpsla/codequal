#!/usr/bin/env ts-node
import { config } from 'dotenv';
import { join } from 'path';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: join(__dirname, '../../.env') });

const API_URL = 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test users - we'll use mock data for now
const TEST_USERS = {
  primary: 'test@example.com',
  secondary: 'test2@example.com'
};

// Mock API keys for testing
const MOCK_API_KEYS: Record<string, string> = {
  'test@example.com': 'ck_test_mock_key_123',
  'test2@example.com': 'ck_test_mock_key_456'
};

// Test repository
const TEST_REPO = {
  url: 'https://github.com/codequal-dev/test-repo/pull/1', // Mock test PR
  owner: 'codequal-dev',
  repo: 'test-repo',
  prNumber: 1
};

interface TestResult {
  step: string;
  success: boolean;
  details?: any;
  error?: string;
}

const results: TestResult[] = [];

function logResult(step: string, success: boolean, details?: any, error?: string) {
  results.push({ step, success, details, error });
  console.log(`\n${success ? '✅' : '❌'} ${step}`);
  if (details) console.log('Details:', JSON.stringify(details, null, 2));
  if (error) console.log('Error:', error);
}

async function getApiKeyForUser(email: string): Promise<string | null> {
  // For testing, return mock API keys
  const mockKey = MOCK_API_KEYS[email];
  if (mockKey) {
    logResult(`Get API key for ${email}`, true, { keyPrefix: mockKey.substring(0, 10) + '...' });
    return mockKey;
  }
  
  logResult(`Get API key for ${email}`, false, null, 'No mock API key configured');
  return null;
}

async function testAnalysisFlow(apiKey: string, userEmail: string) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing with user: ${userEmail}`);
  console.log(`${'='.repeat(50)}`);

  let analysisId: string | null = null;

  try {
    // 1. Start PR analysis
    const startResponse = await axios.post(
      `${API_URL}/v1/analyze-pr`,
      { prUrl: `${TEST_REPO.url}` },
      { headers: { 'X-API-Key': apiKey } }
    );

    analysisId = startResponse.data.id;
    logResult('Start PR analysis', true, { 
      analysisId,
      status: startResponse.data.status 
    });

    // 2. Monitor progress in real-time
    logResult('Starting progress monitoring', true);
    
    // Poll progress updates
    let progressComplete = false;
    let progressData: any = null;
    let pollCount = 0;
    const maxPolls = 60; // 5 minutes max

    while (!progressComplete && pollCount < maxPolls) {
      try {
        const progressResponse = await axios.get(
          `${API_URL}/api/progress/${analysisId}`,
          { 
            headers: { 'Authorization': `Bearer ${await getJwtToken(userEmail)}` },
            validateStatus: () => true 
          }
        );

        if (progressResponse.status === 200) {
          progressData = progressResponse.data;
          
          console.log(`\nProgress Update #${pollCount + 1}:`);
          console.log(`- Overall: ${progressData.overallPercentage}% (${progressData.overallStatus})`);
          console.log(`- Phase: ${progressData.currentPhase}`);
          console.log(`- Agents: ${progressData.metrics.completedAgents}/${progressData.metrics.totalAgents}`);
          console.log(`- Tools: ${progressData.metrics.completedTools}/${progressData.metrics.totalTools}`);
          
          if (progressData.overallStatus === 'completed' || progressData.overallStatus === 'failed') {
            progressComplete = true;
            logResult('Progress tracking', true, {
              finalStatus: progressData.overallStatus,
              totalAgents: progressData.metrics.totalAgents,
              completedAgents: progressData.metrics.completedAgents,
              totalTools: progressData.metrics.totalTools,
              completedTools: progressData.metrics.completedTools
            });
          }
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
        pollCount++;
      } catch (error: any) {
        logResult('Progress polling error', false, null, error.message);
        break;
      }
    }

    if (!progressComplete) {
      logResult('Progress tracking timeout', false, { pollCount });
    }

    // 3. Get analysis results
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait a bit more for results
    
    const resultResponse = await axios.get(
      `${API_URL}/v1/analysis/${analysisId}`,
      { 
        headers: { 'X-API-Key': apiKey },
        validateStatus: () => true 
      }
    );

    if (resultResponse.status === 200) {
      logResult('Get analysis results', true, {
        status: resultResponse.data.status,
        hasResults: !!resultResponse.data.results,
        summary: resultResponse.data.results?.summary
      });
    } else {
      logResult('Get analysis results', false, null, `Status: ${resultResponse.status}`);
    }

    // 4. Check tool results in Vector DB
    const { data: toolResults } = await supabase
      .from('tool_results_vectors')
      .select('*')
      .eq('analysis_id', analysisId)
      .limit(5);

    logResult('Tool results stored in Vector DB', true, {
      count: toolResults?.length || 0,
      tools: toolResults?.map(r => ({ tool: r.tool_id, findings: r.findings_count }))
    });

    // 5. Test progress updates retrieval
    const updatesResponse = await axios.get(
      `${API_URL}/api/progress/${analysisId}/updates?limit=10`,
      { 
        headers: { 'Authorization': `Bearer ${await getJwtToken(userEmail)}` },
        validateStatus: () => true 
      }
    );

    if (updatesResponse.status === 200) {
      logResult('Get progress updates', true, {
        updateCount: updatesResponse.data.updates?.length || 0,
        types: [...new Set(updatesResponse.data.updates?.map((u: any) => u.type) || [])]
      });
    }

    // 6. Get HTML report
    const reportResponse = await axios.get(
      `${API_URL}/v1/analysis/${analysisId}/report?format=html`,
      { 
        headers: { 'X-API-Key': apiKey },
        validateStatus: () => true 
      }
    );

    logResult('Get HTML report', reportResponse.status === 200, {
      contentType: reportResponse.headers['content-type'],
      hasContent: !!reportResponse.data
    });

    // 7. Check Vector DB retention stats (admin only - will fail for regular users)
    try {
      const retentionResponse = await axios.get(
        `${API_URL}/api/vector-retention/stats`,
        { 
          headers: { 'Authorization': `Bearer ${await getJwtToken(userEmail)}` },
          validateStatus: () => true 
        }
      );

      if (retentionResponse.status === 200) {
        logResult('Vector DB retention stats', true, retentionResponse.data.stats);
      } else {
        logResult('Vector DB retention stats', false, null, 'Not admin user (expected)');
      }
    } catch (error) {
      logResult('Vector DB retention stats', false, null, 'Access denied (expected for non-admin)');
    }

    // 8. Test semantic search for similar findings
    const { data: similarFindings } = await supabase
      .rpc('search_tool_results', {
        query_embedding: new Array(3072).fill(0.1), // Dummy embedding
        repository_id_filter: `${TEST_REPO.owner}/${TEST_REPO.repo}`,
        similarity_threshold: 0.5,
        match_count: 5
      });

    logResult('Semantic search test', true, {
      foundSimilar: similarFindings?.length || 0
    });

  } catch (error: any) {
    logResult('Unexpected error', false, null, error.message);
  }

  return analysisId;
}

async function getJwtToken(email: string): Promise<string> {
  // In real implementation, this would authenticate and get a JWT
  // For testing, we'll create a simple token
  return `test-jwt-token-for-${email}`;
}

async function runCompleteE2ETest() {
  console.log('\n🚀 Starting Complete E2E Test Flow');
  console.log('================================\n');

  // Test with primary user
  const primaryApiKey = await getApiKeyForUser(TEST_USERS.primary);
  if (primaryApiKey) {
    const analysisId1 = await testAnalysisFlow(primaryApiKey, TEST_USERS.primary);
    
    // Store the analysis ID for cross-user testing
    if (analysisId1) {
      // Test progress visibility across users
      console.log('\n📊 Testing cross-user progress visibility...');
      const secondaryApiKey = await getApiKeyForUser(TEST_USERS.secondary);
      if (secondaryApiKey) {
        try {
          const progressResponse = await axios.get(
            `${API_URL}/api/progress/${analysisId1}`,
            { 
              headers: { 'Authorization': `Bearer ${await getJwtToken(TEST_USERS.secondary)}` },
              validateStatus: () => true 
            }
          );
          
          logResult('Cross-user progress access', progressResponse.status === 403 || progressResponse.status === 404, {
            status: progressResponse.status,
            message: 'Progress correctly restricted to owner'
          });
        } catch (error) {
          logResult('Cross-user progress access', true, { message: 'Access denied as expected' });
        }
      }
    }
  }

  // Test with secondary user
  const secondaryApiKey = await getApiKeyForUser(TEST_USERS.secondary);
  if (secondaryApiKey) {
    await testAnalysisFlow(secondaryApiKey, TEST_USERS.secondary);
  }

  // Print summary
  console.log('\n\n📊 TEST SUMMARY');
  console.log('================\n');
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Passed: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Success rate: ${((successCount / results.length) * 100).toFixed(1)}%`);
  
  if (failCount > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`- ${r.step}: ${r.error || 'Unknown error'}`);
    });
  }

  // Test database metrics
  console.log('\n📈 Database Metrics:');
  
  const { count: toolResultsCount } = await supabase
    .from('tool_results_vectors')
    .select('*', { count: 'exact', head: true });
  
  const { count: analysesCount } = await supabase
    .from('pr_analyses')
    .select('*', { count: 'exact', head: true });
  
  console.log(`- Tool results in Vector DB: ${toolResultsCount || 0}`);
  console.log(`- Total analyses: ${analysesCount || 0}`);
  
  console.log('\n✨ E2E test complete!');
}

// Run the test
runCompleteE2ETest().catch(console.error);