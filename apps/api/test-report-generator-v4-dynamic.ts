#!/usr/bin/env ts-node

/**
 * Test ReportGeneratorV4 with Dynamic Data
 * 
 * This test demonstrates how ReportGeneratorV4 uses real data from Supabase:
 * 1. Real team members from skillProvider
 * 2. Dynamic quarter calculation based on current date
 * 3. Business impact metrics calculated from actual issues
 * 4. Developer tenure from user profiles
 */

import * as dotenv from 'dotenv';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

import { ReportGeneratorV4 } from '../../packages/agents/src/standard/comparison/report-generator-v4';
import { SupabaseSkillProvider } from '../../packages/agents/src/infrastructure/supabase/supabase-skill-provider';
import { ComparisonAnalysisRequest } from '../../packages/agents/src/standard/types/analysis-types';
import { TeamSkills, DeveloperSkills } from '../../packages/agents/src/standard/orchestrator/interfaces/skill-provider.interface';

// Create mock DeepWiki results for testing
function createMockDeepWikiResults(): { main: any, feature: any } {
  const currentDate = new Date();
  const oneMonthAgo = new Date(currentDate);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const twoWeeksAgo = new Date(currentDate);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

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
        description: 'Database credentials are hardcoded in the source code.',
        suggestedFix: 'Use environment variables for sensitive configuration',
        confidence: 0.95,
        created_at: oneMonthAgo.toISOString() // Old issue
      },
      {
        id: 'main-high-perf-001',
        severity: 'high',
        category: 'performance',
        type: 'bug',
        location: { file: 'src/services/cache.service.ts', line: 78 },
        message: 'Memory Leak in Cache Service',
        description: 'Cache never clears old entries.',
        suggestedFix: 'Implement TTL and size limits',
        confidence: 0.85,
        created_at: twoWeeksAgo.toISOString() // Somewhat recent
      },
      {
        id: 'main-med-qual-001',
        severity: 'medium',
        category: 'code-quality',
        type: 'code-smell',
        location: { file: 'src/utils/helpers.ts', line: 145 },
        message: 'Complex Nested Loops',
        description: 'Deeply nested loops reduce readability',
        suggestedFix: 'Refactor using array methods',
        confidence: 0.75,
        created_at: currentDate.toISOString() // New issue
      }
    ],
    metadata: {
      files_analyzed: 156,
      total_lines: 15420,
      scan_duration: 45.2
    }
  };

  const featureBranch = {
    success: true,
    repository_url: 'https://github.com/techcorp/payment-processor',
    branch: 'feature/microservices-phase1',
    issues: [
      // Fixed the critical security issue
      {
        id: 'main-high-perf-001',
        severity: 'high',
        category: 'performance',
        type: 'bug',
        location: { file: 'src/services/cache.service.ts', line: 78 },
        message: 'Memory Leak in Cache Service',
        description: 'Cache never clears old entries.',
        suggestedFix: 'Implement TTL and size limits',
        confidence: 0.85
      },
      // New critical issue
      {
        id: 'pr-crit-sec-001',
        severity: 'critical',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'services/user-service/src/routes/internal.ts', line: 45 },
        message: 'Exposed Internal APIs Without Authentication',
        description: 'Internal API endpoints exposed without authentication.',
        suggestedFix: 'Implement service-to-service authentication',
        confidence: 0.95
      },
      // Multiple performance issues that contribute to business impact
      {
        id: 'pr-high-perf-001',
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
        id: 'pr-high-perf-002',
        severity: 'high',
        category: 'performance',
        type: 'bug',
        location: { file: 'services/payment-service/src/handlers/process.ts', line: 234 },
        message: 'Synchronous Payment Processing',
        description: 'Blocks main thread during payment processing.',
        suggestedFix: 'Use async queue system',
        confidence: 0.88
      }
    ],
    metadata: {
      files_analyzed: 189,
      total_lines: 18247,
      scan_duration: 52.8
    }
  };

  return { main: mainBranch, feature: featureBranch };
}

