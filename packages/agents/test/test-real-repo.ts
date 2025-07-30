#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { join } from 'path';
import { promises as fs } from 'fs';
import { createLogger } from '../../core/src/utils/logger';
import { ComparisonAgent } from '../src/comparison/comparison-agent';
import { RepositoryIssueHistory } from '../src/comparison/repository-analyzer';
import { DeepWikiAnalysisResult } from '../src/types/deepwiki';
import { SkillProfile } from '../src/comparison/skill-tracker';

// Load environment variables
config({ path: join(process.cwd(), '.env') });

const logger = createLogger('RealRepoTest');

// Mock DeepWiki Service that simulates analyzing a real repository
class MockDeepWikiService {
  async analyzeRepository(branch: 'main' | 'feature', prUrl?: string): Promise<DeepWikiAnalysisResult> {
    logger.info(`🔍 Analyzing ${branch} branch${prUrl ? ` for PR: ${prUrl}` : ''}`);
    
    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (branch === 'main') {
      // Main branch analysis - simulating Express.js repository
      return {
        issues: [
          {
            id: 'sec-001',
            severity: 'high' as const,
            category: 'security',
            title: 'Prototype Pollution Vulnerability',
            description: 'Object.prototype can be polluted through query parsing',
            location: { file: 'lib/middleware/query.js', line: 45 },
            type: 'prototype-pollution',
            codeSnippet: `function parseQuery(str) {
  var obj = {};
  str.split('&').forEach(function(pair) {
    var parts = pair.split('=');
    obj[parts[0]] = parts[1];  // Vulnerable to prototype pollution
  });
  return obj;
}`,
            recommendation: 'Use safer object creation with Object.create(null) or validate keys',
            fixExample: `function parseQuery(str) {
  var obj = Object.create(null);  // No prototype chain
  str.split('&').forEach(function(pair) {
    var parts = pair.split('=');
    if (parts[0] !== '__proto__' && parts[0] !== 'constructor' && parts[0] !== 'prototype') {
      obj[parts[0]] = parts[1];
    }
  });
  return obj;
}`
          },
          {
            id: 'perf-001',
            severity: 'medium' as const,
            category: 'performance',
            title: 'Inefficient Middleware Chain',
            description: 'Middleware stack creates unnecessary closures',
            location: { file: 'lib/router/layer.js', line: 86 },
            type: 'performance-closure',
            codeSnippet: `Layer.prototype.handle_request = function handle(req, res, next) {
  var fn = this.handle;

  if (fn.length > 3) {
    // not a standard request handler
    return next();
  }

  try {
    fn(req, res, next);  // Creates closure on each request
  } catch (err) {
    next(err);
  }
};`,
            recommendation: 'Cache function references to avoid closure creation'
          },
          {
            id: 'quality-001',
            severity: 'low' as const,
            category: 'code-quality',
            title: 'Deprecated API Usage',
            description: 'Using deprecated Buffer() constructor',
            location: { file: 'lib/utils.js', line: 234 },
            codeSnippet: `var buf = new Buffer(str, 'utf8');`,
            fixExample: `var buf = Buffer.from(str, 'utf8');`
          },
          {
            id: 'test-001',
            severity: 'medium' as const,
            category: 'testing',
            title: 'Missing Test Coverage',
            description: 'Router error handling path not covered by tests',
            location: { file: 'lib/router/index.js', line: 456 }
          }
        ],
        recommendations: [
          {
            id: 'rec-001',
            category: 'security',
            priority: 'high',
            title: 'Security Audit Required',
            description: 'Conduct thorough security audit for prototype pollution vectors',
            impact: 'Prevents potential RCE vulnerabilities',
            effort: '2-3 days'
          },
          {
            id: 'rec-002',
            category: 'performance',
            priority: 'medium',
            title: 'Optimize Hot Paths',
            description: 'Profile and optimize frequently used middleware',
            impact: '10-15% performance improvement',
            effort: '1 week'
          }
        ],
        scores: {
          overall: 78,
          security: 72,
          performance: 75,
          maintainability: 82,
          testing: 80
        },
        metadata: {
          patterns: ['middleware', 'router', 'http-server'],
          analysisTime: 42.5,
          modelUsed: 'claude-3.5-sonnet-20241022',
          filesAnalyzed: 89,
          linesOfCode: 12450
        }
      };
    } else {
      // Feature branch - PR that fixes security issue and adds new feature
      return {
        issues: [
          // Prototype pollution fixed (sec-001 resolved)
          
          // Performance issue still exists
          {
            id: 'perf-001',
            severity: 'medium' as const,
            category: 'performance',
            title: 'Inefficient Middleware Chain',
            description: 'Middleware stack creates unnecessary closures',
            location: { file: 'lib/router/layer.js', line: 86 },
            type: 'performance-closure'
          },
          // New security issue introduced
          {
            id: 'sec-002',
            severity: 'critical' as const,
            category: 'security',
            title: 'Path Traversal Vulnerability',
            description: 'User input not sanitized in static file serving',
            location: { file: 'lib/middleware/static.js', line: 123 },
            type: 'path-traversal',
            codeSnippet: `function serveStatic(root) {
  return function(req, res, next) {
    var path = root + req.url;  // Direct concatenation!
    fs.readFile(path, function(err, data) {
      if (err) return next(err);
      res.end(data);
    });
  };
}`,
            recommendation: 'Use path.join() and validate paths stay within root',
            fixExample: `function serveStatic(root) {
  return function(req, res, next) {
    var safePath = path.join(root, path.normalize(req.url).replace(/^(\\.\\.[\/\\\\])+/, ''));
    // Ensure the path is within root
    if (!safePath.startsWith(path.resolve(root))) {
      return next(new Error('Forbidden'));
    }
    fs.readFile(safePath, function(err, data) {
      if (err) return next(err);
      res.end(data);
    });
  };
}`
          },
          // Code quality still exists but moved
          {
            id: 'quality-001',
            severity: 'low' as const,
            category: 'code-quality',
            title: 'Deprecated API Usage',
            description: 'Using deprecated Buffer() constructor',
            location: { file: 'lib/utils.js', line: 240 }  // Line number changed
          },
          // New performance issue
          {
            id: 'perf-002',
            severity: 'high' as const,
            category: 'performance',
            title: 'Synchronous File Operations',
            description: 'Using sync file operations in request handler',
            location: { file: 'lib/middleware/static.js', line: 45 },
            codeSnippet: `if (fs.existsSync(filePath)) {  // Blocks event loop!
  var stats = fs.statSync(filePath);
  if (stats.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
}`,
            fixExample: `fs.stat(filePath, function(err, stats) {
  if (err) return next();
  if (stats.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  // Continue processing...
});`
          }
        ],
        recommendations: [
          {
            id: 'rec-003',
            category: 'security',
            priority: 'critical',
            title: 'Fix Path Traversal Immediately',
            description: 'Critical security vulnerability must be fixed before merge',
            impact: 'Prevents unauthorized file access',
            effort: '2-4 hours'
          },
          {
            id: 'rec-004',
            category: 'performance',
            priority: 'high',
            title: 'Remove Synchronous Operations',
            description: 'Replace all sync file operations with async alternatives',
            impact: 'Prevents event loop blocking',
            effort: '1 day'
          }
        ],
        scores: {
          overall: 70,
          security: 55,  // Much worse due to critical issue
          performance: 68,  // Worse due to sync operations
          maintainability: 82,
          testing: 78  // Slightly worse
        },
        metadata: {
          patterns: ['middleware', 'router', 'http-server'],
          analysisTime: 45.8,
          modelUsed: 'claude-3.5-sonnet-20241022',
          filesAnalyzed: 92,
          linesOfCode: 12680
        }
      };
    }
  }
}

