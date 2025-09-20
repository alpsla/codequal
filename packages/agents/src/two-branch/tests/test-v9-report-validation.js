#!/usr/bin/env node

/**
 * V9 Report Validation Test
 * Tests the complete report generation pipeline and validates output
 */

// Load environment variables from root .env file
require('dotenv').config({ path: require('path').join(__dirname, '../../../../../.env') });
const fs = require('fs');
const path = require('path');

async function testV9ReportGeneration() {
  console.log('🧪 V9 REPORT VALIDATION TEST');
  console.log('=' .repeat(70));
  console.log('Testing complete report generation pipeline\n');

  try {
    // Import V9 components
    const { V9ReportFormatterFinal } = require('../../../dist/two-branch/analyzers/v9-report-formatter-final');
    const { V9ScoringCalculator } = require('../../../dist/two-branch/analyzers/v9-scoring-calculator');
    const { V9BusinessImpact } = require('../../../dist/two-branch/analyzers/v9-business-impact');
    const { V9EducationalResources } = require('../../../dist/two-branch/analyzers/v9-educational-resources');

    // Create test data that represents a real analysis
    const testAnalysis = {
      repository: 'https://github.com/apache/kafka',
      prNumber: 17620,
      prBranch: 'KAFKA-17620-fix',
      mainBranch: 'trunk',
      timestamp: new Date().toISOString(),

      // Simulated tool results
      toolResults: {
        main: {
          checkstyle: {
            issues: [
              { type: 'style', severity: 'low', file: 'core/src/main/scala/kafka/server/KafkaServer.scala', line: 145, message: 'Line too long' }
            ],
            summary: { total: 1, high: 0, medium: 0, low: 1 }
          },
          pmd: {
            issues: [
              { type: 'complexity', severity: 'medium', file: 'core/src/main/scala/kafka/server/KafkaServer.scala', line: 256, message: 'Cyclomatic complexity of 15' }
            ],
            summary: { total: 1, high: 0, medium: 1, low: 0 }
          }
        },
        pr: {
          checkstyle: {
            issues: [
              { type: 'style', severity: 'low', file: 'core/src/main/scala/kafka/server/KafkaServer.scala', line: 145, message: 'Line too long' },
              { type: 'style', severity: 'medium', file: 'core/src/main/scala/kafka/server/NewFeature.scala', line: 23, message: 'Missing Javadoc' }
            ],
            summary: { total: 2, high: 0, medium: 1, low: 1 }
          },
          pmd: {
            issues: [
              { type: 'complexity', severity: 'medium', file: 'core/src/main/scala/kafka/server/KafkaServer.scala', line: 256, message: 'Cyclomatic complexity of 15' },
              { type: 'security', severity: 'high', file: 'core/src/main/scala/kafka/server/NewFeature.scala', line: 45, message: 'Potential SQL injection vulnerability' }
            ],
            summary: { total: 2, high: 1, medium: 1, low: 0 }
          },
          semgrep: {
            issues: [
              { type: 'security', severity: 'critical', file: 'core/src/main/scala/kafka/server/NewFeature.scala', line: 67, message: 'Hardcoded credentials detected' }
            ],
            summary: { total: 1, critical: 1, high: 0, medium: 0, low: 0 }
          }
        }
      },

      // Comparison results
      comparison: {
        newIssues: [
          {
            type: 'style',
            severity: 'medium',
            file: 'core/src/main/scala/kafka/server/NewFeature.scala',
            line: 23,
            message: 'Missing Javadoc',
            tool: 'checkstyle',
            isNew: true
          },
          {
            type: 'security',
            severity: 'high',
            file: 'core/src/main/scala/kafka/server/NewFeature.scala',
            line: 45,
            message: 'Potential SQL injection vulnerability',
            tool: 'pmd',
            isNew: true
          },
          {
            type: 'security',
            severity: 'critical',
            file: 'core/src/main/scala/kafka/server/NewFeature.scala',
            line: 67,
            message: 'Hardcoded credentials detected',
            tool: 'semgrep',
            isNew: true
          }
        ],
        fixedIssues: [],
        unchangedIssues: [
          {
            type: 'style',
            severity: 'low',
            file: 'core/src/main/scala/kafka/server/KafkaServer.scala',
            line: 145,
            message: 'Line too long',
            tool: 'checkstyle'
          },
          {
            type: 'complexity',
            severity: 'medium',
            file: 'core/src/main/scala/kafka/server/KafkaServer.scala',
            line: 256,
            message: 'Cyclomatic complexity of 15',
            tool: 'pmd'
          }
        ],
        summary: {
          newIssues: 3,
          fixedIssues: 0,
          unchangedIssues: 2,
          critical: 1,
          high: 1,
          medium: 1,
          low: 0
        }
      },

      // File analysis
      filesAnalyzed: {
        main: 3456,
        pr: 3458,
        changed: 2,
        added: 2,
        deleted: 0
      },

      // Performance metrics
      metrics: {
        repositorySize: '245MB',
        analysisTime: '225s',
        toolsExecuted: 5,
        filesProcessed: 3458,
        cacheHit: true
      }
    };

    console.log('1️⃣ Calculating quality score...');
    const scorer = new V9ScoringCalculator();
    const score = scorer.calculateQualityScore(
      testAnalysis.comparison.newIssues,
      testAnalysis.comparison.fixedIssues,
      testAnalysis.comparison.unchangedIssues
    );
    console.log(`   Score: ${score.score}/100`);
    console.log(`   Grade: ${score.grade}`);
    console.log(`   Trend: ${score.trend}`);

    console.log('\n2️⃣ Analyzing business impact...');
    const businessAnalyzer = new V9BusinessImpact();
    const businessImpact = await businessAnalyzer.analyze(testAnalysis.comparison);
    console.log(`   Risk Level: ${businessImpact.riskLevel}`);
    console.log(`   Deploy Recommendation: ${businessImpact.recommendation}`);

    console.log('\n3️⃣ Gathering educational resources...');
    const educator = new V9EducationalResources();
    const resources = await educator.getResources(testAnalysis.comparison.newIssues);
    console.log(`   Found ${resources.length} educational resources`);

    console.log('\n4️⃣ Generating final report...');
    const formatter = new V9ReportFormatterFinal();
    const finalReport = await formatter.generateReport({
      analysis: testAnalysis,
      score,
      businessImpact,
      resources,
      metadata: {
        reportId: `v9-report-${Date.now()}`,
        version: '9.0.0',
        generatedAt: new Date().toISOString()
      }
    });

    // Save report
    const reportPath = path.join(__dirname, `v9-validation-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
    console.log(`\n✅ Report saved to: ${reportPath}`);

    // Validate report structure
    console.log('\n5️⃣ Validating report structure...');
    const validation = validateReport(finalReport);
    if (validation.isValid) {
      console.log('   ✅ Report structure is valid');
    } else {
      console.log('   ❌ Report validation failed:');
      validation.errors.forEach(err => console.log(`      - ${err}`));
    }

    // Display report summary
    console.log('\n📊 REPORT SUMMARY');
    console.log('=' .repeat(70));
    console.log(`Repository: ${finalReport.repository}`);
    console.log(`PR #${finalReport.prNumber}: ${finalReport.prTitle || 'N/A'}`);
    console.log(`Score: ${finalReport.score.value}/100 (${finalReport.score.grade})`);
    console.log(`New Issues: ${finalReport.summary.newIssues}`);
    console.log(`  - Critical: ${finalReport.summary.critical || 0}`);
    console.log(`  - High: ${finalReport.summary.high || 0}`);
    console.log(`  - Medium: ${finalReport.summary.medium || 0}`);
    console.log(`  - Low: ${finalReport.summary.low || 0}`);
    console.log(`Business Impact: ${finalReport.businessImpact.level}`);
    console.log(`Recommendation: ${finalReport.businessImpact.recommendation}`);

    // Generate markdown report
    console.log('\n6️⃣ Generating Markdown report...');
    const markdownReport = generateMarkdownReport(finalReport);
    const mdPath = path.join(__dirname, `v9-validation-report-${Date.now()}.md`);
    fs.writeFileSync(mdPath, markdownReport);
    console.log(`   ✅ Markdown report saved to: ${mdPath}`);

    console.log('\n✅ V9 REPORT VALIDATION COMPLETE');
    return finalReport;

  } catch (error) {
    console.error('\n❌ Report validation failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

function validateReport(report) {
  const errors = [];
  const required = [
    'repository', 'prNumber', 'score', 'summary',
    'businessImpact', 'issues', 'metadata'
  ];

  required.forEach(field => {
    if (!report[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  if (!report.score?.value || !report.score?.grade) {
    errors.push('Invalid score structure');
  }

  if (!Array.isArray(report.issues?.new)) {
    errors.push('Issues.new must be an array');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function generateMarkdownReport(report) {
  return `# CodeQual V9 Analysis Report

## 📊 Summary
- **Repository:** ${report.repository}
- **PR:** #${report.prNumber}
- **Score:** ${report.score.value}/100 (${report.score.grade})
- **Trend:** ${report.score.trend}

## 🔍 Issues Found
### New Issues (${report.summary.newIssues})
${report.issues.new.map(issue =>
  `- **${issue.severity.toUpperCase()}** [${issue.type}] ${issue.file}:${issue.line}\n  ${issue.message}`
).join('\n')}

## 💼 Business Impact
- **Risk Level:** ${report.businessImpact.level}
- **Recommendation:** ${report.businessImpact.recommendation}

## 📈 Metrics
- **Analysis Time:** ${report.metrics?.duration || 'N/A'}
- **Files Analyzed:** ${report.metrics?.filesAnalyzed || 'N/A'}
- **Tools Executed:** ${report.metrics?.toolsExecuted || 'N/A'}

---
*Generated by CodeQual V9 - ${new Date().toISOString()}*
`;
}

// Run the test
if (require.main === module) {
  testV9ReportGeneration().catch(console.error);
}

module.exports = { testV9ReportGeneration };