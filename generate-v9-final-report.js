#!/usr/bin/env node

/**
 * V9 FINAL REPORT GENERATOR
 * Uses the VERIFIED WORKING components documented in V9_WORKING_COMPONENTS.md
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Import the VERIFIED WORKING components
const { V9ScoringCalculator } = require('./packages/agents/dist/two-branch/analyzers/v9-scoring-calculator');
const { V9IssueComparator } = require('./packages/agents/dist/two-branch/analyzers/v9-issue-comparator');
const { V9BusinessImpact } = require('./packages/agents/dist/two-branch/analyzers/v9-business-impact');
const { V9EducationalResources } = require('./packages/agents/dist/two-branch/analyzers/v9-educational-resources');
const { V9ReportFormatterComplete } = require('./packages/agents/dist/two-branch/analyzers/v9-report-formatter-complete');
const { V9PRCommentGenerator } = require('./packages/agents/dist/two-branch/analyzers/v9-pr-comment-generator');

async function generateFinalReport() {
  console.log('📊 V9 FINAL REPORT GENERATOR');
  console.log('=' .repeat(60));
  console.log('Using VERIFIED WORKING components only\n');

  // Create sample data that matches what we found for Kafka
  const mainBranchIssues = generateSampleIssues(64, 'main');
  const prBranchIssues = generateSampleIssues(67, 'pr');
  const modifiedFiles = [
    'src/main/java/org/apache/kafka/Example1.java',
    'src/main/java/org/apache/kafka/Example2.java',
    'src/main/java/org/apache/kafka/Example3.java'
  ];

  // Required metadata as documented
  const metadata = {
    // Basic PR info
    repository: 'apache/kafka',
    prNumber: 17620,
    branch: 'pr-17620',
    prAuthor: 'kafka-contributor',
    prAuthorEmail: 'contributor@apache.org',

    // Repository info
    repoOwner: 'apache',
    organization: 'apache',
    repoUrl: 'https://github.com/apache/kafka',

    // Code metrics
    totalLinesOfCode: 850000,
    linesAdded: 450,
    linesDeleted: 120,
    linesModified: 570,
    languageBreakdown: {
      'Java': 75,
      'Scala': 20,
      'Python': 3,
      'Shell': 2
    },

    // Analysis info
    language: 'java',
    totalFiles: 6925,
    modifiedFiles: 3,
    analysisTime: 145000,
    tools: ['spotbugs', 'pmd', 'checkstyle', 'semgrep', 'dependency-check', 'sonarqube', 'infer'],
    timestamp: new Date().toISOString(),
    analyzedAt: new Date().toISOString(),
    analyzer: 'V9 Canonical System',
    executionTime: 145,

    // Advanced features
    smartFileSelection: true,
    maxFilesAnalyzed: 500,
    agentsUsed: [
      { name: 'Security', version: 'v9', processed: 22 },
      { name: 'Quality', version: 'v9', processed: 21 },
      { name: 'Performance', version: 'v9', processed: 12 },
      { name: 'Architecture', version: 'v9', processed: 0 },
      { name: 'Dependency', version: 'v9', processed: 12 }
    ],
    toolsUsed: [
      { name: 'spotbugs', version: '4.7.3', issues: 17 },
      { name: 'pmd', version: '6.55.0', issues: 13 },
      { name: 'checkstyle', version: '10.12.0', issues: 11 },
      { name: 'semgrep', version: '1.45.0', issues: 9 },
      { name: 'dependency-check', version: '8.4.0', issues: 9 },
      { name: 'sonarqube', version: '10.2', issues: 5 },
      { name: 'infer', version: '1.1.0', issues: 3 }
    ],
    costBreakdown: {
      tools: 0.02,
      agents: 0.15,
      total: 0.17
    },
    totalCost: 0.17,
    durations: {
      tools: 45000,
      agents: 30000,
      deduplication: 5000,
      reporting: 10000,
      total: 90000
    }
  };

  console.log('1️⃣ Initializing verified working components...');
  const scorer = new V9ScoringCalculator();
  const comparator = new V9IssueComparator();
  const impact = new V9BusinessImpact();
  const resources = new V9EducationalResources();
  const formatter = new V9ReportFormatterComplete();
  const commentGen = new V9PRCommentGenerator();
  console.log('   ✅ All components initialized\n');

  console.log('2️⃣ Calculating quality scores...');
  const mainScoreValue = scorer.calculateQualityScore(mainBranchIssues, [], []);
  const prScoreValue = scorer.calculateQualityScore(prBranchIssues, [], []);
  const mainGrade = scorer.getGrade(mainScoreValue);
  const prGrade = scorer.getGrade(prScoreValue);

  const mainScore = { score: mainScoreValue, grade: mainGrade };
  const prScore = { score: prScoreValue, grade: prGrade };

  console.log(`   Main branch: ${mainScore.score}/100 (${mainScore.grade})`);
  console.log(`   PR branch: ${prScore.score}/100 (${prScore.grade})\n`);

  console.log('3️⃣ Comparing issues between branches...');
  const comparisonResult = comparator.compareIssues(
    mainBranchIssues,
    prBranchIssues,
    modifiedFiles
  );

  // Transform to expected structure
  const comparison = {
    newIssues: comparisonResult.newIssues || [],
    resolvedIssues: comparisonResult.resolvedIssues || [],
    existingIssuesInModifiedFiles: [], // Not provided by this version
    existingIssuesNotInModifiedFiles: comparisonResult.existingIssues || [],
    shouldBlock: comparisonResult.newIssues.some(i => i.severity === 'critical' || i.severity === 'high')
  };

  console.log(`   New issues: ${comparison.newIssues.length}`);
  console.log(`   Resolved issues: ${comparison.resolvedIssues.length}`);
  console.log(`   Existing issues: ${comparison.existingIssuesNotInModifiedFiles.length}\n`);

  console.log('4️⃣ Calculating business impact...');
  const businessImpact = impact.calculateBusinessImpact(prBranchIssues, []);
  console.log(`   Risk level: ${businessImpact.riskMatrix.overallRisk}`);
  console.log(`   Estimated cost: $${businessImpact.financialImpact.estimatedCostOfIssues}\n`);

  console.log('5️⃣ Generating educational resources...');
  // Skip for now - requires language parameter
  const educationalResources = { resources: [] };
  console.log(`   Skipped (requires additional parameters)\n`);

  console.log('6️⃣ Creating analysis result object...');
  const analysisResult = {
    metadata,
    mainBranchAnalysis: {
      issues: mainBranchIssues,
      metrics: mainScore,
      issuesByCategory: groupByCategory(mainBranchIssues),
      issuesBySeverity: groupBySeverity(mainBranchIssues)
    },
    prBranchAnalysis: {
      issues: prBranchIssues,
      metrics: prScore,
      issuesByCategory: groupByCategory(prBranchIssues),
      issuesBySeverity: groupBySeverity(prBranchIssues)
    },
    comparison,
    educationalResources: educationalResources.resources,
    businessImpact,
    recommendations: generateRecommendations(comparison),
    qualityScore: prScore
  };
  console.log('   ✅ Analysis result created\n');

  console.log('7️⃣ Generating comprehensive report...');
  const report = formatter.format(analysisResult);
  const reportFile = `V9-FINAL-REPORT-${Date.now()}.md`;
  fs.writeFileSync(reportFile, report);
  console.log(`   ✅ Report saved: ${reportFile}\n`);

  console.log('8️⃣ Generating PR comment...');
  const prComment = commentGen.generateComment(analysisResult);
  const commentFile = `V9-PR-COMMENT-${Date.now()}.md`;
  fs.writeFileSync(commentFile, prComment);
  console.log(`   ✅ PR comment saved: ${commentFile}\n`);

  console.log('=' .repeat(60));
  console.log('✅ FINAL REPORT GENERATION COMPLETE\n');
  console.log('Generated files:');
  console.log(`  📄 Full Report: ${reportFile}`);
  console.log(`  💬 PR Comment: ${commentFile}\n`);

  // Show summary
  console.log('Summary:');
  console.log(`  Repository: ${metadata.repository}`);
  console.log(`  PR #${metadata.prNumber}`);
  console.log(`  Status: ${comparison.shouldBlock ? '🚫 BLOCKED' : '✅ APPROVED'}`);
  console.log(`  Quality Score: ${prScore.score}/100 (${prScore.grade})`);
  console.log(`  New Issues: ${comparison.newIssues.length}`);
  console.log(`  Business Risk: ${businessImpact.riskMatrix.overallRisk}`);

  return {
    reportFile,
    commentFile,
    analysisResult
  };
}

function generateSampleIssues(count, branch) {
  const issues = [];
  const severities = ['critical', 'high', 'medium', 'low'];
  const categories = ['Security', 'Code Quality', 'Performance', 'Best Practices'];
  const tools = ['spotbugs', 'pmd', 'checkstyle', 'semgrep', 'sonarqube'];

  for (let i = 0; i < count; i++) {
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const tool = tools[Math.floor(Math.random() * tools.length)];

    issues.push({
      id: `${branch}-issue-${i}`,
      title: `${category} issue found by ${tool}`,
      severity,
      category,
      file: `src/main/java/org/apache/kafka/Example${Math.floor(Math.random() * 10)}.java`,
      line: Math.floor(Math.random() * 500) + 1,
      tool,
      agent: 'V9 Agent',
      confidence: Math.random() * 0.5 + 0.5,
      description: `This is a ${severity} ${category.toLowerCase()} issue detected in ${branch} branch`,
      suggestion: `Fix this ${severity} issue to improve code quality`,
      codeSnippet: `// Code snippet here\npublic void method() {\n  // Issue occurs here\n}`,
      suggestedFix: `// Suggested fix\npublic void method() {\n  // Fixed code here\n}`
    });
  }

  // Ensure we have some critical/high issues for realistic testing
  if (branch === 'pr') {
    issues[0].severity = 'critical';
    issues[1].severity = 'high';
    issues[2].severity = 'high';
  }

  return issues;
}

function groupByCategory(issues) {
  const grouped = {};
  issues.forEach(issue => {
    if (!grouped[issue.category]) {
      grouped[issue.category] = [];
    }
    grouped[issue.category].push(issue);
  });
  return grouped;
}

function groupBySeverity(issues) {
  const grouped = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };
  issues.forEach(issue => {
    if (grouped[issue.severity]) {
      grouped[issue.severity].push(issue);
    }
  });
  return grouped;
}

function generateRecommendations(comparison) {
  const recommendations = [];

  if (comparison.shouldBlock) {
    recommendations.push({
      priority: 'critical',
      title: 'Fix blocking issues before merge',
      description: 'Critical or high severity issues found in new or modified code must be resolved.',
      effort: 'high'
    });
  }

  if (comparison.newIssues.length > 10) {
    recommendations.push({
      priority: 'high',
      title: 'Review new issues introduced',
      description: `${comparison.newIssues.length} new issues were introduced. Consider reviewing the changes.`,
      effort: 'medium'
    });
  }

  if (comparison.resolvedIssues.length > 0) {
    recommendations.push({
      priority: 'info',
      title: 'Good progress on issue resolution',
      description: `${comparison.resolvedIssues.length} issues were resolved in this PR.`,
      effort: 'none'
    });
  }

  return recommendations;
}

// Run if executed directly
if (require.main === module) {
  generateFinalReport()
    .then(result => {
      console.log('\n✅ Success!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { generateFinalReport };