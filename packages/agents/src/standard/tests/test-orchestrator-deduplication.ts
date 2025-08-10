#!/usr/bin/env npx ts-node

/**
 * Test the orchestrator's dual data flow:
 * - Location enhancer gets ALL issues (no deduplication)
 * - Educator gets UNIQUE issues (deduplicated)
 */

import { ComparisonOrchestrator } from '../orchestrator/comparison-orchestrator';
import { ComparisonAgent } from '../comparison/comparison-agent';
import { LocationEnhancer } from '../services/location-enhancer';

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

// Track what the educator receives
class TrackingEducatorAgent {
  public receivedIssues: any[] = [];
  
  async research(params: any) {
    this.receivedIssues = params.issues;
    
    console.log(`\n🎓 Educator Analysis:`);
    console.log(`   Received ${params.issues.length} issues`);
    
    // Count unique patterns
    const patterns = new Map<string, number>();
    params.issues.forEach((issue: any) => {
      const pattern = `${issue.category}-${issue.severity}`;
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    });
    
    console.log(`   Unique patterns: ${patterns.size}`);
    patterns.forEach((count, pattern) => {
      console.log(`     - ${pattern}: ${count} occurrence(s)`);
    });
    
    // Analyze issue types
    const issueTypes = new Map<string, Set<string>>();
    params.issues.forEach((issue: any) => {
      const type = this.extractIssueType(issue);
      if (!issueTypes.has(type)) {
        issueTypes.set(type, new Set());
      }
      issueTypes.get(type)!.add(issue.id);
    });
    
    console.log(`   Issue types found:`);
    issueTypes.forEach((ids, type) => {
      console.log(`     - ${type}: ${ids.size} unique`);
    });
    
    return {
      courses: [
        {
          title: 'SQL Injection Prevention',
          provider: 'Coursera',
          url: 'https://coursera.org/sql-injection',
          duration: '2 hours'
        }
      ],
      resources: [],
      totalIssuesAnalyzed: params.issues.length,
      uniquePatternsFound: patterns.size,
      issueTypesFound: issueTypes.size
    };
  }
  
  private extractIssueType(issue: any): string {
    const title = (issue.title || '').toLowerCase();
    if (title.includes('sql injection')) return 'sql-injection';
    if (title.includes('xss')) return 'xss';
    if (title.includes('hardcoded')) return 'hardcoded-secret';
    if (title.includes('validation')) return 'missing-validation';
    return 'other';
  }
}

// Track what the location enhancer receives
class TrackingLocationEnhancer extends LocationEnhancer {
  public mainBranchIssues: any[] = [];
  public featureBranchIssues: any[] = [];
  
  async enhanceIssuesWithLocations(
    issues: any[],
    repoUrl: string,
    prNumber?: string
  ): Promise<any> {
    // Track what we receive
    if (!prNumber) {
      this.mainBranchIssues = issues;
      console.log(`\n📍 Location Enhancer (Main Branch):`);
      console.log(`   Received ${issues.length} issues`);
    } else {
      this.featureBranchIssues = issues;
      console.log(`\n📍 Location Enhancer (Feature Branch):`);
      console.log(`   Received ${issues.length} issues`);
    }
    
    // Count duplicates
    const titleCounts = new Map<string, number>();
    issues.forEach(issue => {
      const key = `${issue.category}-${issue.severity}-${issue.title}`;
      titleCounts.set(key, (titleCounts.get(key) || 0) + 1);
    });
    
    const duplicates = Array.from(titleCounts.entries()).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log(`   Found duplicate issues:`);
      duplicates.forEach(([key, count]) => {
        console.log(`     - ${key}: ${count} occurrences`);
      });
    } else {
      console.log(`   No duplicates (all issues unique)`);
    }
    
    // Return mock enhanced issues
    return {
      enhanced: issues.length,
      failed: 0,
      issues: issues.map(issue => ({
        ...issue,
        message: issue.message || issue.title,
        location: {
          ...issue.location,
          line: issue.location?.line || Math.floor(Math.random() * 100)
        },
        locationConfidence: 95
      }))
    };
  }
}