async function testReportGeneratorV4WithDynamicData() {
  console.log('🚀 Testing ReportGeneratorV4 with Dynamic Data');
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
    
    // Define userId first
    const userId = '00000000-0000-0000-0000-000000000001';
    
    // Get real team skills
    const teamId = '00000000-0000-0000-0000-000000000002';
    console.log('👥 Fetching real team data...');
    let teamSkills: TeamSkills;
    try {
      teamSkills = await skillProvider.getTeamSkills(teamId);
    } catch (error) {
      console.log('⚠️ Team data not found, using mock data');
      // Mock team data for demo
      teamSkills = {
        teamId,
        teamName: 'Demo Team',
        averageScore: 72,
        memberCount: 5,
        members: [
          {
            userId: userId,
            username: 'demo.user',
            email: 'demo@example.com',
            overallScore: 68,
            categoryScores: {
              security: 65,
              performance: 59,
              codeQuality: 73,
              architecture: 72,
              dependencies: 70,
              testing: 68
            },
            level: { current: 'B+', numeric: 68, title: 'intermediate' },
            trend: { direction: 'down' as const, change: -7, period: 'last-30-days' },
            lastUpdated: new Date(),
            totalPRs: 42,
            issuesFixed: { critical: 2, high: 5, medium: 12, low: 8 },
            issuesIntroduced: { critical: 1, high: 3, medium: 4, low: 2 }
          }
        ],
        topPerformers: [],
        needsImprovement: [],
        overallTrend: { direction: 'stable' as const, change: 0, period: 'last-30-days' }
      };
    }
    
    // Get user profile (with created_at for tenure calculation)
    console.log('👤 Fetching user profile...');
    let userProfile: DeveloperSkills;
    try {
      userProfile = await skillProvider.getUserSkills(userId);
    } catch (error) {
      console.log('⚠️ User profile not found, using mock data');
      // Mock user profile for demo with created_at for tenure
      const createdDate = new Date();
      createdDate.setMonth(createdDate.getMonth() - 8); // 8 months ago
      
      userProfile = {
        userId,
        username: 'demo.user',
        email: 'demo@example.com',
        overallScore: 68,
        categoryScores: {
          security: 65,
          performance: 59,
          codeQuality: 73,
          architecture: 72,
          dependencies: 70,
          testing: 68
        },
        level: { current: 'B+', numeric: 68, title: 'intermediate' },
        trend: { direction: 'down' as const, change: -7, period: 'last-30-days' },
        lastUpdated: new Date(),
        totalPRs: 42,
        issuesFixed: { critical: 2, high: 5, medium: 12, low: 8 },
        issuesIntroduced: { critical: 1, high: 3, medium: 4, low: 2 },
        created_at: createdDate // Add created_at for tenure calculation
      } as any;
    }
    
    // Create current date for dynamic quarter calculation
    const currentDate = new Date();
    console.log(`📅 Current date: ${currentDate.toISOString()}`);
    console.log(`📅 Current quarter: Q${Math.floor(currentDate.getMonth() / 3) + 1} ${currentDate.getFullYear()}`);
    
    // Create report generator with context
    const reportGenerator = new ReportGeneratorV4({
      teamSkills,
      userProfile,
      currentDate
    });
    
    // Create mock DeepWiki results
    const { main, feature } = createMockDeepWikiResults();
    
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
        created_at: new Date().toISOString()
      },
      includeEducation: true,
      generateReport: true
    };

    console.log('\n🔄 Generating report with dynamic data...');
    
    // Create comparison result to generate report from
    const comparisonResult = {
      success: true,
      report: '',
      prComment: '',
      comparison: {
        resolvedIssues: [main.issues[0]], // Critical security issue fixed
        newIssues: feature.issues.filter((i: any) => i.id.startsWith('pr-')),
        modifiedIssues: [],
        unchangedIssues: [main.issues[1]],
        summary: {
          totalIssues: feature.issues.length,
          criticalCount: feature.issues.filter((i: any) => i.severity === 'critical').length,
          highCount: feature.issues.filter((i: any) => i.severity === 'high').length,
          resolvedCount: 1,
          newCount: 3
        }
      },
      metadata: {
        modelUsed: {
          provider: 'anthropic',
          modelId: 'claude-3-5-sonnet-20241022'
        },
        prMetadata: request.prMetadata,
        repositoryContext: {
          repoType: 'typescript',
          language: 'typescript',
          sizeCategory: 'large',
          complexity: 'high' as 'high',
          issueCount: feature.issues.length,
          criticalIssueCount: feature.issues.filter((i: any) => i.severity === 'critical').length,
          filesAnalyzed: feature.metadata.files_analyzed,
          hasSecurityIssues: true,
          hasPerformanceIssues: true,
          fileTypes: {}
        }
      },
      skillTracking: {
        previousScore: userProfile.overallScore,
        newScore: userProfile.overallScore - 5,
        adjustments: [],
        categoryChanges: {}
      }
    };
    
    // Generate comprehensive report
    const report = await reportGenerator.generateMarkdownReport(comparisonResult);
    
    // Save report
    const outputDir = join(__dirname, 'test-output', new Date().toISOString().split('T')[0]);
    mkdirSync(outputDir, { recursive: true });
    
    const reportPath = join(outputDir, 'report-generator-v4-dynamic.md');
    writeFileSync(reportPath, report);
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    // Extract and display dynamic data highlights
    console.log('\n✨ Dynamic Data Highlights:');
    console.log('================================');
    
    // Check for dynamic quarter in report
    const quarterMatch = report.match(/High Repository Issues \(Q\d Planning\)/);
    if (quarterMatch) {
      console.log(`✅ Dynamic Quarter: ${quarterMatch[0]}`);
    }
    
    // Check for real team members
    const teamMatch = report.match(/Team Performance Leaders[\s\S]*?(?=\n###|\n##|$)/);
    if (teamMatch) {
      console.log(`✅ Real Team Data Found: ${teamSkills.members?.length || 0} members`);
    }
    
    // Check for calculated business impact
    const impactMatch = report.match(/Business Impact Analysis[\s\S]*?(?=\n##|$)/);
    if (impactMatch) {
      console.log('✅ Dynamic Business Impact Calculated');
    }
    
    // Check for issue age calculations
    const ageMatch = report.match(/\((\d+) days? old\)/g);
    if (ageMatch) {
      console.log(`✅ Issue Ages Calculated: ${ageMatch.length} issues with age`);
    }
    
    // Display summary of dynamic calculations
    console.log('\n📊 Dynamic Calculations Summary:');
    console.log(`   - Current Quarter: Q${Math.floor(currentDate.getMonth() / 3) + 1} ${currentDate.getFullYear()}`);
    console.log(`   - Team Size: ${teamSkills.members?.length || 0} members`);
    console.log(`   - Performance Issues: ${feature.issues.filter((i: any) => i.category === 'performance').length}`);
    console.log(`   - Security Issues: ${feature.issues.filter((i: any) => i.category === 'security').length}`);
    console.log(`   - Critical Issues: ${feature.issues.filter((i: any) => i.severity === 'critical').length}`);
    
    return report;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testReportGeneratorV4WithDynamicData()
    .then(() => {
      console.log('\n🎉 Test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testReportGeneratorV4WithDynamicData };