async function loadUserProfile(userId: string): Promise<SkillProfile> {
  return {
    userId,
    skills: {
      security: { current: 75, trend: 'stable' as const, lastUpdated: new Date(), issuesResolved: 23, issuesIntroduced: 2, experiencePoints: 850 },
      performance: { current: 82, trend: 'improving' as const, lastUpdated: new Date(), issuesResolved: 18, issuesIntroduced: 1, experiencePoints: 620 },
      codeQuality: { current: 88, trend: 'improving' as const, lastUpdated: new Date(), issuesResolved: 35, issuesIntroduced: 0, experiencePoints: 1200 },
      architecture: { current: 80, trend: 'stable' as const, lastUpdated: new Date(), issuesResolved: 12, issuesIntroduced: 0, experiencePoints: 520 },
      testing: { current: 76, trend: 'improving' as const, lastUpdated: new Date(), issuesResolved: 15, issuesIntroduced: 1, experiencePoints: 480 },
      debugging: { current: 79, trend: 'stable' as const, lastUpdated: new Date(), issuesResolved: 20, issuesIntroduced: 0, experiencePoints: 680 }
    },
    history: [],
    achievements: [
      { id: 'security-guardian', title: 'Security Guardian', description: 'Fixed 20+ security issues', earnedAt: new Date(), category: 'security', icon: '🛡️' },
      { id: 'performance-optimizer', title: 'Performance Optimizer', description: 'Improved performance by 25%', earnedAt: new Date(), category: 'performance', icon: '⚡' }
    ],
    learningProgress: { modulesCompleted: ['security-basics', 'performance-profiling'], totalLearningTime: 24, streak: 12 }
  };
}

