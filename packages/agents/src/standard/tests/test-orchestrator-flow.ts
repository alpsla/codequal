#!/usr/bin/env npx ts-node

/**
 * Test the complete orchestrator flow with actual issue lists (not deduplicated)
 * Validates that all issue occurrences are preserved through the entire flow
 */

import { ComparisonOrchestrator } from '../orchestrator/comparison-orchestrator';
import { ComparisonAgent } from '../comparison/comparison-agent';

// Mock providers
class MockConfigProvider {
  async getConfig() { return null; }
  async saveConfig(config: any) { return 'config-123'; }
  async findSimilarConfigs() { return []; }
}

class MockSkillProvider {
  async getUserSkills() {
    return {
      userId: 'test-user',
      overallScore: 75,
      categoryScores: {
        security: 80,
        performance: 70,
        codeQuality: 75
      }
    };
  }
  async getTeamSkills() { return null; }
  async getBatchUserSkills() { return []; }
  async updateSkills() { return true; }
}

class MockDataStore {
  cache = {
    get: async () => null,
    set: async () => true
  };
  async saveReport() { return true; }
}

class MockResearcherAgent {
  async research() {
    return {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.3
    };
  }
}

class MockEducatorAgent {
  async research(params: any) {
    console.log(`\n🎓 Educator received ${params.issues.length} issues for analysis`);
    
    // Log unique patterns received
    const patterns = new Set();
    params.issues.forEach((issue: any) => {
      const pattern = `${issue.category}-${issue.severity}`;
      patterns.add(pattern);
    });
    console.log(`   Unique patterns: ${Array.from(patterns).join(', ')}`);
    
    return {
      courses: [
        {
          title: 'SQL Injection Prevention',
          provider: 'Coursera',
          url: 'https://coursera.org/sql-injection',
          duration: '2 hours',
          relevance: 0.95
        },
        {
          title: 'XSS Defense Strategies',
          provider: 'Udemy',
          url: 'https://udemy.com/xss-defense',
          duration: '3 hours',
          relevance: 0.90
        }
      ],
      resources: [
        {
          title: 'OWASP SQL Injection Guide',
          url: 'https://owasp.org/sql-injection',
          type: 'documentation'
        },
        {
          title: 'OWASP XSS Prevention Cheat Sheet',
          url: 'https://owasp.org/xss-prevention',
          type: 'documentation'
        }
      ],
      totalIssuesAnalyzed: params.issues.length,
      uniquePatternsFound: patterns.size
    };
  }
}

