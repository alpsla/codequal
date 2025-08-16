/**
 * Real Integration Test for Complete Orchestrator Flow
 * 
 * This test validates the complete orchestrator flow with:
 * - Real orchestrator initialization
 * - DeepWiki analysis results (can be real or simulated)
 * - Comparison agent generating full report
 * - Complete end-to-end flow validation
 */

import { ComparisonOrchestrator } from '../../../orchestrator/comparison-orchestrator';
import { ComparisonAnalysisRequest, ComparisonResult, DeepWikiAnalysisResult } from '../../../types/analysis-types';
import { ComparisonAgent } from '../../../comparison/comparison-agent';
import { SupabaseConfigProvider } from '../../../../infrastructure/supabase/supabase-config-provider';
import { SupabaseSkillProvider } from '../../../../infrastructure/supabase/supabase-skill-provider';
import { SupabaseDataStore } from '../../../../infrastructure/supabase/supabase-data-store';
import { ResearcherAgent } from '../../../../researcher/researcher-agent';
import { EducatorAgent } from '../../../educator/educator-agent';
import { AuthenticatedUser, UserRole, UserStatus } from '../../../../multi-agent/types/auth';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load environment variables
dotenv.config();

// Real PR for testing
const TEST_PR_URL = 'https://github.com/facebook/react/pull/31616';
const TEST_REPO_URL = 'https://github.com/facebook/react';
const TEST_MAIN_BRANCH = 'main';
const TEST_PR_NUMBER = 31616;

// Check if we should use real DeepWiki (via environment variable)
const USE_REAL_DEEPWIKI = process.env.USE_DEEPWIKI_MOCK === 'false';

// Create a mock authenticated user for services
function createMockUser(): AuthenticatedUser {
  return {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    organizationId: 'test-org',
    permissions: {
      repositories: {},
      organizations: ['test-org'],
      globalPermissions: ['read', 'write'],
      quotas: {
        requestsPerHour: 1000,
        maxConcurrentExecutions: 5,
        storageQuotaMB: 1000
      }
    },
    session: {
      token: 'test-token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      fingerprint: 'test-fingerprint',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent'
    },
    role: 'developer' as UserRole,
    status: 'active' as UserStatus,
    metadata: {
      createdAt: new Date(),
      lastLogin: new Date(),
      isActive: true,
      preferences: {}
    }
  };
}

// Create production-like orchestrator
async function createRealOrchestrator(): Promise<ComparisonOrchestrator> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  
  // Create providers
  const configProvider = new SupabaseConfigProvider(supabaseUrl, supabaseKey);
  const skillProvider = new SupabaseSkillProvider(supabaseUrl, supabaseKey);
  const dataStore = new SupabaseDataStore(supabaseUrl, supabaseKey);
  
  // Create researcher agent
  const researcherAgent = new ResearcherAgent(createMockUser());
  
  // Create educator agent (optional)
  let educatorAgent: EducatorAgent | undefined;
  if (process.env.SEARCH_MODEL_API_KEY) {
    // For now, educator is optional
    educatorAgent = undefined;
  }
  
  // Create logger
  const logger = {
    debug: (msg: string, data?: any) => console.log(`[DEBUG] ${msg}`, data || ''),
    info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
    warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
    error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
  };
  
  // Create comparison agent
  const comparisonAgent = new ComparisonAgent(logger);
  
  // Create orchestrator
  return new ComparisonOrchestrator(
    configProvider,
    skillProvider,
    dataStore,
    researcherAgent,
    educatorAgent,
    logger,
    comparisonAgent
  );
}

// Call DeepWiki via the API endpoint if available
async function analyzeWithRealDeepWiki(repoUrl: string, branch: string): Promise<DeepWikiAnalysisResult | null> {
  if (!USE_REAL_DEEPWIKI) {
    console.log('⚠️  USE_DEEPWIKI_MOCK is not set to false, skipping real DeepWiki');
    return null;
  }
  
  console.log(`🔍 Attempting to analyze ${repoUrl} on branch ${branch} with real DeepWiki...`);
  
  try {
    // Try to call the API endpoint if it's running
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const apiKey = process.env.API_KEY || 'test-api-key';
    
    const response = await fetch(`${apiUrl}/v1/deepwiki/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        repositoryUrl: repoUrl,
        branch: branch
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Real DeepWiki analysis completed for ${branch}`);
    return result;
    
  } catch (error) {
    console.error(`❌ Failed to call real DeepWiki API:`, error);
    return null;
  }
}

// Create mock DeepWiki analysis result
function createMockDeepWikiResult(branch: string): DeepWikiAnalysisResult {
  const isMainBranch = branch === 'main';
  
  return {
    score: isMainBranch ? 75 : 82,
    issues: [
      {
        id: `${branch}-issue-1`,
        category: 'security' as const,
        severity: 'high' as const,
        location: {
          file: 'packages/react-reconciler/src/ReactFiberWorkLoop.js',
          line: 1247,
          column: 10
        },
        message: 'Potential race condition in concurrent rendering'
      },
      {
        id: `${branch}-issue-2`,
        category: 'performance' as const,
        severity: 'medium' as const,
        location: {
          file: 'packages/react-dom/src/client/ReactDOMHostConfig.js',
          line: 523,
          column: 5
        },
        message: 'Inefficient DOM manipulation in hydration path'
      },
      ...(isMainBranch ? [] : [{
        id: `${branch}-issue-3`,
        category: 'code-quality' as const,
        severity: 'low' as const,
        location: {
          file: 'packages/react/src/ReactHooks.js',
          line: 89,
          column: 12
        },
        message: 'Complex conditional logic could be simplified'
      }])
    ],
    summary: `Analysis of ${branch} branch completed. Found ${isMainBranch ? 2 : 3} issues.`,
    metadata: {
      files_analyzed: 487,
      total_lines: 52341,
      scan_duration: 45000
    }
  };
}