async function loadTeamProfiles(teamId: string, currentUserId: string, currentUserProfile: SkillProfile): Promise<SkillProfile[]> {
  return [
    currentUserProfile,
    {
      userId: 'contributor2',
      skills: {
        security: { current: 70, trend: 'improving' as const, lastUpdated: new Date(), issuesResolved: 15, issuesIntroduced: 3, experiencePoints: 580 },
        performance: { current: 85, trend: 'stable' as const, lastUpdated: new Date(), issuesResolved: 25, issuesIntroduced: 0, experiencePoints: 920 },
        codeQuality: { current: 82, trend: 'stable' as const, lastUpdated: new Date(), issuesResolved: 28, issuesIntroduced: 2, experiencePoints: 980 },
        architecture: { current: 78, trend: 'improving' as const, lastUpdated: new Date(), issuesResolved: 10, issuesIntroduced: 1, experiencePoints: 420 },
        testing: { current: 80, trend: 'stable' as const, lastUpdated: new Date(), issuesResolved: 20, issuesIntroduced: 0, experiencePoints: 620 },
        debugging: { current: 77, trend: 'stable' as const, lastUpdated: new Date(), issuesResolved: 18, issuesIntroduced: 1, experiencePoints: 590 }
      },
      history: [],
      achievements: [],
      learningProgress: { modulesCompleted: [], totalLearningTime: 0, streak: 0 }
    },
    {
      userId: 'contributor3',
      skills: {
        security: { current: 68, trend: 'declining' as const, lastUpdated: new Date(), issuesResolved: 10, issuesIntroduced: 5, experiencePoints: 380 },
        performance: { current: 72, trend: 'stable' as const, lastUpdated: new Date(), issuesResolved: 12, issuesIntroduced: 2, experiencePoints: 450 },
        codeQuality: { current: 78, trend: 'improving' as const, lastUpdated: new Date(), issuesResolved: 22, issuesIntroduced: 1, experiencePoints: 720 },
        architecture: { current: 74, trend: 'stable' as const, lastUpdated: new Date(), issuesResolved: 8, issuesIntroduced: 0, experiencePoints: 340 },
        testing: { current: 70, trend: 'declining' as const, lastUpdated: new Date(), issuesResolved: 9, issuesIntroduced: 3, experiencePoints: 320 },
        debugging: { current: 75, trend: 'stable' as const, lastUpdated: new Date(), issuesResolved: 14, issuesIntroduced: 1, experiencePoints: 480 }
      },
      history: [],
      achievements: [],
      learningProgress: { modulesCompleted: [], totalLearningTime: 0, streak: 0 }
    }
  ];
}

async function loadRepositoryHistory(repoUrl: string): Promise<RepositoryIssueHistory[]> {
  return [
    {
      repositoryUrl: repoUrl,
      issueId: 'security-prototype-pollution-lib/middleware/query.js-45',
      firstSeen: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      occurrences: 12,
      severity: 'high',
      category: 'security',
      status: 'active'
    },
    {
      repositoryUrl: repoUrl,
      issueId: 'performance-inefficient-middleware-lib/router/layer.js-86',
      firstSeen: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 180 days ago
      lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      occurrences: 24,
      severity: 'medium',
      category: 'performance',
      status: 'recurring'  // Long-standing issue
    }
  ];
}

