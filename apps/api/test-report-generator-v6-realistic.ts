#!/usr/bin/env ts-node

/**
 * Test ReportGeneratorV6 - Realistic Scenario
 * 
 * This test uses more realistic data:
 * 1. Proper GitHub username extraction (not hardcoded)
 * 2. Realistic number of pre-existing repository issues
 * 3. Real-world issue distribution
 */

import * as dotenv from 'dotenv';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

import { ReportGeneratorV6 } from '../../packages/agents/src/standard/comparison/report-generator-v6';
import { SupabaseSkillProvider } from '../../packages/agents/src/infrastructure/supabase/supabase-skill-provider';
import { ComparisonAnalysisRequest } from '../../packages/agents/src/standard/types/analysis-types';
import { TeamSkills, DeveloperSkills } from '../../packages/agents/src/standard/orchestrator/interfaces/skill-provider.interface';

// Create realistic DeepWiki results with many pre-existing issues
function createRealisticDeepWikiResults(): { main: any, feature: any } {
  const currentDate = new Date();
  
  // Create realistic timeframes for issues
  const sixMonthsAgo = new Date(currentDate);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const threeMonthsAgo = new Date(currentDate);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const oneMonthAgo = new Date(currentDate);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  const twoWeeksAgo = new Date(currentDate);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  // Main branch with realistic number of issues
  const mainBranch = {
    success: true,
    repository_url: 'https://github.com/techcorp/payment-processor',
    branch: 'main',
    issues: [
      // Critical issues (3)
      {
        id: 'main-crit-sec-001',
        severity: 'critical',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'src/config/database.ts', line: 12 },
        message: 'Hardcoded Database Credentials',
        description: 'Database credentials are hardcoded in the source code.',
        suggestedFix: 'Use environment variables for sensitive configuration',
        confidence: 0.95,
        created_at: sixMonthsAgo.toISOString(),
        codeSnippet: `export const dbConfig = {
  host: 'prod-db.example.com',
  username: 'admin',
  password: 'SuperSecret123!', // NEVER DO THIS!
  database: 'payment_processor'
};`
      },
      {
        id: 'main-crit-sec-002',
        severity: 'critical',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'src/auth/jwt.ts', line: 45 },
        message: 'Weak JWT Secret',
        description: 'JWT secret is too short and predictable',
        suggestedFix: 'Use cryptographically secure random secret',
        confidence: 0.92,
        created_at: threeMonthsAgo.toISOString()
      },
      {
        id: 'main-crit-sec-003',
        severity: 'critical',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'src/api/admin.ts', line: 78 },
        message: 'SQL Injection Vulnerability',
        description: 'User input directly concatenated in SQL query',
        suggestedFix: 'Use parameterized queries',
        confidence: 0.98,
        created_at: oneMonthAgo.toISOString()
      },
      
      // High issues (8)
      {
        id: 'main-high-perf-001',
        severity: 'high',
        category: 'performance',
        type: 'bug',
        location: { file: 'src/services/cache.service.ts', line: 78 },
        message: 'Memory Leak in Cache Service',
        description: 'Cache never clears old entries causing memory exhaustion.',
        suggestedFix: 'Implement TTL and size limits for cache entries',
        confidence: 0.85,
        created_at: twoWeeksAgo.toISOString()
      },
      {
        id: 'main-high-perf-002',
        severity: 'high',
        category: 'performance',
        type: 'bug',
        location: { file: 'src/db/queries.ts', line: 156 },
        message: 'Unindexed Database Query',
        description: 'Query on large table without proper indexes',
        suggestedFix: 'Add composite index on (user_id, created_at)',
        confidence: 0.88,
        created_at: oneMonthAgo.toISOString()
      },
      {
        id: 'main-high-sec-004',
        severity: 'high',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'src/upload/handler.ts', line: 234 },
        message: 'Path Traversal in File Upload',
        description: 'File paths not properly sanitized',
        suggestedFix: 'Validate and sanitize file paths',
        confidence: 0.87,
        created_at: threeMonthsAgo.toISOString()
      },
      {
        id: 'main-high-deps-001',
        severity: 'high',
        category: 'dependencies',
        type: 'vulnerability',
        package: 'express',
        message: 'Outdated Express version 4.16.0',
        description: 'Multiple security vulnerabilities in old version',
        suggestedFix: 'Update to express 4.18.2 or later',
        confidence: 0.99,
        created_at: sixMonthsAgo.toISOString()
      },
      {
        id: 'main-high-arch-001',
        severity: 'high',
        category: 'architecture',
        type: 'design-flaw',
        location: { file: 'src/services/payment.ts', line: 45 },
        message: 'Synchronous Payment Processing',
        description: 'Payment processing blocks request thread',
        suggestedFix: 'Implement async queue-based processing',
        confidence: 0.82,
        created_at: twoWeeksAgo.toISOString()
      },
      
      // Medium issues (15) - just showing a few
      {
        id: 'main-med-qual-001',
        severity: 'medium',
        category: 'code-quality',
        type: 'code-smell',
        location: { file: 'src/utils/helpers.ts', line: 145 },
        message: 'Complex Nested Loops',
        description: 'Triple nested loops reduce readability',
        suggestedFix: 'Refactor using array methods',
        confidence: 0.75,
        created_at: currentDate.toISOString()
      },
      {
        id: 'main-med-test-001',
        severity: 'medium',
        category: 'testing',
        type: 'coverage',
        location: { file: 'src/services/user.service.ts', line: 0 },
        message: 'Low Test Coverage',
        description: 'Only 45% code coverage',
        suggestedFix: 'Add unit tests for uncovered branches',
        confidence: 0.90,
        created_at: oneMonthAgo.toISOString()
      },
      
      // Low issues (20+) - just showing a couple
      {
        id: 'main-low-style-001',
        severity: 'low',
        category: 'code-quality',
        type: 'style',
        location: { file: 'src/models/user.ts', line: 23 },
        message: 'Inconsistent naming convention',
        description: 'Mix of camelCase and snake_case',
        suggestedFix: 'Use consistent camelCase',
        confidence: 0.70,
        created_at: currentDate.toISOString()
      }
    ],
    metadata: {
      files_analyzed: 156,
      total_lines: 15420,
      scan_duration: 45.2,
      total_issues: 46, // Realistic total
      issue_summary: {
        critical: 3,
        high: 8,
        medium: 15,
        low: 20
      }
    }
  };

  // Feature branch - fixed some issues, introduced new ones
  const featureBranch = {
    success: true,
    repository_url: 'https://github.com/techcorp/payment-processor',
    branch: 'feature/microservices-phase1',
    issues: [
      // Fixed 2 critical issues, but 1 remains
      {
        id: 'main-crit-sec-003',
        severity: 'critical',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'src/api/admin.ts', line: 78 },
        message: 'SQL Injection Vulnerability',
        description: 'User input directly concatenated in SQL query',
        suggestedFix: 'Use parameterized queries',
        confidence: 0.98,
        codeSnippet: `// Still vulnerable!
const query = "SELECT * FROM users WHERE id = " + req.params.id;`
      },
      
      // Most high issues remain (6 out of 8)
      {
        id: 'main-high-perf-001',
        severity: 'high',
        category: 'performance',
        type: 'bug',
        location: { file: 'src/services/cache.service.ts', line: 78 },
        message: 'Memory Leak in Cache Service',
        description: 'Cache never clears old entries causing memory exhaustion.',
        suggestedFix: 'Implement TTL and size limits for cache entries',
        confidence: 0.85
      },
      {
        id: 'main-high-perf-002',
        severity: 'high',
        category: 'performance',
        type: 'bug',
        location: { file: 'src/db/queries.ts', line: 156 },
        message: 'Unindexed Database Query',
        description: 'Query on large table without proper indexes',
        suggestedFix: 'Add composite index on (user_id, created_at)',
        confidence: 0.88
      },
      {
        id: 'main-high-sec-004',
        severity: 'high',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'src/upload/handler.ts', line: 234 },
        message: 'Path Traversal in File Upload',
        description: 'File paths not properly sanitized',
        suggestedFix: 'Validate and sanitize file paths',
        confidence: 0.87
      },
      {
        id: 'main-high-deps-001',
        severity: 'high',
        category: 'dependencies',
        type: 'vulnerability',
        package: 'express',
        message: 'Outdated Express version 4.16.0',
        description: 'Multiple security vulnerabilities in old version',
        suggestedFix: 'Update to express 4.18.2 or later',
        confidence: 0.99
      },
      
      // NEW issues introduced in PR
      {
        id: 'pr-crit-sec-001',
        severity: 'critical',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'services/user-service/src/routes/internal.ts', line: 45 },
        message: 'Exposed Internal APIs Without Authentication',
        description: 'Internal API endpoints exposed without authentication.',
        suggestedFix: 'Implement service-to-service authentication',
        confidence: 0.95,
        codeSnippet: `router.get('/internal/users/:id/full', async (req, res) => {
  const user = await userRepository.getFullUserData(req.params.id);
  res.json(user); // CRITICAL: No authentication!
});`
      },
      {
        id: 'pr-high-perf-003',
        severity: 'high',
        category: 'performance',
        type: 'bug',
        location: { file: 'services/user-service/src/services/team.service.ts', line: 89 },
        message: 'N+1 Query Pattern',
        description: 'Nested loops performing database queries.',
        suggestedFix: 'Use aggregation pipeline',
        confidence: 0.92
      },
      {
        id: 'pr-high-deps-002',
        severity: 'high',
        category: 'dependencies',
        type: 'vulnerability',
        package: 'lodash',
        message: 'Vulnerable lodash version 4.17.15',
        description: 'Known prototype pollution vulnerability (CVE-2021-23337)',
        suggestedFix: 'Update to lodash 4.17.21 or later',
        confidence: 0.99
      },
      
      // Most medium and low issues still exist (not listing all)
    ],
    metadata: {
      files_analyzed: 189,
      total_lines: 18247,
      scan_duration: 52.8,
      total_issues: 42, // Some fixed, some new
      issue_summary: {
        critical: 2, // 3 -> 1 unfixed + 1 new = 2
        high: 8,    // 8 -> 6 unfixed + 2 new = 8
        medium: 14, // Some fixed
        low: 18     // Some fixed
      }
    }
  };

  return { main: mainBranch, feature: featureBranch };
}