// Create test request
async function createTestRequest(): Promise<ComparisonAnalysisRequest> {
  console.log('📋 Creating test request...');
  
  // Try real DeepWiki first, fall back to mock
  let mainBranchAnalysis = await analyzeWithRealDeepWiki(TEST_REPO_URL, TEST_MAIN_BRANCH);
  let featureBranchAnalysis = await analyzeWithRealDeepWiki(TEST_REPO_URL, `pr/${TEST_PR_NUMBER}`);
  
  // Use mock if real DeepWiki is not available
  if (!mainBranchAnalysis) {
    console.log('📦 Using mock DeepWiki analysis for main branch');
    mainBranchAnalysis = createMockDeepWikiResult('main');
  }
  
  if (!featureBranchAnalysis) {
    console.log('📦 Using mock DeepWiki analysis for feature branch');
    featureBranchAnalysis = createMockDeepWikiResult('feature');
  }
  
  return {
    userId: 'test-user-123',
    teamId: 'test-team-456',
    language: 'javascript',
    sizeCategory: 'large',
    mainBranchAnalysis,
    featureBranchAnalysis,
    prMetadata: {
      id: `pr-${TEST_PR_NUMBER}`,
      number: TEST_PR_NUMBER,
      title: 'Fix: Suspend while recovering from hydration errors',
      author: 'acdlite',
      repository_url: TEST_PR_URL,
      created_at: new Date().toISOString(),
      linesAdded: 150,
      linesRemoved: 50
    },
    generateReport: true,
    includeEducation: false // Skip education for now
  };
}

// Save report to file
async function saveReportToFile(report: string, prNumber: number): Promise<string> {
  const reportsDir = path.join(__dirname, '../../reports', 'real-flow');
  await fs.mkdir(reportsDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `pr-${prNumber}-real-flow-${timestamp}.md`;
  const filepath = path.join(reportsDir, filename);
  
  await fs.writeFile(filepath, report, 'utf-8');
  console.log(`📄 Report saved to: ${filepath}`);
  
  return filepath;
}

// Main test execution
async function runRealFlowTest(): Promise<void> {
  console.log('🧪 Starting REAL orchestrator flow test...');
  console.log(`📊 Using ${USE_REAL_DEEPWIKI ? 'REAL DeepWiki' : 'mock data'} for analysis`);
  console.log('=' .repeat(60) + '\n');
  
  try {
    // Step 1: Create orchestrator
    console.log('1️⃣ Creating production-like orchestrator...');
    const orchestrator = await createRealOrchestrator();
    console.log('✅ Orchestrator created successfully\n');
    
    // Step 2: Create test request
    console.log('2️⃣ Creating test request with DeepWiki analysis...');
    const request = await createTestRequest();
    console.log('✅ Test request created\n');
    
    // Step 3: Execute orchestrator flow
    console.log('3️⃣ Executing complete orchestrator flow...');
    console.log('   - Loading configuration from Supabase');
    console.log('   - Running comparison analysis');
    console.log('   - Generating complete report\n');
    
    const startTime = Date.now();
    const result = await orchestrator.executeComparison(request);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Orchestrator flow completed in ${(duration / 1000).toFixed(2)}s\n`);
    
    // Step 4: Validate results
    console.log('4️⃣ Validating results...');
    
    if (!result.success) {
      throw new Error('Orchestrator returned unsuccessful result');
    }
    
    if (!result.report && !result.prComment) {
      throw new Error('No report or PR comment generated');
    }
    
    console.log('✅ All validations passed\n');
    
    // Step 5: Display results
    console.log('📊 Results Summary:');
    console.log('=' .repeat(60));
    console.log(`Success: ${result.success}`);
    console.log(`Report Generated: ${result.report ? 'Yes' : 'No'}`);
    console.log(`PR Comment Generated: ${result.prComment ? 'Yes' : 'No'}`);
    
    if (result.metadata) {
      console.log(`\nMetadata:`);
      console.log(`- Orchestrator Version: ${result.metadata.orchestratorVersion}`);
      console.log(`- Model Used: ${result.metadata.modelUsed?.provider} / ${result.metadata.modelUsed?.modelId}`);
      console.log(`- Config ID: ${result.metadata.configId}`);
      console.log(`- Format: ${result.metadata.format}`);
    }
    
    // Display report preview
    if (result.report) {
      console.log('\n📄 Report Preview (first 1000 chars):');
      console.log('=' .repeat(60));
      console.log(result.report.substring(0, 1000) + '...\n');
      
      // Save full report
      const filepath = await saveReportToFile(result.report, TEST_PR_NUMBER);
      console.log(`✅ Full report saved to: ${filepath}`);
    }
    
    if (result.prComment) {
      console.log('\n💬 PR Comment:');
      console.log('=' .repeat(60));
      console.log(result.prComment);
    }
    
    console.log('\n✨ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  runRealFlowTest().then(() => {
    console.log('\n✅ Test execution completed');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });
}

// Export for Jest
describe('Real Orchestrator Flow Test', () => {
  it('should execute complete orchestrator flow', async () => {
    await runRealFlowTest();
  }, 120000); // 2 minute timeout
});

export { runRealFlowTest };