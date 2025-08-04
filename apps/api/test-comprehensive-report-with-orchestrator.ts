#!/usr/bin/env ts-node

/**
 * Test Comprehensive Report Generation with Orchestrator
 * 
 * This test demonstrates the proper flow:
 * 1. Orchestrator retrieves config from Supabase based on context
 * 2. If no config exists, it uses Researcher to find optimal model
 * 3. Comparison agent is initialized with dynamic model selection
 * 4. Full report is generated with proper model attribution
 */

import * as dotenv from 'dotenv';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

import { ComparisonOrchestrator } from '../../packages/agents/src/standard/orchestrator/comparison-orchestrator';
import { SupabaseConfigProvider } from '../../packages/agents/src/infrastructure/supabase/supabase-config-provider';
import { SupabaseSkillProvider } from '../../packages/agents/src/infrastructure/supabase/supabase-skill-provider';
import { SupabaseDataStore } from '../../packages/agents/src/infrastructure/supabase/supabase-data-store';
import { ResearcherAgent } from '../../packages/agents/src/researcher/researcher-agent';
import { ComparisonAgent } from '../../packages/agents/src/standard/comparison/comparison-agent';
import { ComparisonAnalysisRequest, DeepWikiAnalysisResult } from '../../packages/agents/src/standard/types/analysis-types';

// Mock DeepWiki results for testing - using Standard framework format
function createMockDeepWikiResults(): { main: any, feature: any } {
  const mainBranch = {
    success: true,
    repository_url: 'https://github.com/techcorp/payment-processor',
    branch: 'main',
    issues: [
      {
        id: 'main-crit-sec-001',
        severity: 'critical',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'src/config/database.ts', line: 12 },
        message: 'Hardcoded Database Credentials',
        description: 'Database credentials are hardcoded in the source code. Complete database compromise possible.',
        suggestedFix: 'Use environment variables for sensitive configuration',
        confidence: 0.95
      },
      {
        id: 'main-high-sec-001',
        severity: 'high',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'src/routes/auth.ts', line: 45 },
        message: 'No Rate Limiting on Authentication Endpoints',
        description: 'Authentication endpoints lack rate limiting. Brute force attacks possible.',
        suggestedFix: 'Implement rate limiting middleware',
        confidence: 0.90
      },
      {
        id: 'main-high-perf-001',
        severity: 'high',
        category: 'performance',
        type: 'bug',
        location: { file: 'src/services/cache.service.ts', line: 78 },
        message: 'Memory Leak in Cache Service',
        description: 'Cache never clears old entries. Server crashes after 48 hours.',
        suggestedFix: 'Implement TTL and size limits',
        confidence: 0.85
      }
    ],
    metrics: {
      total_issues: 3,
      critical_issues: 1,
      high_issues: 2,
      medium_issues: 0,
      low_issues: 0,
      security_issues: 2,
      performance_issues: 1,
      code_quality_issues: 0
    },
    scan_metadata: {
      duration_seconds: 45.2,
      files_analyzed: 156,
      total_lines: 15420,
      scan_date: new Date().toISOString(),
      model_used: 'deepwiki-analyzer'
    }
  };

  const featureBranch = {
    success: true,
    repository_url: 'https://github.com/techcorp/payment-processor',
    branch: 'feature/microservices-phase1',
    issues: [
      // Only one issue from main branch remains (hardcoded credentials fixed)
      {
        id: 'main-high-perf-001',
        severity: 'high',
        category: 'performance',
        type: 'bug',
        location: { file: 'src/services/cache.service.ts', line: 78 },
        message: 'Memory Leak in Cache Service',
        description: 'Cache never clears old entries. Server crashes after 48 hours.',
        suggestedFix: 'Implement TTL and size limits',
        confidence: 0.85
      },
      // New issues introduced in PR
      {
        id: 'pr-crit-sec-001',
        severity: 'critical',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'services/user-service/src/routes/internal.ts', line: 45 },
        message: 'Exposed Internal APIs Without Authentication',
        description: 'Internal API endpoints exposed without authentication. Complete user data exposure.',
        suggestedFix: 'Implement service-to-service authentication',
        confidence: 0.95
      },
      {
        id: 'pr-crit-perf-001',
        severity: 'critical',
        category: 'performance',
        type: 'bug',
        location: { file: 'services/user-service/src/services/team.service.ts', line: 89 },
        message: 'N+1 Query Pattern',
        description: 'Nested loops performing database queries. Can generate 10,000+ queries.',
        suggestedFix: 'Use aggregation pipeline',
        confidence: 0.92
      },
      {
        id: 'pr-high-sec-001',
        severity: 'high',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'services/payment-service/src/middleware/logging.ts', line: 23 },
        message: 'API Keys Logged in Plain Text',
        description: 'Sensitive credentials exposed in logs. PCI compliance violation.',
        suggestedFix: 'Sanitize logs before writing',
        confidence: 0.88
      }
    ],
    metrics: {
      total_issues: 4,
      critical_issues: 2,
      high_issues: 2,
      medium_issues: 0,
      low_issues: 0,
      security_issues: 2,
      performance_issues: 2,
      code_quality_issues: 0
    },
    scan_metadata: {
      duration_seconds: 52.8,
      files_analyzed: 189,
      total_lines: 18247,
      scan_date: new Date().toISOString(),
      model_used: 'deepwiki-analyzer'
    }
  };

  return { main: mainBranch, feature: featureBranch };
}