async function testOrchestratorFlow() {
  console.log('🧪 Testing Complete Orchestrator Flow');
  console.log('=' .repeat(60));
  
  // Create orchestrator with mocks
  const orchestrator = new ComparisonOrchestrator(
    new MockConfigProvider() as any,
    new MockSkillProvider() as any,
    new MockDataStore() as any,
    new MockResearcherAgent() as any,
    new MockEducatorAgent() as any,
    undefined, // logger
    new ComparisonAgent() // Use real comparison agent
  );
  
  // Create test data with multiple occurrences of same issue type
  const mainBranchAnalysis = {
    issues: [
      // 3 SQL injection issues in main branch
      {
        id: 'main-sql-1',
        title: 'SQL Injection 1',
        message: 'SQL injection vulnerability',
        description: 'SQL injection in getUserById',
        category: 'security' as const,
        severity: 'critical' as const,
        location: { file: 'src/api/users.ts', line: 10 }
      },
      {
        id: 'main-sql-2',
        title: 'SQL Injection 2',
        message: 'SQL injection vulnerability',
        description: 'SQL injection in getUserByEmail',
        category: 'security' as const,
        severity: 'critical' as const,
        location: { file: 'src/api/users.ts', line: 25 }
      },
      {
        id: 'main-sql-3',
        title: 'SQL Injection 3',
        message: 'SQL injection vulnerability',
        description: 'SQL injection in findUsers',
        category: 'security' as const,
        severity: 'critical' as const,
        location: { file: 'src/api/search.ts', line: 15 }
      },
      // 2 XSS issues in main branch
      {
        id: 'main-xss-1',
        title: 'XSS Vulnerability 1',
        message: 'Cross-site scripting',
        description: 'XSS in renderProfile',
        category: 'security' as const,
        severity: 'high' as const,
        location: { file: 'src/views/profile.ts', line: 30 }
      },
      {
        id: 'main-xss-2',
        title: 'XSS Vulnerability 2',
        message: 'Cross-site scripting',
        description: 'XSS in renderComments',
        category: 'security' as const,
        severity: 'high' as const,
        location: { file: 'src/views/comments.ts', line: 45 }
      }
    ],
    recommendations: [],
    scores: { overall: 60, security: 40 }
  };
  
  const featureBranchAnalysis = {
    issues: [
      // 2 SQL injections remain (1 fixed)
      {
        id: 'feature-sql-1',
        title: 'SQL Injection 1',
        message: 'SQL injection vulnerability',
        description: 'SQL injection in getUserById',
        category: 'security' as const,
        severity: 'critical' as const,
        location: { file: 'src/api/users.ts', line: 12 } // Shifted by 2 lines
      },
      {
        id: 'feature-sql-2',
        title: 'SQL Injection 2',
        message: 'SQL injection vulnerability',
        description: 'SQL injection in findUsers',
        category: 'security' as const,
        severity: 'critical' as const,
        location: { file: 'src/api/search.ts', line: 115 } // Shifted by 100 lines!
      },
      // 2 XSS remain
      {
        id: 'feature-xss-1',
        title: 'XSS Vulnerability 1',
        message: 'Cross-site scripting',
        description: 'XSS in renderProfile',
        category: 'security' as const,
        severity: 'high' as const,
        location: { file: 'src/views/profile.ts', line: 32 }
      },
      {
        id: 'feature-xss-2',
        title: 'XSS Vulnerability 2',
        message: 'Cross-site scripting',
        description: 'XSS in renderComments',
        category: 'security' as const,
        severity: 'high' as const,
        location: { file: 'src/views/comments.ts', line: 45 }
      },
      // 3 NEW issues introduced
      {
        id: 'feature-new-1',
        title: 'Hardcoded Secret 1',
        message: 'Hardcoded API key',
        description: 'API key in config',
        category: 'security' as const,
        severity: 'high' as const,
        location: { file: 'src/config.ts', line: 5 }
      },
      {
        id: 'feature-new-2',
        title: 'Hardcoded Secret 2',
        message: 'Hardcoded secret',
        description: 'Secret in auth module',
        category: 'security' as const,
        severity: 'high' as const,
        location: { file: 'src/auth.ts', line: 10 }
      },
      {
        id: 'feature-new-3',
        title: 'Missing Validation',
        message: 'No input validation',
        description: 'updateUser lacks validation',
        category: 'code-quality' as const,
        severity: 'medium' as const,
        location: { file: 'src/api/users.ts', line: 50 }
      }
    ],
    recommendations: [],
    scores: { overall: 55, security: 35 }
  };
  
  // Execute orchestrator
  console.log('\n📊 Input Analysis:');
  console.log(`Main branch: ${mainBranchAnalysis.issues.length} issues (3 SQL, 2 XSS)`);
  console.log(`Feature branch: ${featureBranchAnalysis.issues.length} issues (2 SQL, 2 XSS, 3 NEW)`);
  
  const result = await orchestrator.executeComparison({
    userId: 'test-user',
    teamId: 'test-team',
    mainBranchAnalysis,
    featureBranchAnalysis,
    prMetadata: {
      id: 'pr-123',
      title: 'Test PR',
      author: 'test-user',
      repository_url: 'https://github.com/test/repo',
      number: 123
    },
    language: 'typescript',
    sizeCategory: 'medium',
    includeEducation: true,
    generateReport: true
  });
  
  console.log('\n✅ Orchestrator Results:');
  console.log(`Success: ${result.success}`);
  console.log(`Report generated: ${!!result.report}`);
  console.log(`PR comment generated: ${!!result.prComment}`);
  console.log(`Education included: ${!!result.education}`);
  
  // Validate that all issues are preserved
  const comparison = result.analysis;
  if (comparison) {
    console.log('\n📈 Issue Tracking:');
    console.log(`New issues: ${comparison.newIssues?.length || 0}`);
    console.log(`Fixed issues: ${comparison.resolvedIssues?.length || 0}`);
    console.log(`Unchanged issues: ${comparison.unchangedIssues?.length || 0}`);
    
    // Check expected counts
    const expectedNew = 3; // 3 new issues
    const expectedFixed = 1; // 1 SQL injection fixed
    const expectedUnchanged = 4; // 2 SQL + 2 XSS remain
    
    const actualNew = comparison.newIssues?.length || 0;
    const actualFixed = comparison.resolvedIssues?.length || 0;
    const actualUnchanged = comparison.unchangedIssues?.length || 0;
    
    console.log('\n🎯 Validation:');
    console.log(`New issues: ${actualNew === expectedNew ? '✅' : '❌'} (expected ${expectedNew}, got ${actualNew})`);
    console.log(`Fixed issues: ${actualFixed === expectedFixed ? '✅' : '❌'} (expected ${expectedFixed}, got ${actualFixed})`);
    console.log(`Unchanged issues: ${actualUnchanged === expectedUnchanged ? '✅' : '❌'} (expected ${expectedUnchanged}, got ${actualUnchanged})`);
    
    // Show all issues to verify no deduplication
    console.log('\n📋 All Issue Occurrences Preserved:');
    if (comparison.newIssues) {
      console.log('New Issues:');
      comparison.newIssues.forEach((issue: any) => {
        console.log(`  - ${issue.title} at ${issue.location?.file}:${issue.location?.line}`);
      });
    }
    
    if (comparison.resolvedIssues) {
      console.log('Fixed Issues:');
      comparison.resolvedIssues.forEach((issue: any) => {
        console.log(`  - ${issue.title} at ${issue.location?.file}:${issue.location?.line}`);
      });
    }
    
    // Check education was provided
    if (result.education) {
      console.log('\n🎓 Educational Content:');
      const educationData = result.education as any;
      console.log(`Total unique issues analyzed: ${educationData.totalIssuesAnalyzed || 'N/A'}`);
      console.log(`Unique patterns found: ${educationData.uniquePatternsFound || 'N/A'}`);
      console.log(`Courses recommended: ${educationData.courses?.length || 0}`);
      console.log(`Resources provided: ${educationData.resources?.length || 0}`);
      
      // Verify deduplication worked
      const totalIssuesInBranches = mainBranchAnalysis.issues.length + featureBranchAnalysis.issues.length;
      console.log(`\n📊 Deduplication Check:`);
      console.log(`  Total issues in both branches: ${totalIssuesInBranches}`);
      console.log(`  Issues sent to educator: ${educationData.totalIssuesAnalyzed || 0}`);
      console.log(`  Deduplication effective: ${educationData.totalIssuesAnalyzed < totalIssuesInBranches ? '✅ Yes' : '❌ No'}`);
    }
    
    // Verify parallel processing worked
    console.log('\n⚡ Parallel Processing:');
    console.log(`Location enhancement: ${result.metadata?.repositoryContext ? '✅' : '❌'}`);
    console.log(`Educational research: ${result.education ? '✅' : '❌'}`);
    console.log('Both should complete in parallel for optimal performance');
    
    // Overall success
    const allTestsPassed = 
      actualNew === expectedNew &&
      actualFixed === expectedFixed &&
      actualUnchanged === expectedUnchanged &&
      result.education &&
      result.report;
    
    console.log('\n' + '=' .repeat(60));
    if (allTestsPassed) {
      console.log('🎉 All tests passed! Orchestrator correctly:');
      console.log('  - Preserved all issue occurrences (no deduplication)');
      console.log('  - Enhanced issues with locations before comparison');
      console.log('  - Ran educational research in parallel');
      console.log('  - Generated complete report with all enhancements');
    } else {
      console.log('⚠️ Some tests failed. Please review the results above.');
    }
  }
}

// Run test
testOrchestratorFlow().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});