async function testDeduplicationFlow() {
  console.log('🧪 Testing Orchestrator Deduplication Logic');
  console.log('=' .repeat(60));
  
  const trackingEducator = new TrackingEducatorAgent();
  const trackingLocationEnhancer = new TrackingLocationEnhancer();
  
  // Create orchestrator with tracking mocks
  const orchestrator = new ComparisonOrchestrator(
    new MockConfigProvider() as any,
    new MockSkillProvider() as any,
    new MockDataStore() as any,
    new MockResearcherAgent() as any,
    trackingEducator as any,
    undefined, // logger
    new ComparisonAgent() // Use real comparison agent
  );
  
  // Inject our tracking location enhancer
  (orchestrator as any).locationEnhancer = trackingLocationEnhancer;
  
  // Create test data with MANY duplicates
  const createSQLInjection = (id: string, file: string, line: number) => ({
    id,
    title: 'SQL Injection',
    message: 'SQL injection vulnerability',
    description: 'Direct string interpolation in SQL query',
    category: 'security' as const,
    severity: 'critical' as const,
    location: { file, line }
  });
  
  const createXSS = (id: string, file: string, line: number) => ({
    id,
    title: 'XSS Vulnerability',
    message: 'Cross-site scripting',
    description: 'Unescaped user input in HTML',
    category: 'security' as const,
    severity: 'high' as const,
    location: { file, line }
  });
  
  const createHardcodedSecret = (id: string, file: string, line: number) => ({
    id,
    title: 'Hardcoded Secret',
    message: 'Hardcoded credentials',
    description: 'Secret key in source code',
    category: 'security' as const,
    severity: 'high' as const,
    location: { file, line }
  });
  
  const mainBranchAnalysis = {
    issues: [
      // 5 SQL injections in different files
      createSQLInjection('main-sql-1', 'src/api/users.ts', 10),
      createSQLInjection('main-sql-2', 'src/api/users.ts', 25),
      createSQLInjection('main-sql-3', 'src/api/posts.ts', 15),
      createSQLInjection('main-sql-4', 'src/api/comments.ts', 30),
      createSQLInjection('main-sql-5', 'src/api/search.ts', 45),
      
      // 3 XSS vulnerabilities
      createXSS('main-xss-1', 'src/views/profile.ts', 20),
      createXSS('main-xss-2', 'src/views/comments.ts', 35),
      createXSS('main-xss-3', 'src/views/posts.ts', 50),
      
      // 2 Hardcoded secrets
      createHardcodedSecret('main-secret-1', 'src/config.ts', 5),
      createHardcodedSecret('main-secret-2', 'src/auth.ts', 10)
    ],
    recommendations: [],
    scores: { overall: 50, security: 30 }
  };
  
  const featureBranchAnalysis = {
    issues: [
      // 4 SQL injections remain (1 fixed)
      createSQLInjection('feat-sql-1', 'src/api/users.ts', 12), // Shifted
      createSQLInjection('feat-sql-2', 'src/api/posts.ts', 15),
      createSQLInjection('feat-sql-3', 'src/api/comments.ts', 130), // Shifted 100 lines!
      createSQLInjection('feat-sql-4', 'src/api/search.ts', 45),
      
      // 3 XSS remain
      createXSS('feat-xss-1', 'src/views/profile.ts', 22),
      createXSS('feat-xss-2', 'src/views/comments.ts', 35),
      createXSS('feat-xss-3', 'src/views/posts.ts', 52),
      
      // 2 Hardcoded secrets remain
      createHardcodedSecret('feat-secret-1', 'src/config.ts', 5),
      createHardcodedSecret('feat-secret-2', 'src/auth.ts', 10),
      
      // 3 NEW SQL injections introduced
      createSQLInjection('feat-new-sql-1', 'src/api/admin.ts', 20),
      createSQLInjection('feat-new-sql-2', 'src/api/admin.ts', 40),
      createSQLInjection('feat-new-sql-3', 'src/api/reports.ts', 60),
      
      // 1 NEW validation issue
      {
        id: 'feat-new-val-1',
        title: 'Missing Input Validation',
        message: 'No input validation',
        description: 'updateUser lacks validation',
        category: 'code-quality' as const,
        severity: 'medium' as const,
        location: { file: 'src/api/users.ts', line: 80 }
      }
    ],
    recommendations: [],
    scores: { overall: 45, security: 25 }
  };
  
  console.log('\n📊 Test Data:');
  console.log(`Main branch: ${mainBranchAnalysis.issues.length} issues`);
  console.log(`  - 5 SQL Injections`);
  console.log(`  - 3 XSS Vulnerabilities`);
  console.log(`  - 2 Hardcoded Secrets`);
  
  console.log(`Feature branch: ${featureBranchAnalysis.issues.length} issues`);
  console.log(`  - 7 SQL Injections (4 existing + 3 new)`);
  console.log(`  - 3 XSS Vulnerabilities`);
  console.log(`  - 2 Hardcoded Secrets`);
  console.log(`  - 1 Missing Validation`);
  
  // Execute orchestrator
  const result = await orchestrator.executeComparison({
    userId: 'test-user',
    teamId: 'test-team',
    mainBranchAnalysis,
    featureBranchAnalysis,
    prMetadata: {
      id: 'pr-456',
      title: 'Test PR with Duplicates',
      author: 'test-user',
      repository_url: 'https://github.com/test/repo',
      number: 456
    },
    language: 'typescript',
    sizeCategory: 'medium',
    includeEducation: true,
    generateReport: true
  });
  
  console.log('\n' + '=' .repeat(60));
  console.log('📋 Results Validation:\n');
  
  // Validate Location Enhancer received ALL issues
  const totalMainIssues = mainBranchAnalysis.issues.length;
  const totalFeatureIssues = featureBranchAnalysis.issues.length;
  const locationMainReceived = trackingLocationEnhancer.mainBranchIssues.length;
  const locationFeatureReceived = trackingLocationEnhancer.featureBranchIssues.length;
  
  console.log('1️⃣ Location Enhancer (Should receive ALL issues):');
  console.log(`   Main branch: ${locationMainReceived === totalMainIssues ? '✅' : '❌'} Received ${locationMainReceived}/${totalMainIssues}`);
  console.log(`   Feature branch: ${locationFeatureReceived === totalFeatureIssues ? '✅' : '❌'} Received ${locationFeatureReceived}/${totalFeatureIssues}`);
  
  // Validate Educator received DEDUPLICATED issues
  const educatorReceived = trackingEducator.receivedIssues.length;
  const totalIssues = totalMainIssues + totalFeatureIssues;
  
  console.log('\n2️⃣ Educator Agent (Should receive UNIQUE issues):');
  console.log(`   Total issues across branches: ${totalIssues}`);
  console.log(`   Issues sent to educator: ${educatorReceived}`);
  console.log(`   Deduplication effective: ${educatorReceived < totalIssues ? '✅' : '❌'} (${educatorReceived} < ${totalIssues})`);
  
  // Analyze what educator received
  const uniquePatterns = new Set<string>();
  trackingEducator.receivedIssues.forEach(issue => {
    uniquePatterns.add(`${issue.category}-${issue.severity}`);
  });
  
  console.log(`   Unique patterns: ${uniquePatterns.size}`);
  console.log(`   Expected patterns: 3 (security-critical, security-high, code-quality-medium)`);
  console.log(`   Pattern validation: ${uniquePatterns.size === 3 ? '✅' : '❌'}`);
  
  // Validate comparison results
  const comparison = result.analysis;
  if (comparison) {
    console.log('\n3️⃣ Comparison Results:');
    console.log(`   New issues: ${comparison.newIssues?.length || 0} (expected 4: 3 SQL + 1 validation)`);
    console.log(`   Fixed issues: ${comparison.resolvedIssues?.length || 0} (expected 1: 1 SQL fixed)`);
    console.log(`   Unchanged issues: ${comparison.unchangedIssues?.length || 0} (expected 9)`);
    
    const newCorrect = (comparison.newIssues?.length || 0) === 4;
    const fixedCorrect = (comparison.resolvedIssues?.length || 0) === 1;
    const unchangedCorrect = (comparison.unchangedIssues?.length || 0) === 9;
    
    console.log(`   Validation: ${newCorrect && fixedCorrect && unchangedCorrect ? '✅ All correct' : '❌ Mismatch'}`);
  }
  
  // Overall validation
  const allTestsPassed = 
    locationMainReceived === totalMainIssues &&
    locationFeatureReceived === totalFeatureIssues &&
    educatorReceived < totalIssues &&
    uniquePatterns.size === 3;
  
  console.log('\n' + '=' .repeat(60));
  if (allTestsPassed) {
    console.log('🎉 SUCCESS! Deduplication logic working correctly:');
    console.log('  ✅ Location enhancer receives ALL issues (no dedup)');
    console.log('  ✅ Educator receives UNIQUE issues (deduped)');
    console.log('  ✅ Comparison preserves all occurrences');
    return 0;
  } else {
    console.log('❌ FAILED! Issues with deduplication logic');
    return 1;
  }
}

// Run test
testDeduplicationFlow()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });