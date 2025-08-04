#!/usr/bin/env ts-node

/**
 * Test Real DeepWiki API
 * 
 * This script tests the real DeepWiki API directly
 */

import * as dotenv from 'dotenv';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

// Import DeepWiki API manager
import { deepWikiApiManager } from './src/services/deepwiki-api-manager';

// Import Standard framework components  
import { registerDeepWikiApi, createDeepWikiService, IDeepWikiApi } from '../../packages/agents/dist/standard/index';

async function testRealDeepWiki() {
  console.log('🚀 Testing Real DeepWiki API');
  console.log('============================\n');

  // Set environment to use real API
  process.env.USE_DEEPWIKI_MOCK = 'false';

  // Check environment
  console.log('🔍 Environment Check:');
  console.log(`DEEPWIKI_API_KEY: ${process.env.DEEPWIKI_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`DEEPWIKI_NAMESPACE: ${process.env.DEEPWIKI_NAMESPACE || 'codequal-dev'}`);
  console.log(`DEEPWIKI_POD_NAME: ${process.env.DEEPWIKI_POD_NAME || 'deepwiki'}\n`);

  try {
    // Register the real DeepWiki API
    console.log('📝 Registering real DeepWiki API...');
    
    const adapter: IDeepWikiApi = {
      async analyzeRepository(repositoryUrl: string, options?: any) {
        const result = await deepWikiApiManager.analyzeRepository(repositoryUrl, options);
        
        // Convert to expected format
        return {
          issues: result.issues.map((issue: any) => ({
            id: issue.id || `issue-${Math.random().toString(36).substr(2, 9)}`,
            severity: (issue.severity || 'medium').toLowerCase() as 'critical' | 'high' | 'medium' | 'low' | 'info',
            category: issue.category,
            title: issue.title || issue.message,
            description: issue.description || issue.message || issue.title,
            location: {
              file: issue.file || issue.location?.file || 'unknown',
              line: issue.line || issue.location?.line || 0,
              column: issue.location?.column
            },
            recommendation: issue.suggestion || issue.recommendation || issue.remediation,
            rule: issue.rule || issue.cwe
          })),
          scores: {
            overall: result.scores?.overall || 0,
            security: result.scores?.security || 0,
            performance: result.scores?.performance || 0,
            maintainability: result.scores?.maintainability || result.scores?.codeQuality || 0,
            testing: result.scores?.testing
          },
          metadata: {
            timestamp: result.metadata?.analyzed_at ? new Date(result.metadata.analyzed_at).toISOString() : new Date().toISOString(),
            tool_version: '1.0.0', // Default version
            duration_ms: result.metadata?.duration_ms || 0,
            files_analyzed: result.metadata?.files_analyzed || result.statistics?.files_analyzed || 0,
            total_lines: undefined, // Not available in DeepWikiMetadata
            model_used: result.metadata?.model_used,
            branch: result.metadata?.branch || options?.branch
          }
        };
      }
    };
    
    registerDeepWikiApi(adapter);
    console.log('✅ Real DeepWiki API registered!\n');

    // Create DeepWiki service
    const deepWikiService = createDeepWikiService(undefined, false);
    
    // Test repository
    const repository = 'https://github.com/vercel/swr';
    const branch = 'main';
    
    console.log(`📊 Analyzing repository: ${repository}`);
    console.log(`🌿 Branch: ${branch}\n`);
    
    const startTime = Date.now();
    console.log('🔄 Running real DeepWiki analysis...\n');
    
    // Run analysis
    const result = await deepWikiService.analyzeRepository(repository, branch);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`✅ Analysis completed in ${duration}s\n`);
    console.log('📋 Results:');
    console.log(`   Total Issues: ${result.issues.length}`);
    console.log(`   Overall Score: ${result.scores?.overall || 0}/100`);
    console.log(`   Security Score: ${result.scores?.security || 0}/100`);
    console.log(`   Performance Score: ${result.scores?.performance || 0}/100`);
    console.log(`   Code Quality Score: ${result.scores?.maintainability || 0}/100`);
    console.log(`   Files Analyzed: ${result.metadata?.filesAnalyzed || 0}`);
    console.log(`   Model Used: ${result.metadata?.model || 'Unknown'}\n`);
    
    // Display issues by severity
    const severityCounts: Record<string, number> = {};
    result.issues.forEach((issue: any) => {
      severityCounts[issue.severity] = (severityCounts[issue.severity] || 0) + 1;
    });
    
    console.log('🔍 Issues by Severity:');
    Object.entries(severityCounts).forEach(([severity, count]) => {
      console.log(`   ${severity}: ${count}`);
    });
    
    // Show sample issues
    if (result.issues.length > 0) {
      console.log('\n📝 Sample Issues:');
      result.issues.slice(0, 5).forEach((issue: any, index: number) => {
        console.log(`\n${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
        console.log(`   Category: ${issue.category}`);
        if (issue.location) {
          console.log(`   Location: ${issue.location.file}:${issue.location.line}`);
        }
        if (issue.suggestedFix) {
          console.log(`   Fix: ${issue.suggestedFix}`);
        }
      });
      
      if (result.issues.length > 5) {
        console.log(`\n... and ${result.issues.length - 5} more issues`);
      }
    }
    
    // Save full report
    const outputDir = join(__dirname, 'test-output', new Date().toISOString().split('T')[0]);
    mkdirSync(outputDir, { recursive: true });
    
    const reportPath = join(outputDir, 'real-deepwiki-analysis.json');
    writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    
    // Generate markdown report
    const markdownReport = generateMarkdownReport(result, repository, duration);
    const mdPath = join(outputDir, 'real-deepwiki-analysis.md');
    writeFileSync(mdPath, markdownReport);
    console.log(`📝 Markdown report saved to: ${mdPath}`);
    
    return result;
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('kubectl') || error.message.includes('pod')) {
        console.error('\n💡 Tip: Make sure you have kubectl access and the DeepWiki pod is running');
        console.error('Run: kubectl get pods -n codequal-dev | grep deepwiki');
      }
    }
    
    throw error;
  }
}

