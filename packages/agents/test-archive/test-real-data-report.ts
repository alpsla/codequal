#!/usr/bin/env ts-node
/**
 * Test Report Generation with Real Data from Supabase
 * 
 * This script demonstrates generating a comprehensive analysis report
 * using the Standard framework with dynamic skill scoring and 
 * real data persistence
 */

import { createProductionOrchestrator } from './src/standard/infrastructure/factory';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from parent directory
config({ path: path.resolve(__dirname, '../../.env') });

async function generateRealDataReport() {
  console.log('🚀 Generating Analysis Report with Real Data\n');
  
  // Verify environment variables
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars);
    console.log('\nPlease set the following environment variables:');
    console.log('- SUPABASE_URL: Your Supabase project URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key');
    process.exit(1);
  }
  
  try {
    // Create production orchestrator with real Supabase connection
    console.log('📊 Creating production orchestrator...');
    const orchestrator = await createProductionOrchestrator({
      redisUrl: process.env.REDIS_URL, // Optional Redis for caching
      logger: console
    });
    
    // Prepare analysis request
    // You can modify these values to test with different repositories/PRs
    const analysisRequest: any = {
      userId: 'test-user-123',
      teamId: 'test-team-456',
      generateReport: true,
      includeEducation: true,
      
      // Mock data for demonstration - in production this would come from DeepWiki
      prMetadata: {
        id: 'pr-123',
        number: 27000,
        title: 'Add new search functionality',
        description: 'This PR adds a new search feature to find users by name',
        author: 'johndoe',
        created_at: new Date().toISOString(),
        repository_url: 'https://github.com/facebook/react',
        files_changed: 15,
        lines_added: 450,
        lines_removed: 120
      },
      
      mainBranchAnalysis: {
        id: 'analysis-main-123',
        repository: 'https://github.com/facebook/react',
        branch: 'main',
        commit: 'abc123',
        timestamp: new Date().toISOString(),
        issues: [
          {
            id: 'repo-critical-1',
            severity: 'critical' as const,
            category: 'security' as const,
            message: 'Hardcoded API credentials found',
            location: { file: 'src/config/database.ts', line: 45 },
            age: '6 months',
            codeSnippet: `const dbConfig = {
  host: 'prod.database.com',
  user: 'admin',
  password: 'P@ssw0rd123' // CRITICAL: Hardcoded password
};`,
            suggestedFix: `const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};`
          },
          {
            id: 'repo-high-1',
            severity: 'high' as const,
            category: 'performance' as const,
            message: 'N+1 query pattern in user data fetching',
            location: { file: 'src/services/userService.ts', line: 120 },
            age: '3 months'
          },
          {
            id: 'repo-medium-1',
            severity: 'medium' as const,
            category: 'code-quality' as const,
            message: 'Complex function with cyclomatic complexity of 15',
            location: { file: 'src/utils/dataProcessor.ts', line: 200 },
            age: '2 months'
          }
        ],
        metrics: {
          testCoverage: 82,
          buildTime: 120,
          bundleSize: 2.5
        }
      },
      
      featureBranchAnalysis: {
        id: 'analysis-feature-456',
        repository: 'https://github.com/facebook/react',
        branch: 'pr/27000',
        commit: 'def456',
        timestamp: new Date().toISOString(),
        issues: [
          // All issues from main branch (unfixed)
          {
            id: 'repo-critical-1',
            severity: 'critical' as const,
            category: 'security' as const,
            message: 'Hardcoded API credentials found',
            location: { file: 'src/config/database.ts', line: 45 },
            age: '6 months'
          },
          {
            id: 'repo-high-1',
            severity: 'high' as const,
            category: 'performance' as const,
            message: 'N+1 query pattern in user data fetching',
            location: { file: 'src/services/userService.ts', line: 120 },
            age: '3 months'
          },
          {
            id: 'repo-medium-1',
            severity: 'medium' as const,
            category: 'code-quality' as const,
            message: 'Complex function with cyclomatic complexity of 15',
            location: { file: 'src/utils/dataProcessor.ts', line: 200 },
            age: '2 months'
          },
          // New issues introduced in PR
          {
            id: 'pr-critical-1',
            severity: 'critical' as const,
            category: 'security' as const,
            message: 'SQL injection vulnerability in new search feature',
            location: { file: 'src/api/search.ts', line: 35 },
            codeSnippet: `const query = \`SELECT * FROM users WHERE name LIKE '%\${searchTerm}%'\`;`,
            suggestedFix: `const query = 'SELECT * FROM users WHERE name LIKE ?';
const params = [\`%\${searchTerm}%\`];`
          },
          {
            id: 'pr-high-1',
            severity: 'high' as const,
            category: 'security' as const,
            message: 'Missing authentication on new admin endpoint',
            location: { file: 'src/api/admin.ts', line: 15 },
            codeSnippet: `router.get('/admin/users', async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});`,
            suggestedFix: `router.get('/admin/users', authenticate, authorize('admin'), async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});`
          }
        ],
        metrics: {
          testCoverage: 71, // Decreased from 82%
          buildTime: 145,
          bundleSize: 2.8
        }
      },
      
      filesChanged: 15,
      linesChanged: 500
    };
    
    console.log('\n🔍 Analyzing pull request...');
    console.log(`   Repository: ${analysisRequest.prMetadata.repository_url}`);
    console.log(`   PR Number: #${analysisRequest.prMetadata.number}`);
    console.log(`   Author: ${analysisRequest.prMetadata.author}`);
    console.log(`   Files Changed: ${analysisRequest.filesChanged}`);
    
    // Perform analysis
    const startTime = Date.now();
    const result = await orchestrator.executeComparison(analysisRequest);
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`\n✅ Analysis completed in ${duration.toFixed(2)}s`);
    
    // Display results
    if (result.report) {
      console.log('\n📄 Generated Report Preview:');
      console.log('═'.repeat(80));
      
      // Show first 50 lines of the report
      const reportLines = result.report.split('\n');
      console.log(reportLines.slice(0, 50).join('\n'));
      
      if (reportLines.length > 50) {
        console.log('\n... (Report continues for ' + (reportLines.length - 50) + ' more lines)');
      }
      
      console.log('═'.repeat(80));
      
      // Save full report to file
      const reportPath = './generated-report.md';
      fs.writeFileSync(reportPath, result.report);
      console.log(`\n💾 Full report saved to: ${reportPath}`);
      
      // Display summary statistics
      console.log('\n📊 Report Statistics:');
      console.log(`   • Total lines: ${reportLines.length}`);
      console.log(`   • Report size: ${(result.report.length / 1024).toFixed(2)} KB`);
      console.log(`   • Decision: ${result.analysis?.decision || 'N/A'}`);
      console.log(`   • Overall Score: ${result.analysis?.overallScore || 'N/A'}/100`);
      console.log(`   • New Issues: ${result.analysis?.comparison?.newIssues?.length || 0}`);
      console.log(`   • Fixed Issues: ${result.analysis?.comparison?.fixedIssues?.length || 0}`);
      console.log(`   • Unfixed Issues: ${result.analysis?.comparison?.unchangedIssues?.length || 0}`);
      
      // Display skill tracking info
      if (result.skillTracking) {
        console.log('\n👤 Developer Skill Tracking:');
        console.log(`   • Updates processed: ${result.skillTracking.updates?.length || 0}`);
        console.log(`   • Team skills available: ${result.skillTracking.teamSkills ? 'Yes' : 'No'}`);
      }
      
    } else {
      console.log('\n❌ No report generated');
    }
    
  } catch (error) {
    console.error('\n❌ Error generating report:', error);
    process.exit(1);
  }
}

// Run the test
console.log('═'.repeat(80));
console.log('   CodeQual Standard Framework - Real Data Report Generation');
console.log('═'.repeat(80));

generateRealDataReport()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });