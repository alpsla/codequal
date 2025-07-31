#!/usr/bin/env ts-node

/**
 * Debug DeepWiki Reports
 * 
 * Generate separate reports for main and feature branches
 * to understand the data discrepancy
 */

import { config } from 'dotenv';
import path from 'path';
import { promises as fs } from 'fs';
import { createLogger } from '@codequal/core/utils';
import { deepWikiApiManager } from '../../../apps/api/src/services/deepwiki-api-manager';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../.env') });

const logger = createLogger('DebugDeepWiki');

async function generateDeepWikiReports() {
  const repository = 'https://github.com/sindresorhus/normalize-url';
  
  logger.info(`
================================================================================
🔍 Debugging DeepWiki Reports
================================================================================
Repository: ${repository}
================================================================================
`);

  try {
    // Step 1: Analyze main branch
    logger.info('\n📊 Analyzing main branch...');
    const mainStartTime = Date.now();
    
    const mainAnalysis = await deepWikiApiManager.analyzeRepository(
      repository,
      { branch: 'main' }
    );
    
    const mainDuration = Date.now() - mainStartTime;
    logger.info(`✅ Main branch analyzed in ${mainDuration}ms`);
    
    // Save main branch report
    const mainReport = {
      branch: 'main',
      repository,
      analysisDate: new Date().toISOString(),
      duration: `${mainDuration}ms`,
      issues: mainAnalysis.issues,
      scores: mainAnalysis.scores,
      summary: {
        totalIssues: mainAnalysis.issues.length,
        bySeverity: {
          critical: mainAnalysis.issues.filter(i => i.severity === 'critical').length,
          high: mainAnalysis.issues.filter(i => i.severity === 'high').length,
          medium: mainAnalysis.issues.filter(i => i.severity === 'medium').length,
          low: mainAnalysis.issues.filter(i => i.severity === 'low').length
        }
      },
      recommendations: mainAnalysis.recommendations,
      metadata: mainAnalysis.metadata
    };
    
    await fs.writeFile(
      path.join(__dirname, 'deepwiki-main-branch-report.json'),
      JSON.stringify(mainReport, null, 2)
    );
    
    // Generate markdown for main branch
    const mainMarkdown = generateMarkdownReport(mainReport, mainAnalysis);
    await fs.writeFile(
      path.join(__dirname, 'deepwiki-main-branch-report.md'),
      mainMarkdown
    );
    
    logger.info(`
Main Branch Summary:
- Total issues: ${mainReport.summary.totalIssues}
- Critical: ${mainReport.summary.bySeverity.critical}
- High: ${mainReport.summary.bySeverity.high}
- Medium: ${mainReport.summary.bySeverity.medium}
- Low: ${mainReport.summary.bySeverity.low}
- Overall Score: ${mainAnalysis.scores.overall}/100
`);
    
    // Step 2: Analyze feature branch (PR #192)
    logger.info('\n📊 Analyzing feature branch (PR #192)...');
    const prStartTime = Date.now();
    
    const prAnalysis = await deepWikiApiManager.analyzeRepository(
      repository,
      { 
        branch: 'fix-decode-entire-pathname',
        prId: 'PR-192'
      }
    );
    
    const prDuration = Date.now() - prStartTime;
    logger.info(`✅ Feature branch analyzed in ${prDuration}ms`);
    
    // Save PR branch report
    const prReport = {
      branch: 'fix-decode-entire-pathname',
      prNumber: 192,
      repository,
      analysisDate: new Date().toISOString(),
      duration: `${prDuration}ms`,
      issues: prAnalysis.issues,
      scores: prAnalysis.scores,
      summary: {
        totalIssues: prAnalysis.issues.length,
        bySeverity: {
          critical: prAnalysis.issues.filter(i => i.severity === 'critical').length,
          high: prAnalysis.issues.filter(i => i.severity === 'high').length,
          medium: prAnalysis.issues.filter(i => i.severity === 'medium').length,
          low: prAnalysis.issues.filter(i => i.severity === 'low').length
        }
      },
      recommendations: prAnalysis.recommendations,
      metadata: prAnalysis.metadata
    };
    
    await fs.writeFile(
      path.join(__dirname, 'deepwiki-pr-192-report.json'),
      JSON.stringify(prReport, null, 2)
    );
    
    // Generate markdown for PR branch
    const prMarkdown = generateMarkdownReport(prReport, prAnalysis);
    await fs.writeFile(
      path.join(__dirname, 'deepwiki-pr-192-report.md'),
      prMarkdown
    );
    
    logger.info(`
Feature Branch Summary:
- Total issues: ${prReport.summary.totalIssues}
- Critical: ${prReport.summary.bySeverity.critical}
- High: ${prReport.summary.bySeverity.high}
- Medium: ${prReport.summary.bySeverity.medium}
- Low: ${prReport.summary.bySeverity.low}
- Overall Score: ${prAnalysis.scores.overall}/100
`);

    // Step 3: Show comparison
    logger.info(`
================================================================================
📊 Comparison Summary
================================================================================
Main Branch:
- Total issues: ${mainReport.summary.totalIssues}
- Breakdown: ${mainReport.summary.bySeverity.critical}C / ${mainReport.summary.bySeverity.high}H / ${mainReport.summary.bySeverity.medium}M / ${mainReport.summary.bySeverity.low}L
- Score: ${mainAnalysis.scores.overall}/100

Feature Branch (PR #192):
- Total issues: ${prReport.summary.totalIssues}
- Breakdown: ${prReport.summary.bySeverity.critical}C / ${prReport.summary.bySeverity.high}H / ${prReport.summary.bySeverity.medium}M / ${prReport.summary.bySeverity.low}L
- Score: ${prAnalysis.scores.overall}/100

Difference:
- Issues: ${prReport.summary.totalIssues - mainReport.summary.totalIssues} (${prReport.summary.totalIssues < mainReport.summary.totalIssues ? 'improved' : prReport.summary.totalIssues > mainReport.summary.totalIssues ? 'worsened' : 'no change'})
- Score: ${prAnalysis.scores.overall - mainAnalysis.scores.overall} points
================================================================================
`);

    return {
      success: true,
      mainReport,
      prReport
    };
    
  } catch (error) {
    logger.error('Failed to generate reports:', error as Error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

function generateMarkdownReport(report: any, analysis: any): string {
  const severityEmoji = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢'
  };
  
  return `# DeepWiki Analysis Report - ${report.branch}

**Repository:** ${report.repository}
**Branch:** ${report.branch}
${report.prNumber ? `**PR:** #${report.prNumber}` : ''}
**Analysis Date:** ${new Date(report.analysisDate).toLocaleString()}
**Duration:** ${report.duration}

## Summary

**Overall Score:** ${analysis.scores.overall}/100

### Issue Distribution
- **Total Issues:** ${report.summary.totalIssues}
- **Critical:** ${report.summary.bySeverity.critical}
- **High:** ${report.summary.bySeverity.high}
- **Medium:** ${report.summary.bySeverity.medium}
- **Low:** ${report.summary.bySeverity.low}

### Scores by Category
- **Security:** ${analysis.scores.security}/100
- **Performance:** ${analysis.scores.performance}/100
- **Maintainability:** ${analysis.scores.maintainability}/100
- **Testing:** ${analysis.scores.testing || 'N/A'}/100

## Issues Found

${report.issues.length === 0 ? 'No issues found.' : report.issues.map((issue: any, i: number) => `
### ${i + 1}. ${severityEmoji[issue.severity] || '⚫'} ${issue.title || issue.message} (${issue.severity.toUpperCase()})

- **ID:** ${issue.id || `${issue.category}-${issue.file}-${issue.line}`}
- **Category:** ${issue.category}
- **File:** \`${issue.file || issue.location?.file || 'Not specified'}:${issue.line || issue.location?.line || 'N/A'}\`
- **Type:** ${issue.type}

**Description:** ${issue.description || issue.message || 'No description available'}

${issue.impact ? `**Impact:** ${issue.impact}` : ''}

${issue.codeSnippet ? `**Code:**
\`\`\`${issue.language || 'javascript'}
${issue.codeSnippet}
\`\`\`` : ''}

**Recommendation:** ${issue.recommendation || issue.suggestion || 'Review and fix this issue'}

${issue.fixExample ? `**Fix Example:**
\`\`\`${issue.language || 'javascript'}
${issue.fixExample}
\`\`\`` : ''}

${issue.cwe ? `**CWE:** ${issue.cwe}` : ''}
${issue.cvss ? `**CVSS:** ${issue.cvss}` : ''}
`).join('\n---\n')}

## Recommendations

${report.recommendations && report.recommendations.length > 0 ? 
  report.recommendations.map((rec: any, i: number) => `
${i + 1}. **${rec.title}**
   - Priority: ${rec.priority}
   - Category: ${rec.category}
   - Description: ${rec.description}
`).join('\n') : 'No specific recommendations.'}

## Metadata

\`\`\`json
${JSON.stringify(report.metadata || {}, null, 2)}
\`\`\`
`;
}

// Run the debug script
async function main() {
  logger.info('Starting DeepWiki Debug Analysis...\n');
  
  const result = await generateDeepWikiReports();
  
  if (result.success) {
    logger.info(`
✨ SUCCESS! Reports generated:
- deepwiki-main-branch-report.json
- deepwiki-main-branch-report.md
- deepwiki-pr-192-report.json
- deepwiki-pr-192-report.md
`);
    process.exit(0);
  } else {
    logger.error(`\n❌ FAILED: ${result.error}`);
    process.exit(1);
  }
}

main().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});