async function runRealRepoTest() {
  console.log('🚀 Starting Real Repository Test\n');
  console.log('📦 Testing with Express.js-like Repository\n');
  console.log('🔗 Simulating PR: Add static file serving with security fixes\n');
  
  try {
    const deepwiki = new MockDeepWikiService();
    const comparisonAgent = new ComparisonAgent();
    
    // Test data
    const repoUrl = 'https://github.com/expressjs/express';
    const prMetadata = {
      id: '#5234',
      title: 'Add static file serving middleware with security fixes',
      repositoryUrl: repoUrl,
      author: 'contributor123'
    };
    
    // Step 1: DeepWiki Analysis
    console.log('📊 Step 1: DeepWiki Analysis\n');
    
    const mainAnalysis = await deepwiki.analyzeRepository('main');
    const featureAnalysis = await deepwiki.analyzeRepository('feature', `${repoUrl}/pull/5234`);
    
    console.log(`✅ Main branch analyzed: ${mainAnalysis.issues.length} issues found`);
    console.log(`   - Security: ${mainAnalysis.issues.filter(i => i.category === 'security').length}`);
    console.log(`   - Performance: ${mainAnalysis.issues.filter(i => i.category === 'performance').length}`);
    console.log(`   - Model Used: ${mainAnalysis.metadata?.modelUsed}\n`);
    
    console.log(`✅ Feature branch analyzed: ${featureAnalysis.issues.length} issues found`);
    console.log(`   - Critical Issues: ${featureAnalysis.issues.filter(i => i.severity === 'critical').length}`);
    console.log(`   - New Issues: ${featureAnalysis.issues.filter(i => !mainAnalysis.issues.find(mi => mi.id === i.id)).length}\n`);
    
    // Step 2: Load Context
    console.log('🎯 Step 2: Loading Context\n');
    
    const userProfile = await loadUserProfile('contributor123');
    const [teamProfiles, repositoryHistory] = await Promise.all([
      loadTeamProfiles('express-team', userProfile.userId, userProfile),
      loadRepositoryHistory(repoUrl)
    ]);
    
    console.log(`✅ User profile loaded: ${userProfile.userId}`);
    console.log(`   - Security Skill: ${userProfile.skills.security.current}`);
    console.log(`   - Achievements: ${userProfile.achievements.length}`);
    console.log(`✅ Team profiles loaded: ${teamProfiles.length} members`);
    console.log(`✅ Repository history loaded: ${repositoryHistory.length} historical issues\n`);
    
    // Step 3: Comparison Analysis
    console.log('🔍 Step 3: Running Comparison Analysis\n');
    
    const comparisonResult = await comparisonAgent.analyze({
      mainBranchAnalysis: mainAnalysis,
      featureBranchAnalysis: featureAnalysis,
      historicalIssues: repositoryHistory,
      prMetadata,
      userProfile,
      teamProfiles,
      generateReport: true
    });
    
    console.log('✅ Comparison analysis completed\n');
    
    // Step 4: Display Results
    console.log('📊 Step 4: Analysis Results\n');
    
    const { metadata } = comparisonResult;
    
    if (metadata?.repositoryAnalysis) {
      const { repositoryAnalysis } = metadata;
      console.log('🏗️  Repository Analysis:');
      console.log(`   - New Issues: ${(repositoryAnalysis as any).newIssues?.length || 0}`);
      console.log(`   - Recurring Issues: ${(repositoryAnalysis as any).recurringIssues?.length || 0} ⚠️`);
      console.log(`   - Resolved Issues: ${(repositoryAnalysis as any).resolvedIssues?.length || 0} ✅`);
      
      if ((repositoryAnalysis as any).recurringIssues?.length > 0) {
        console.log('\n⚠️  Recurring Issues:');
        (repositoryAnalysis as any).recurringIssues.forEach((issue: string) => {
          const historical = repositoryHistory.find(h => h.issueId.includes(issue));
          if (historical) {
            console.log(`   - ${issue} (${historical.occurrences} occurrences over ${Math.floor((Date.now() - historical.firstSeen.getTime()) / (24 * 60 * 60 * 1000))} days)`);
          }
        });
      }
      console.log();
    }
    
    if (metadata?.report) {
      const report = metadata.report as any;
      console.log('📄 Report Summary:');
      console.log(`   - PR Decision: ${report.metadata?.prDecision || 'UNKNOWN'}`);
      console.log(`   - Critical Issues: ${report.metadata?.criticalCount || 0}`);
      console.log(`   - Overall Score: ${report.metadata?.overallScore || 0}/100`);
      
      if (report.metadata?.prDecision === 'BLOCKED') {
        console.log('\n🚫 PR BLOCKED due to critical security issues!');
      }
      
      // Save report
      const reportPath = join(process.cwd(), 'test', 'real-repo-report.md');
      await fs.writeFile(reportPath, report.markdown || '');
      console.log(`\n📄 Full report saved to: ${reportPath}`);
    }
    
    if (metadata?.educationalRequest) {
      console.log('\n🎓 Educational Recommendations:');
      const eduRequest = metadata.educationalRequest as any;
      (eduRequest.requestedModules || []).forEach((module: any, i: number) => {
        console.log(`${i + 1}. ${module.topic} (${module.urgency})`);
        console.log(`   Current: ${module.currentSkillLevel} → Target: ${module.targetSkillLevel}`);
      });
    }
    
    console.log('\n✅ Real Repository Test Completed Successfully!');
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
runRealRepoTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });