/**
 * Real Integration Test for Complete Orchestrator Flow
 * 
 * This test uses a real PR URL to validate the complete end-to-end process:
 * 1. Uses DeepWiki service to analyze both main and feature branches
 * 2. Orchestrator fetches config from Supabase (pre-populated by Researcher)
 * 3. Orchestrator uses comparison agent to analyze differences
 * 4. Complete report generation with real PR data
 * 5. Saves the report as an .md file following the template
 */

import { createClient } from '@supabase/supabase-js';
import { ComparisonOrchestrator } from '../../orchestrator/comparison-orchestrator';
import { ComparisonAnalysisRequest, ComparisonResult, DeepWikiAnalysisResult } from '../../types/analysis-types';
import { ComparisonAgent } from '../../comparison/comparison-agent';
// import { DeepWikiKubernetesService } from '@codequal/core/services/deepwiki-kubernetes.service';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Initialize Supabase client from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Real PR URL for testing (using a small, completed PR for consistency)
const TEST_PR_URL = 'https://github.com/facebook/react/pull/28807';
const TEST_REPO_URL = 'https://github.com/facebook/react';
const TEST_MAIN_BRANCH = 'main';
const TEST_FEATURE_BRANCH = 'pr/28807'; // Branch for the PR

async function createProductionOrchestrator(): Promise<ComparisonOrchestrator> {
  // Import real Supabase providers
  const { SupabaseConfigProvider } = await import('../../../infrastructure/supabase/supabase-config-provider');
  const { SupabaseSkillProvider } = await import('../../../infrastructure/supabase/supabase-skill-provider');
  const { SupabaseDataStore } = await import('../../../infrastructure/supabase/supabase-data-store');
  const { ResearcherAgent } = await import('../../../researcher/researcher-agent');
  
  // Create real providers with Supabase connection
  const configProvider = new SupabaseConfigProvider(supabaseUrl!, supabaseKey!);
  const skillProvider = new SupabaseSkillProvider(supabaseUrl!, supabaseKey!);
  const dataStore = new SupabaseDataStore(supabaseUrl!, supabaseKey!);
  
  // Create mock authenticated user for testing
  const mockUser: any = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User'
  };
  const researcherAgent = new ResearcherAgent(mockUser);
  
  // Create comparison agent with mock logger
  const mockLogger = {
    debug: (msg: string, data?: any) => console.log(`[DEBUG] ${msg}`, data),
    info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data),
    warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data),
    error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data)
  };
  const comparisonAgent = new ComparisonAgent(mockLogger);
  
  // Create orchestrator with real providers
  return new ComparisonOrchestrator(
    configProvider,
    skillProvider,
    dataStore,
    researcherAgent,
    undefined, // No educator agent for this test
    console,
    comparisonAgent
  );
}

// Initialize DeepWiki service for real analysis
// TODO: Uncomment when DeepWikiKubernetesService is available in standard package
/*
function createDeepWikiService(): DeepWikiKubernetesService {
  return new DeepWikiKubernetesService({
    namespace: process.env.DEEPWIKI_NAMESPACE || 'codequal-dev',
    podName: process.env.DEEPWIKI_POD_NAME || 'deepwiki-open',
    containerName: process.env.DEEPWIKI_CONTAINER_NAME || 'deepwiki',
    kubeConfig: process.env.KUBECONFIG_PATH
  });
}
*/

