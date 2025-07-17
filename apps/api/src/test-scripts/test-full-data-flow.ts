#!/usr/bin/env ts-node

import chalk from 'chalk';
import { ResultOrchestrator } from '../services/result-orchestrator';
import { createLogger } from '@codequal/core/utils';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('DataFlowTest');

/**
 * Test the complete data flow from PR fetch to report generation
 */
async function testFullDataFlow() {
  console.log(chalk.cyan('\n🔬 Testing Complete Data Flow\n'));
  console.log('='.repeat(60));

  // Mock authenticated user
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    permissions: ['read', 'write'],
    role: 'user' as const,
    status: 'active' as const,
    session: {
      token: 'test-token-123',
      expiresAt: new Date(Date.now() + 3600000)
    }
  };

  // Test configuration - using shadcn/ui which we know has PRs
  const testConfig = {
    repositoryUrl: 'https://github.com/shadcn-ui/ui',
    prNumber: 1, // Use a low number that likely exists
    analysisMode: 'quick' as const,
    authenticatedUser: mockUser
  };

  try {
    // Step 1: Test GitHub API fetch
    console.log(chalk.blue('\n1️⃣ Testing GitHub API Fetch...'));
    const orchestrator = new ResultOrchestrator(mockUser);
    
    // Use the PRContextService directly for testing
    const prContextService = new (await import('../services/pr-context-service.js')).PRContextService();
    
    // Fetch PR details
    const prDetails = await prContextService.fetchPRDetails(
      testConfig.repositoryUrl,
      testConfig.prNumber,
      undefined // No GitHub token for test
    );
    
    // Get PR diff
    const diff = await prContextService.getPRDiff(prDetails);
    const changedFiles = prContextService.extractChangedFiles(diff);
    
    // Create a mock PR context similar to what extractPRContext returns
    const prContext = {
      repositoryUrl: testConfig.repositoryUrl,
      prNumber: testConfig.prNumber,
      prDetails,
      diff,
      changedFiles,
      title: prDetails.title,
      author: prDetails.author,
      branch: prDetails.headBranch,
      baseBranch: prDetails.baseBranch,
      files: diff.files.map((file: any) => ({
        path: file.filename,
        content: '',
        diff: file.patch || '',
        previousContent: ''
      }))
    };
    
    console.log(chalk.green('✓ PR fetched successfully'));
    console.log(`  - Title: ${prContext.title}`);
    console.log(`  - Author: ${prContext.author}`);
    console.log(`  - Files changed: ${prContext.files?.length || 0}`);
    console.log(`  - Base branch: ${prContext.baseBranch}`);
    
    // Verify files array is populated
    if (!prContext.files || prContext.files.length === 0) {
      console.log(chalk.red('❌ ERROR: Files array is empty!'));
      console.log('   This is why agents return 0 findings.');
    } else {
      console.log(chalk.green('✓ Files array populated:'));
      prContext.files.slice(0, 3).forEach((file: any) => {
        console.log(`   - ${file.path} (${file.diff ? 'has diff' : 'no diff'})`);
      });
    }

    // Step 2: Test PR context extraction
    console.log(chalk.blue('\n2️⃣ Testing PR Context Extraction...'));
    console.log('  - Repository data structure:');
    console.log(`    - url: ${prContext.repositoryUrl}`);
    console.log(`    - branch: ${prContext.branch}`);
    console.log(`    - files: ${JSON.stringify(prContext.files?.length)}`);

    // Step 3: Test agent initialization
    console.log(chalk.blue('\n3️⃣ Testing Agent Initialization...'));
    const agentConfig = {
      strategy: 'parallel' as const,
      agents: [
        { role: 'security', provider: 'openai', position: 'primary' },
        { role: 'architecture', provider: 'claude', position: 'secondary' },
        { role: 'code-quality', provider: 'openai', position: 'secondary' }
      ]
    };
    console.log('  - Strategy:', agentConfig.strategy);
    console.log('  - Agents:', agentConfig.agents.length);

    // Step 4: Test agent execution
    console.log(chalk.blue('\n4️⃣ Testing Agent Execution...'));
    
    // Simulate agent execution to check if they receive PR data
    const mockAgentData = {
      repository: testConfig.repositoryUrl,
      prNumber: testConfig.prNumber,
      files: prContext.files || []
    };
    
    console.log('  - Mock agent input:');
    console.log(`    - Repository: ${mockAgentData.repository}`);
    console.log(`    - PR Number: ${mockAgentData.prNumber}`);
    console.log(`    - Files to analyze: ${mockAgentData.files.length}`);

    // Step 5: Test educational suggestions
    console.log(chalk.blue('\n5️⃣ Testing Educational Suggestions...'));
    console.log('  - Educational agent should generate:');
    console.log('    - Learning opportunities from code patterns');
    console.log('    - Best practice recommendations');
    console.log('    - Skill improvement suggestions');

    // Step 6: Test tools contribution
    console.log(chalk.blue('\n6️⃣ Testing Tools Contribution...'));
    console.log('  - Tools that should contribute:');
    console.log('    - Static analysis tools');
    console.log('    - Security scanners');
    console.log('    - Performance analyzers');
    console.log('    - Documentation generators');

    // Step 7: Test DeepWiki report generation
    console.log(chalk.blue('\n7️⃣ Testing DeepWiki Report Generation...'));
    console.log('  - DeepWiki should generate:');
    console.log('    - Contextual documentation');
    console.log('    - Code explanations');
    console.log('    - Architecture insights');
    console.log('    - Related knowledge base articles');

    // Step 8: Test result processing
    console.log(chalk.blue('\n8️⃣ Testing Result Processing...'));
    console.log('  - Processing should include:');
    console.log('    - Agent result aggregation');
    console.log('    - Finding deduplication');
    console.log('    - Severity calculation');
    console.log('    - Confidence scoring');

    // Step 9: Test report generation
    console.log(chalk.blue('\n9️⃣ Testing Report Generation...'));
    console.log('  - Report should include:');
    console.log('    - Executive summary');
    console.log('    - Detailed findings');
    console.log('    - Educational content');
    console.log('    - Tool recommendations');
    console.log('    - DeepWiki insights');

    // Test actual analysis
    console.log(chalk.blue('\n🚀 Running Full Analysis...'));
    const result = await orchestrator.analyzePR(testConfig);
    
    console.log(chalk.green('\n✅ Analysis completed'));
    console.log(`  - Report ID: ${result.report?.reportId || 'N/A'}`);
    
    // Count total findings across all categories
    let totalFindings = 0;
    if (result.findings) {
      totalFindings = (result.findings.security?.length || 0) +
                     (result.findings.architecture?.length || 0) +
                     (result.findings.performance?.length || 0) +
                     (result.findings.codeQuality?.length || 0);
    }
    
    console.log(`  - Total findings: ${totalFindings}`);
    console.log(`  - Educational content: ${result.educationalContent?.length || 0}`);
    console.log(`  - Summary: ${result.report?.summary ? 'Generated' : 'Missing'}`);
    console.log(`  - Processing steps: ${result.metadata?.processingSteps?.length || 0}`);
    
    // Check for specific issues
    if (totalFindings === 0) {
      console.log(chalk.red('\n⚠️  WARNING: No findings generated!'));
      console.log('   Possible causes:');
      console.log('   - Files array not passed to agents');
      console.log('   - Agents not executing properly');
      console.log('   - Result processing issues');
    }

    // Display findings by category
    if (result.findings && totalFindings > 0) {
      console.log(chalk.green('\n📋 Findings by Category:'));
      if (result.findings.security?.length > 0) {
        console.log(`\n  Security (${result.findings.security.length}):`);
        result.findings.security.slice(0, 2).forEach((finding: any) => {
          console.log(`    - ${finding.title || finding.issue}`);
        });
      }
      if (result.findings.architecture?.length > 0) {
        console.log(`\n  Architecture (${result.findings.architecture.length}):`);
        result.findings.architecture.slice(0, 2).forEach((finding: any) => {
          console.log(`    - ${finding.title || finding.issue}`);
        });
      }
    }

    // Check report generation
    console.log(chalk.blue('\n📄 Checking Report Generation...'));
    const reportUrl = `http://localhost:3001/api/analysis/${result.report?.reportId || 'unknown'}/report?format=html&api_key=test_key`;
    console.log(`  - Report URL: ${reportUrl}`);

  } catch (error) {
    console.error(chalk.red('\n❌ Test failed:'), error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

// Run the test
testFullDataFlow().then(() => {
  console.log(chalk.cyan('\n✨ Data flow test complete\n'));
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});