function generateMarkdownReport(result: any, repository: string, duration: string): string {
  const now = new Date().toISOString();
  const severityCounts: Record<string, number> = {};
  result.issues.forEach((issue: any) => {
    severityCounts[issue.severity] = (severityCounts[issue.severity] || 0) + 1;
  });
  
  return `# DeepWiki Analysis Report

**Repository:** ${repository}  
**Analysis Date:** ${now}  
**Duration:** ${duration}s  
**Model:** ${result.metadata?.model || 'Unknown'}  

## Summary

- **Total Issues:** ${result.issues.length}
- **Files Analyzed:** ${result.metadata?.filesAnalyzed || 0}
- **Overall Score:** ${result.scores?.overall || 0}/100

### Scores by Category

| Category | Score |
|----------|-------|
| Security | ${result.scores?.security || 0}/100 |
| Performance | ${result.scores?.performance || 0}/100 |
| Code Quality | ${result.scores?.maintainability || 0}/100 |
| Testing | ${result.scores?.testing || 0}/100 |

### Issues by Severity

| Severity | Count |
|----------|-------|
${Object.entries(severityCounts)
  .sort(([a], [b]) => {
    const order = ['critical', 'high', 'medium', 'low'];
    return order.indexOf(a) - order.indexOf(b);
  })
  .map(([severity, count]) => `| ${severity} | ${count} |`)
  .join('\n')}

## Issues

${result.issues.slice(0, 20).map((issue: any, index: number) => `
### ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}

- **Category:** ${issue.category}
- **Location:** ${issue.location ? `${issue.location.file}:${issue.location.line}` : 'N/A'}
${issue.suggestedFix ? `- **Suggested Fix:** ${issue.suggestedFix}` : ''}
${issue.description ? `- **Description:** ${issue.description}` : ''}
`).join('\n')}

${result.issues.length > 20 ? `\n... and ${result.issues.length - 20} more issues\n` : ''}

---
*Generated by DeepWiki Analysis via CodeQual Standard Framework*
`;
}

// Run the test
if (require.main === module) {
  testRealDeepWiki()
    .then(() => {
      console.log('\n🎉 Real DeepWiki test complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testRealDeepWiki };