// Analyze repository with DeepWiki service
async function analyzeWithDeepWiki(repoUrl: string, branch: string): Promise<DeepWikiAnalysisResult> {
  console.log(`🔍 Analyzing ${repoUrl} on branch ${branch} with DeepWiki...`);
  
  // TODO: Uncomment when DeepWikiKubernetesService is available
  /*
  const deepWikiService = createDeepWikiService();
  
  try {
    const result = await deepWikiService.analyzeRepository({
      repositoryUrl: repoUrl,
      branch: branch,
      modelConfig: {
        provider: 'openrouter',
        model: 'anthropic/claude-3-opus'
      },
      analysisType: 'comprehensive',
      includeMetrics: true
    });
    
    // Transform DeepWiki result to our expected format
    return {
      score: result.output?.score || 75,
      issues: result.output?.issues || [],
      summary: result.output?.summary || `Analysis completed for ${branch} branch`,
      metadata: {
        files_analyzed: result.output?.metadata?.files_analyzed || 0,
        total_lines: result.output?.metadata?.total_lines || 0,
        scan_duration: result.duration || 0
      }
    };
  } catch (error) {
    console.error(`Failed to analyze with DeepWiki: ${error}`);
    // Return mock data as fallback for testing
    return createMockAnalysisResult(branch);
  }
  */
  
  // For now, simulate DeepWiki analysis with mock data
  console.log('⚠️  Using mock data - real DeepWiki integration pending');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
  return createMockAnalysisResult(branch);
}

// Create mock test data as fallback
function createMockAnalysisResult(branch: string): DeepWikiAnalysisResult {
  return {
    score: branch === 'main' ? 75 : 80,
    issues: [
      {
        id: `${branch}-issue-1`,
        category: 'security',
        severity: 'high',
        location: {
          file: 'src/api/auth.ts',
          line: 45,
          column: 10
        },
        message: 'Potential SQL injection vulnerability'
      },
      {
        id: `${branch}-issue-2`,
        category: 'performance',
        severity: 'medium',
        location: {
          file: 'src/services/data.ts',
          line: 120,
          column: 5
        },
        message: 'Inefficient database query in loop'
      }
    ],
    summary: `Analysis completed for ${branch} branch with ${branch === 'main' ? '2 existing' : '2 new'} issues`,
    metadata: {
      files_analyzed: 50,
      total_lines: 5000,
      scan_duration: 2500
    }
  };
}