async function testOrchestratorWithDynamicModelSelection() {
  console.log('🚀 Testing Orchestrator with Dynamic Model Selection');
  console.log('================================================================\n');

  try {
    // Initialize Supabase providers
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    console.log('📦 Initializing Supabase providers...');
    const configProvider = new SupabaseConfigProvider(supabaseUrl, supabaseKey);
    const skillProvider = new SupabaseSkillProvider(supabaseUrl, supabaseKey);
    const dataStore = new SupabaseDataStore(supabaseUrl, supabaseKey);
    
    console.log('🔬 Creating Researcher agent...');
    const researcherAgent = new ResearcherAgent(console as any);
    
    console.log('🤖 Creating Comparison agent...');
    const comparisonAgent = new ComparisonAgent(console);
    
    console.log('🎭 Creating Orchestrator...');
    const orchestrator = new ComparisonOrchestrator(
      configProvider,
      skillProvider,
      dataStore,
      researcherAgent,
      undefined, // No educator for this test
      console,
      comparisonAgent
    );

    // Create mock DeepWiki results
    const { main, feature } = createMockDeepWikiResults();

    // Create comparison request
    const request: ComparisonAnalysisRequest = {
      mainBranchAnalysis: main,
      featureBranchAnalysis: feature,
      userId: '00000000-0000-0000-0000-000000000001',
      teamId: '00000000-0000-0000-0000-000000000002',
      language: 'typescript',
      sizeCategory: 'large',
      // repositoryUrl is not part of ComparisonAnalysisRequest
      prMetadata: {
        number: 3842,
        title: 'Major refactor: Microservices migration Phase 1',
        author: '00000000-0000-0000-0000-000000000003',
        repository_url: 'https://github.com/techcorp/payment-processor',
        linesAdded: 1923,
        linesRemoved: 924
      },
      includeEducation: true,
      generateReport: true
    };

    console.log('\n🔄 Executing orchestrated comparison...');
    console.log('   - Context: typescript, large, 89 files');
    console.log('   - Looking for config in Supabase...');
    
    const result = await orchestrator.executeComparison(request);
    
    console.log('\n✅ Orchestration complete!');
    console.log(`   - Model Used: ${result.metadata?.modelUsed?.modelId || 'Dynamic'}`);
    console.log(`   - Provider: ${result.metadata?.modelUsed?.provider || 'Unknown'}`);
    console.log(`   - Config ID: ${result.metadata?.configId || 'Generated'}`);
    
    // Save results
    const outputDir = join(__dirname, 'test-output', new Date().toISOString().split('T')[0]);
    mkdirSync(outputDir, { recursive: true });
    
    // Save comprehensive report
    if (result.report) {
      const reportPath = join(outputDir, 'orchestrator-comprehensive-report.md');
      writeFileSync(reportPath, result.report);
      console.log(`\n📄 Full report saved to: ${reportPath}`);
    }
    
    // Save PR comment
    if (result.prComment) {
      const commentPath = join(outputDir, 'orchestrator-pr-comment.md');
      writeFileSync(commentPath, result.prComment);
      console.log(`💬 PR comment saved to: ${commentPath}`);
    }
    
    // Save metadata
    const metadataPath = join(outputDir, 'orchestrator-metadata.json');
    writeFileSync(metadataPath, JSON.stringify(result.metadata, null, 2));
    console.log(`📊 Metadata saved to: ${metadataPath}`);
    
    // Display summary
    console.log('\n📊 Analysis Summary:');
    console.log(`   - Success: ${result.success}`);
    console.log(`   - Repository Context: ${result.metadata?.repositoryContext?.repoType || 'N/A'}`);
    console.log(`   - Complexity: ${result.metadata?.repositoryContext?.complexity || 'N/A'}`);
    console.log(`   - Estimated Cost: $${result.metadata?.estimatedCost || 0}`);
    
    if (result.skillTracking) {
      console.log(`   - Skill Update: ${result.skillTracking.previousScore || 0} → ${result.skillTracking.newScore || 0}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testOrchestratorWithDynamicModelSelection()
    .then(() => {
      console.log('\n🎉 Test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testOrchestratorWithDynamicModelSelection };