// Extract GitHub username from PR URL or commit info
function extractGitHubUsername(prMetadata: any, userProfile: any): string {
  // In a real implementation, this would:
  // 1. Call GitHub API to get PR author info
  // 2. Or query database for user's GitHub username
  // 3. Or extract from git commit author email
  
  // For this test, simulate extraction from email
  if (userProfile?.email) {
    // Extract username from corporate email (e.g., john.doe@company.com -> jdoe)
    const emailParts = userProfile.email.split('@')[0].split('.');
    if (emailParts.length >= 2) {
      return emailParts[0][0] + emailParts[1]; // First initial + last name
    }
    return emailParts[0];
  }
  
  // Fallback to extracting from repository URL (not ideal)
  if (prMetadata.repository_url) {
    const match = prMetadata.repository_url.match(/github\.com\/([^\/]+)\//);
    if (match && match[1] !== 'techcorp') {
      return match[1];
    }
  }
  
  return 'developer'; // Generic fallback
}

async function testReportGeneratorV6Realistic() {
  console.log('🚀 Testing ReportGeneratorV6 - Realistic Scenario');
  console.log('================================================================\n');

  try {
    // Initialize Supabase provider
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    console.log('📦 Initializing Supabase skill provider...');
    const skillProvider = new SupabaseSkillProvider(supabaseUrl, supabaseKey);
    
    // Use real user IDs
    const userId = '3c1f1438-f5bd-41d2-a9ef-bf4268b77ff7';
    const teamId = 'e3a79551-1c68-48cf-8d45-d6fd5b33c11e';
    
    // Get user profile
    console.log('👤 Fetching user profile...');
    let userProfile: DeveloperSkills;
    try {
      userProfile = await skillProvider.getUserSkills(userId);
      console.log('✅ Using real user profile');
    } catch (error) {
      console.log('⚠️ Creating realistic user profile');
      
      const createdDate = new Date();
      createdDate.setMonth(createdDate.getMonth() - 8); // 8 months tenure
      
      userProfile = {
        userId,
        username: 'jdoe', // Will be replaced by extraction
        email: 'jane.doe@techcorp.com',
        overallScore: 72,
        categoryScores: {
          security: 75,
          performance: 70,
          codeQuality: 78,
          architecture: 73,
          dependencies: 68,
          testing: 72
        },
        level: { current: 'B', numeric: 72, title: 'Mid-Level Developer' },
        trend: { direction: 'up' as const, change: 2, period: 'last-30-days' },
        lastUpdated: new Date(),
        totalPRs: 89,
        issuesFixed: { critical: 5, high: 12, medium: 28, low: 45 },
        issuesIntroduced: { critical: 1, high: 4, medium: 8, low: 15 },
        created_at: createdDate
      } as any;
    }
    
    // Extract GitHub username properly
    const githubUsername = extractGitHubUsername({}, userProfile);
    console.log(`📝 Extracted GitHub username: @${githubUsername}`);
    
    // Current date for dynamic calculations
    const currentDate = new Date();
    const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;
    
    // Create report generator
    const reportGenerator = new ReportGeneratorV6({
      teamSkills: undefined, // Will use individual analysis only
      userProfile,
      currentDate,
      githubUsername // Dynamically extracted
    });
    
    // Create realistic DeepWiki results
    const { main, feature } = createRealisticDeepWikiResults();
    
    console.log('\n📊 Realistic Issue Distribution:');
    console.log(`   Main branch: ${main.metadata.total_issues} issues`);
    console.log(`   - Critical: ${main.metadata.issue_summary.critical}`);
    console.log(`   - High: ${main.metadata.issue_summary.high}`);
    console.log(`   - Medium: ${main.metadata.issue_summary.medium}`);
    console.log(`   - Low: ${main.metadata.issue_summary.low}`);
    
    // Calculate comparison
    const resolvedIssues = main.issues.filter((mainIssue: any) => 
      !feature.issues.some((featureIssue: any) => featureIssue.id === mainIssue.id)
    );
    const newIssues = feature.issues.filter((issue: any) => issue.id.startsWith('pr-'));
    const unchangedIssues = feature.issues.filter((issue: any) => 
      issue.id.startsWith('main-') && 
      main.issues.some((mainIssue: any) => mainIssue.id === issue.id)
    );
    
    console.log(`\n🔄 PR Impact:`);
    console.log(`   - Fixed: ${resolvedIssues.length} issues`);
    console.log(`   - New: ${newIssues.length} issues`);
    console.log(`   - Unfixed: ${unchangedIssues.length} issues`);
    
    // Create comparison request
    const request: ComparisonAnalysisRequest = {
      mainBranchAnalysis: main,
      featureBranchAnalysis: feature,
      userId,
      teamId,
      language: 'typescript',
      sizeCategory: 'large',
      prMetadata: {
        number: 3842,
        title: 'Major refactor: Microservices migration Phase 1',
        author: userId,
        repository_url: 'https://github.com/techcorp/payment-processor',
        linesAdded: 1923,
        linesRemoved: 924,
        filesChanged: 189,
        created_at: new Date().toISOString()
      } as any,
      includeEducation: true,
      generateReport: true
    };

    // Create comparison result
    const comparisonResult = {
      success: true,
      report: '',
      prComment: '',
      comparison: {
        resolvedIssues,
        newIssues,
        modifiedIssues: [],
        unchangedIssues,
        summary: {
          totalIssues: feature.issues.length,
          criticalCount: feature.metadata.issue_summary.critical,
          highCount: feature.metadata.issue_summary.high,
          mediumCount: feature.metadata.issue_summary.medium,
          lowCount: feature.metadata.issue_summary.low,
          resolvedCount: resolvedIssues.length,
          newCount: newIssues.length
        }
      },
      metadata: {
        modelUsed: {
          provider: 'anthropic',
          modelId: 'claude-3-5-sonnet-20241022'
        },
        prMetadata: {
          ...request.prMetadata,
          author_name: userProfile.username || 'Developer'
        },
        repositoryContext: {
          repoType: 'microservices',
          language: 'typescript',
          sizeCategory: 'large',
          complexity: 'high' as const,
          issueCount: feature.metadata.total_issues,
          criticalIssueCount: feature.metadata.issue_summary.critical,
          filesAnalyzed: feature.metadata.files_analyzed,
          hasSecurityIssues: true,
          hasPerformanceIssues: true,
          fileTypes: {}
        }
      },
      skillTracking: {
        previousScore: userProfile.overallScore,
        newScore: 65, // Will drop due to many unfixed issues
        adjustments: [
          { reason: 'Base PR adjustment', points: 4, category: 'base' },
          { reason: 'Fixed critical security vulnerabilities', points: 20, category: 'security', count: 2, pointsPerItem: 10 },
          { reason: 'Fixed high issues', points: 10, category: 'mixed', count: 2, pointsPerItem: 5 },
          { reason: 'New critical security issues', points: -10, category: 'security', count: 1, pointsPerItem: -10 },
          { reason: 'New high issues', points: -10, category: 'mixed', count: 2, pointsPerItem: -5 },
          { reason: 'Unfixed critical repository issues', points: -5, category: 'repository', count: 1, pointsPerItem: -5 },
          { reason: 'Unfixed high repository issues', points: -18, category: 'repository', count: 6, pointsPerItem: -3 }
        ],
        categoryChanges: {
          security: { previousScore: 75, newScore: 68 },
          performance: { previousScore: 70, newScore: 58 },
          codequality: { previousScore: 78, newScore: 74 },
          architecture: { previousScore: 73, newScore: 76 },
          dependencies: { previousScore: 68, newScore: 62 },
          testing: { previousScore: 72, newScore: 70 }
        }
      }
    };
    
    // Generate report
    console.log('\n🔄 Generating realistic report...');
    const report = await reportGenerator.generateMarkdownReport(comparisonResult);
    
    // Save report
    const outputDir = join(__dirname, 'test-output', new Date().toISOString().split('T')[0]);
    mkdirSync(outputDir, { recursive: true });
    
    const reportPath = join(outputDir, 'report-generator-v6-realistic.md');
    writeFileSync(reportPath, report);
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    // Key insights
    console.log('\n🔍 Key Insights from Realistic Test:');
    console.log(`   - GitHub username: @${githubUsername} (extracted, not hardcoded)`);
    console.log(`   - Pre-existing issues: ${unchangedIssues.length} (realistic number)`);
    console.log(`   - Skill impact: -${18 + 5} points from unfixed repository issues`);
    console.log(`   - Current quarter planning: Q${currentQuarter}`);
    
    return report;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testReportGeneratorV6Realistic()
    .then(() => {
      console.log('\n🎉 Realistic test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testReportGeneratorV6Realistic };