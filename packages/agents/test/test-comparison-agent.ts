#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { join } from 'path';
import { ComparisonAgent } from '../src/comparison/comparison-agent';
import { RepositoryIssueHistory } from '../src/comparison/repository-analyzer';

// Load environment variables
config({ path: join(process.cwd(), '.env') });

async function testComparisonAgent() {
  console.log('🧪 Testing Comparison Agent with Repository Analysis\n');
  
  // Sample historical issues (would come from Orchestrator/Supabase)
  const historicalIssues: RepositoryIssueHistory[] = [
    {
      repositoryUrl: 'https://github.com/test-org/test-repo',
      issueId: 'security-sql-injection-src/api/users.js-45',
      firstSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      occurrences: 3,
      severity: 'critical',
      category: 'security',
      status: 'active'
    },
    {
      repositoryUrl: 'https://github.com/test-org/test-repo',
      issueId: 'security-xss-vulnerability-src/views/comments.ejs-34',
      firstSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      occurrences: 1,
      severity: 'critical',
      category: 'security',
      status: 'active'
    }
  ];
  
  // Sample DeepWiki analysis results (would come from Redis cache via Orchestrator)
  const mainBranchAnalysis = {
    issues: [
      {
        id: 'sec-001',
        severity: 'critical' as const,
        category: 'security',
        title: 'SQL Injection Vulnerability',
        description: 'User input used directly in SQL query',
        location: { file: 'src/api/users.js', line: 45 },
        type: 'sql-injection',
        codeSnippet: `db.query(\`SELECT * FROM users WHERE id = \${userId}\`)`,
        recommendation: 'Use parameterized queries',
        fixExample: `db.query('SELECT * FROM users WHERE id = ?', [userId])`
      },
      {
        id: 'perf-001',
        severity: 'high' as const,
        category: 'performance',
        title: 'N+1 Query Problem',
        description: 'Multiple DB queries in loop',
        location: { file: 'src/services/posts.js', line: 123 }
      },
      {
        id: 'sec-002',
        severity: 'critical' as const,
        category: 'security',
        title: 'XSS Vulnerability',
        description: 'Unescaped user input in HTML',
        location: { file: 'src/views/comments.ejs', line: 34 }
      }
    ],
    recommendations: [],
    scores: {
      overall: 68,
      security: 45,
      performance: 70,
      maintainability: 80,
      testing: 75
    },
    metadata: { patterns: ['mvc', 'rest-api'] }
  };
  
  const featureBranchAnalysis = {
    issues: [
      // Existing issues (recurring)
      {
        id: 'sec-001',
        severity: 'critical' as const,
        category: 'security',
        title: 'SQL Injection Vulnerability',
        description: 'User input used directly in SQL query',
        location: { file: 'src/api/users.js', line: 45 },
        type: 'sql-injection'
      },
      // Resolved: perf-001 (N+1 query fixed)
      // Resolved: sec-002 (XSS fixed)
      // New issue
      {
        id: 'sec-003',
        severity: 'high' as const,
        category: 'security',
        title: 'Insecure Direct Object Reference',
        description: 'No authorization check for resource access',
        location: { file: 'src/api/documents.js', line: 78 },
        codeSnippet: `app.get('/document/:id', (req, res) => {
  const doc = db.getDocument(req.params.id);
  res.json(doc); // No auth check!
})`,
        recommendation: 'Add authorization checks',
        fixExample: `app.get('/document/:id', requireAuth, async (req, res) => {
  const doc = await db.getDocument(req.params.id);
  if (doc.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(doc);
})`
      }
    ],
    recommendations: [],
    scores: {
      overall: 72,
      security: 50,
      performance: 78,
      maintainability: 80,
      testing: 80
    },
    metadata: { patterns: ['mvc', 'rest-api'] }
  };
  
  const userProfile = {
    userId: 'user123',
    skills: {
      security: { current: 65, trend: 'stable' as const, lastUpdated: new Date(), issuesResolved: 12, issuesIntroduced: 3, experiencePoints: 450 },
      performance: { current: 78, trend: 'improving' as const, lastUpdated: new Date(), issuesResolved: 8, issuesIntroduced: 1, experiencePoints: 320 },
      codeQuality: { current: 82, trend: 'improving' as const, lastUpdated: new Date(), issuesResolved: 15, issuesIntroduced: 2, experiencePoints: 520 },
      architecture: { current: 75, trend: 'stable' as const, lastUpdated: new Date(), issuesResolved: 5, issuesIntroduced: 0, experiencePoints: 280 },
      testing: { current: 70, trend: 'improving' as const, lastUpdated: new Date(), issuesResolved: 10, issuesIntroduced: 1, experiencePoints: 380 },
      debugging: { current: 72, trend: 'stable' as const, lastUpdated: new Date(), issuesResolved: 6, issuesIntroduced: 0, experiencePoints: 250 }
    },
    history: [],
    achievements: [],
    learningProgress: { modulesCompleted: [], totalLearningTime: 0, streak: 3 }
  };
  
  const prMetadata = {
    id: '#456',
    title: 'Fix performance issues and add document API',
    repositoryUrl: 'https://github.com/test-org/test-repo',
    author: 'developer123'
  };
  
  try {
    // Initialize Comparison Agent (no external connections)
    const agent = new ComparisonAgent();
    
    console.log('🔄 Running Comparison Analysis...\n');
    
    // This is what the Orchestrator would send to the Comparison Agent
    const result = await agent.analyze({
      mainBranchAnalysis,
      featureBranchAnalysis,
      historicalIssues, // From Orchestrator/Supabase
      prMetadata,
      userProfile,
      generateReport: true
    });
    
    console.log('✅ Analysis Complete!\n');
    
    // Display repository analysis (not persisted, just calculated)
    if (result.metadata?.repositoryAnalysis) {
      const analysis = result.metadata.repositoryAnalysis;
      console.log('📊 Repository Analysis:');
      console.log(`- New Issues: ${analysis.newIssues?.length || 0}`);
      console.log(`- Recurring Issues: ${analysis.recurringIssues?.length || 0}`);
      console.log(`- Resolved Issues: ${analysis.resolvedIssues?.length || 0}`);
      console.log(`- Technical Debt: ${analysis.technicalDebt?.totalDebt || 0} hours (~$${analysis.technicalDebt?.estimatedCost || 0})`);
      console.log(`- Debt Trend: ${analysis.technicalDebt?.debtTrend || 'unknown'}\n`);
      
      if (analysis.recurringIssues?.length > 0) {
        console.log('⚠️  Recurring Issues:');
        analysis.recurringIssues.forEach((issue: string) => console.log(`  - ${issue}`));
        console.log();
      }
      
      // Show issue updates that Orchestrator would persist
      if (analysis.issueUpdates?.length > 0) {
        console.log('📝 Issue Updates for Orchestrator to Persist:');
        analysis.issueUpdates.forEach((update: any) => {
          console.log(`  - ${update.action}: ${update.issueId}`);
        });
        console.log();
      }
    }
    
    // Display educational request
    if (result.metadata?.educationalRequest) {
      const eduRequest = result.metadata.educationalRequest as any;
      console.log('🎯 Educational Request for Orchestrator:');
      console.log(`- Total Issues: ${eduRequest.context?.totalIssues || 0}`);
      console.log(`- Critical Count: ${eduRequest.context?.criticalCount || 0}`);
      console.log(`- Technical Debt Hours: ${eduRequest.context?.technicalDebtHours || 0}`);
      console.log('\nRequested Learning Modules:');
      (eduRequest.requestedModules || []).forEach((module: any, i: number) => {
        console.log(`\n${i + 1}. ${module.topic}`);
        console.log(`   Reason: ${module.reason}`);
        console.log(`   Urgency: ${module.urgency}`);
        console.log(`   Current Skill: ${module.currentSkillLevel} → Target: ${module.targetSkillLevel}`);
        console.log(`   Estimated Time: ${module.estimatedLearningTime}`);
      });
    }
    
    // Save report to file
    if (result.metadata?.report) {
      const fs = await import('fs/promises');
      const reportPath = join(process.cwd(), 'test/comparison-agent-report.md');
      await fs.writeFile(reportPath, (result.metadata.report as any).markdown || '');
      console.log(`\n📄 Full report saved to: ${reportPath}`);
    }
    
    console.log('\n🏗️  Architecture Notes:');
    console.log('- Comparison Agent receives all data from Orchestrator');
    console.log('- No direct database connections in the agent');
    console.log('- Repository analysis calculated but not persisted');
    console.log('- Issue updates returned for Orchestrator to persist');
    console.log('- Educational request prepared for next step in flow');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testComparisonAgent().catch(console.error);