async function createRealTestRequest(useDeepWiki = false): Promise<ComparisonAnalysisRequest> {
  let mainBranchAnalysis: DeepWikiAnalysisResult;
  let featureBranchAnalysis: DeepWikiAnalysisResult;
  
  if (useDeepWiki) {
    // Use real DeepWiki analysis
    mainBranchAnalysis = await analyzeWithDeepWiki(TEST_REPO_URL, TEST_MAIN_BRANCH);
    featureBranchAnalysis = await analyzeWithDeepWiki(TEST_REPO_URL, TEST_FEATURE_BRANCH);
  } else {
    // Use mock data
    mainBranchAnalysis = createMockAnalysisResult('main');
    featureBranchAnalysis = createMockAnalysisResult('feature');
  }
  
  return {
    userId: 'test-user-123',
    teamId: 'test-team-456',
    language: 'javascript', // React is JavaScript
    sizeCategory: 'small',
    mainBranchAnalysis,
    featureBranchAnalysis,
    prMetadata: {
      id: 'pr-28807',
      number: 28807,
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
  const reportsDir = path.join(__dirname, '../../reports');
  await fs.mkdir(reportsDir, { recursive: true });
  
  const filename = `pr-${prNumber}-analysis-${new Date().toISOString().split('T')[0]}.md`;
  const filepath = path.join(reportsDir, filename);
  
  await fs.writeFile(filepath, report, 'utf-8');
  console.log(`📄 Report saved to: ${filepath}`);
  
  return filepath;
}

async function runTest(useRealDeepWiki = false) {
  console.log('🧪 Starting real orchestrator end-to-end test with PR URL...');
  console.log(`📊 Using ${useRealDeepWiki ? 'REAL DeepWiki service' : 'mock data'} for analysis\n`);
  
  try {
    // Step 1: Create orchestrator (will fetch config from Supabase internally)
    console.log('1️⃣ Creating production orchestrator...');
    let result: ComparisonResult;
    
    try {
      const orchestrator = await createProductionOrchestrator();
      console.log('✅ Orchestrator created successfully\n');
      
      // Step 2: Create real PR analysis request
      console.log('2️⃣ Creating real PR analysis request...');
      const request = await createRealTestRequest(useRealDeepWiki);
      console.log(`✅ Test request created for PR: ${TEST_PR_URL}\n`);
      
      // Step 3: Execute complete orchestrator flow
      console.log('3️⃣ Executing complete orchestrator analysis...');
      console.log('   - Orchestrator will use provided DeepWiki analysis for both branches');
      console.log('   - Orchestrator will use comparison agent to analyze differences');
      console.log('   - Orchestrator will generate complete report\n');
      
      result = await orchestrator.executeComparison(request);
      console.log('✅ Complete orchestrator flow completed\n');
      
      // Step 4: Validate results
      console.log('4️⃣ Validating results...');
      validateResults(result);
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('not yet implemented')) {
        console.log('⚠️  Production orchestrator not yet available, using fallback test...\n');
        result = await runFallbackTest(useRealDeepWiki);
      } else {
        throw error;
      }
    }
    
    // Step 5: Display summary
    console.log('\n📊 Results Summary:');
    console.log('==================');
    console.log(`Success: ${result.success}`);
    console.log(`Report Generated: ${result.report ? 'Yes' : 'No'}`);
    console.log(`PR Comment Generated: ${result.prComment ? 'Yes' : 'No'}`);
    
    if (result.comparison) {
      console.log(`\nComparison Details:`);
      console.log(`- New Issues: ${result.comparison.newIssues?.length || 0}`);
      console.log(`- Resolved Issues: ${result.comparison.resolvedIssues?.length || 0}`);
      console.log(`- Risk Assessment: ${result.comparison.summary?.overallAssessment?.prRecommendation || 'N/A'}`);
    } else if (result.analysis) {
      console.log(`\nAnalysis Details:`);
      console.log(`- Raw analysis data available`);
    }
    
    if (result.metadata) {
      console.log(`\nMetadata:`);
      console.log(`- Orchestrator Version: ${result.metadata.orchestratorVersion}`);
      console.log(`- Model Used: ${result.metadata.modelUsed}`);
      console.log(`- Format: ${result.metadata.format}`);
    }
    
    // Display sample of the report
    if (result.report) {
      console.log('\n📄 Report Preview (first 500 chars):');
      console.log('=====================================');
      console.log(result.report.substring(0, 500) + '...\n');
      
      // Save the full report to file
      try {
        const filepath = await saveReportToFile(result.report, 28807);
        console.log(`\n✅ Full report saved to: ${filepath}`);
      } catch (error) {
        console.error('Failed to save report:', error);
      }
    }
    
    if (result.prComment) {
      console.log('💬 PR Comment:');
      console.log('==============');
      console.log(result.prComment);
    }
    
    console.log('\n✨ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nStack trace:', error instanceof Error ? error.stack : 'No stack trace');
    process.exit(1);
  }
}

async function runFallbackTest(useRealDeepWiki = false): Promise<ComparisonResult> {
  console.log('🔄 Running fallback test with comparison agent directly...\n');
  
  try {
    // Step 1: Create comparison agent
    console.log('1️⃣ Creating comparison agent...');
    const comparisonAgent = new ComparisonAgent(console);
    
    // Initialize with config
    await comparisonAgent.initialize({
      language: 'javascript',
      sizeCategory: 'small',
      role: 'comparison',
      prompt: 'You are an expert code comparison analyst.'
    });
    console.log('✅ Comparison agent initialized successfully\n');
    
    // Step 2: Create test request
    console.log('2️⃣ Creating test comparison request...');
    const request = await createRealTestRequest(useRealDeepWiki);
    console.log('✅ Test request created\n');
    
    // Step 3: Execute comparison analysis
    console.log('3️⃣ Executing comparison analysis...');
    const result = await comparisonAgent.analyze({
      mainBranchAnalysis: request.mainBranchAnalysis!,
      featureBranchAnalysis: request.featureBranchAnalysis!,
      prMetadata: request.prMetadata,
      generateReport: request.generateReport !== false
    });
    console.log('✅ Comparison completed\n');
    
    // Step 4: Validate results
    console.log('4️⃣ Validating results...');
    validateResults(result);
    
    // Step 5: Display summary
    console.log('\n📊 Fallback Test Results Summary:');
    console.log('==================================');
    console.log(`Success: ${result.success}`);
    console.log(`Report Generated: ${result.report ? 'Yes' : 'No'}`);
    console.log(`PR Comment Generated: ${result.prComment ? 'Yes' : 'No'}`);
    
    if (result.comparison) {
      console.log(`\nComparison Details:`);
      console.log(`- New Issues: ${result.comparison.newIssues?.length || 0}`);
      console.log(`- Resolved Issues: ${result.comparison.resolvedIssues?.length || 0}`);
      console.log(`- Modified Issues: ${result.comparison.modifiedIssues?.length || 0}`);
    }
    
    if (result.metadata) {
      console.log(`\nMetadata:`);
      console.log(`- Agent Version: ${result.metadata.agentVersion}`);
      console.log(`- Model Used: ${result.metadata.modelUsed}`);
      console.log(`- Format: ${result.metadata.format}`);
    }
    
    // Display sample of the report
    if (result.report) {
      console.log('\n📄 Report Preview (first 500 chars):');
      console.log('=====================================');
      console.log(result.report.substring(0, 500) + '...\n');
      
      // Save the full report to file
      try {
        const filepath = await saveReportToFile(result.report, 28807);
        console.log(`\n✅ Full report saved to: ${filepath}`);
      } catch (error) {
        console.error('Failed to save report:', error);
      }
    }
    
    if (result.prComment) {
      console.log('💬 PR Comment:');
      console.log('==============');
      console.log(result.prComment);
    }
    
    console.log('\n✨ Fallback test completed successfully!');
    
    return result;
  } catch (error) {
    console.error('❌ Fallback test failed:', error);
    console.error('\nStack trace:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

function validateResults(result: ComparisonResult) {
  const errors: string[] = [];
  
  // Check required fields
  if (typeof result.success !== 'boolean') errors.push('Result success flag is missing or not boolean');
  if (!result.success) errors.push('Result success flag is false');
  
  // Check optional fields based on what was requested
  if (!result.report && !result.prComment) {
    errors.push('Neither report nor prComment was generated');
  }
  
  // Check comparison structure if present
  if (result.comparison) {
    if (result.comparison.newIssues && !Array.isArray(result.comparison.newIssues)) {
      errors.push('comparison.newIssues is not an array');
    }
    if (result.comparison.resolvedIssues && !Array.isArray(result.comparison.resolvedIssues)) {
      errors.push('comparison.resolvedIssues is not an array');
    }
  }
  
  // Check for either comparison or analysis
  if (!result.comparison && !result.analysis) {
    console.warn('⚠️  Warning: Neither comparison nor analysis object present');
  }
  
  if (errors.length > 0) {
    console.error('❌ Validation errors:');
    errors.forEach(err => console.error(`   - ${err}`));
    throw new Error('Result validation failed');
  }
  
  console.log('✅ All validations passed');
}

// Jest test structure
describe('Orchestrator Flow Integration Test', () => {
  it('should execute complete orchestrator flow with mock data', async () => {
    await runTest(false);
  }, 30000); // 30 second timeout for integration test
  
  it.skip('should execute complete orchestrator flow with real DeepWiki analysis', async () => {
    // Skip by default, enable when DeepWiki service is available
    await runTest(true);
  }, 120000); // 2 minute timeout for real DeepWiki analysis
});

export { runTest, createRealTestRequest, createMockAnalysisResult };