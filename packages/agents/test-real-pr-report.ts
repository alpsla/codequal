/**
 * Test Real PR with Enhanced Report Generator
 * Generates a complete markdown report with Type A/B fixes and deduplication
 */

import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { IssueDeduplicator } from './src/standard/services/issue-deduplicator';
import * as fs from 'fs';

// Enhanced generator with Type A/B and deduplication
class EnhancedReportGenerator extends ReportGeneratorV8Final {
  private deduplicator = new IssueDeduplicator();
  
  async generateEnhancedReport(analysisResult: any): Promise<string> {
    // Deduplicate first
    if (analysisResult.categorized) {
      const before = {
        new: analysisResult.categorized.newIssues?.length || 0,
        unchanged: analysisResult.categorized.unchangedIssues?.length || 0,
        fixed: analysisResult.categorized.fixedIssues?.length || 0
      };
      
      analysisResult.categorized = this.deduplicator.deduplicateCategorizedIssues({
        newIssues: analysisResult.categorized.newIssues || [],
        unchangedIssues: analysisResult.categorized.unchangedIssues || [],
        fixedIssues: analysisResult.categorized.fixedIssues || []
      });
      
      const after = {
        new: analysisResult.categorized.newIssues.length,
        unchanged: analysisResult.categorized.unchangedIssues.length,
        fixed: analysisResult.categorized.fixedIssues.length
      };
      
      console.log(`\n✅ Deduplication: Removed ${(before.new + before.unchanged + before.fixed) - (after.new + after.unchanged + after.fixed)} duplicates`);
    }
    
    // Generate the base report
    const baseReport = await this.generateReport(analysisResult);
    
    // Enhance with Type A/B distinction
    let enhancedReport = baseReport;
    
    // Add Type A/B section
    const typeABSection = this.generateTypeABSection(analysisResult);
    enhancedReport = enhancedReport.replace('## 📊 Summary', typeABSection + '\n\n## 📊 Summary');
    
    return enhancedReport;
  }
  
  private generateTypeABSection(result: any): string {
    let section = '## 🔧 Fix Classification Overview\n\n';
    
    let typeACounts = 0;
    let typeBCounts = 0;
    
    // Count Type A vs Type B fixes
    const allIssues = [
      ...(result.categorized?.newIssues || []),
      ...(result.categorized?.unchangedIssues || [])
    ];
    
    for (const item of allIssues) {
      if (item.fixSuggestion) {
        const isTypeB = this.isTypeB(item);
        if (isTypeB) typeBCounts++;
        else typeACounts++;
      }
    }
    
    section += `### Fix Types Distribution\n`;
    section += `- 🟢 **Type A Fixes (Direct Copy-Paste)**: ${typeACounts}\n`;
    section += `- 🟡 **Type B Fixes (Requires Adjustments)**: ${typeBCounts}\n\n`;
    
    if (typeBCounts > 0) {
      section += `> ⚠️ **Note**: Type B fixes require updating all function callers. See individual fix details for migration steps.\n`;
    }
    
    return section;
  }
  
  private isTypeB(item: any): boolean {
    // Simple heuristic - check for signature changes
    const title = item.issue.title.toLowerCase();
    const desc = (item.issue.description || '').toLowerCase();
    
    return title.includes('sql') || 
           title.includes('injection') ||
           title.includes('parameter') ||
           title.includes('async') ||
           desc.includes('signature') ||
           desc.includes('breaking');
  }
  
  protected formatFixSuggestion(issue: any, fix: any): string {
    const isTypeB = this.isTypeB({ issue, fixSuggestion: fix });
    
    let content = '\n### 💡 Fix Suggestion\n\n';
    
    if (isTypeB) {
      content += '#### 🟡 Type B Fix - Requires Adjustments\n';
      content += '*This fix may change the function signature or behavior. Update all callers accordingly.*\n\n';
      content += '**Migration Steps:**\n';
      content += '1. Apply the fix below\n';
      content += '2. Search for all calls to this function\n';
      content += '3. Update parameters/await calls as needed\n';
      content += '4. Test all affected code paths\n\n';
    } else {
      content += '#### 🟢 Type A Fix - Direct Copy-Paste\n';
      content += '*This fix maintains the same function signature. Safe to apply directly.*\n\n';
    }
    
    if (fix.fixedCode) {
      content += '**Fixed Code:**\n';
      content += '```javascript\n';
      content += fix.fixedCode + '\n';
      content += '```\n';
    }
    
    if (fix.explanation) {
      content += `\n**Explanation:** ${fix.explanation}\n`;
    }
    
    content += `\n**Confidence:** ${fix.confidence || 'Medium'} | `;
    content += `**Estimated Time:** ${fix.estimatedMinutes || (isTypeB ? 30 : 10)} minutes\n`;
    
    return content;
  }
}

// Mock analysis result for testing
const mockResult = {
  repositoryUrl: 'https://github.com/sindresorhus/ky',
  prNumber: 700,
  metadata: {
    prTitle: 'Add retry logic with exponential backoff',
    prAuthor: 'contributor',
    filesChanged: 8,
    additions: 245,
    deletions: 67
  },
  summary: {
    totalIssues: 12,
    criticalCount: 2,
    highCount: 3,
    mediumCount: 4,
    lowCount: 3,
    newIssues: 5,
    fixedIssues: 2,
    unchangedIssues: 5
  },
  categorized: {
    newIssues: [
      {
        issue: {
          title: 'Missing null check in retry handler',
          severity: 'high',
          category: 'bug',
          location: { file: 'source/retry.ts', line: 45 },
          description: 'Options object accessed without null check'
        },
        codeSnippet: `function handleRetry(options, attempt) {
  return options.retryLimit > attempt;
}`,
        fixSuggestion: {
          fixedCode: `function handleRetry(options, attempt) {
  if (!options) return false;
  return options.retryLimit > attempt;
}`,
          explanation: 'Add null check to prevent runtime errors',
          confidence: 'high',
          estimatedMinutes: 5
        }
      },
      {
        issue: {
          title: 'Potential SQL injection in query builder',
          severity: 'critical',
          category: 'security',
          location: { file: 'source/db.ts', line: 102 },
          description: 'Direct string concatenation in SQL query'
        },
        codeSnippet: `function buildQuery(table, id) {
  return "SELECT * FROM " + table + " WHERE id = " + id;
}`,
        fixSuggestion: {
          fixedCode: `function buildQuery(table, id, connection) {
  return connection.query("SELECT * FROM ?? WHERE id = ?", [table, id]);
}`,
          explanation: 'Use parameterized queries to prevent SQL injection',
          confidence: 'high',
          estimatedMinutes: 25
        }
      },
      {
        issue: {
          title: 'Synchronous file operation blocking event loop',
          severity: 'high',
          category: 'performance',
          location: { file: 'source/cache.ts', line: 78 },
          description: 'Using readFileSync in async context'
        },
        codeSnippet: `function loadCache(path) {
  const data = fs.readFileSync(path, 'utf8');
  return JSON.parse(data);
}`,
        fixSuggestion: {
          fixedCode: `async function loadCache(path) {
  const data = await fs.promises.readFile(path, 'utf8');
  return JSON.parse(data);
}`,
          explanation: 'Convert to async to avoid blocking',
          confidence: 'high',
          estimatedMinutes: 20
        }
      }
    ],
    unchangedIssues: [
      {
        issue: {
          title: 'Vulnerability in third-party dependency `axios` `"axios": "^0.21.1"`',
          severity: 'high',
          category: 'dependency-vulnerability',
          location: { file: 'package.json', line: 15 },
          description: 'Known CVE-2021-45046 in axios version'
        },
        fixSuggestion: {
          fixedCode: '"axios": "^1.6.0"',
          explanation: 'Update to latest secure version',
          confidence: 'high',
          estimatedMinutes: 10
        }
      },
      {
        issue: {
          title: 'Vulnerability in third-party dependency `axios` `"axios": "^0.21.1"`',
          severity: 'high', 
          category: 'dependency-vulnerability',
          location: { file: 'package.json', line: 15 },
          description: 'Known CVE-2021-45046 in axios version'
        },
        fixSuggestion: {
          fixedCode: '"axios": "^1.6.0"',
          explanation: 'Update to latest secure version',
          confidence: 'high',
          estimatedMinutes: 10
        }
      },
      {
        issue: {
          title: 'Missing error handling in HTTP request',
          severity: 'medium',
          category: 'bug',
          location: { file: 'source/request.ts', line: 120 },
          description: 'No catch block for promise rejection'
        },
        fixSuggestion: {
          fixedCode: `fetch(url)
  .then(res => res.json())
  .catch(err => {
    console.error('Request failed:', err);
    throw new NetworkError(err);
  })`,
          explanation: 'Add proper error handling',
          confidence: 'medium',
          estimatedMinutes: 10
        }
      }
    ],
    fixedIssues: [
      {
        issue: {
          title: 'Memory leak in event listener',
          severity: 'medium',
          category: 'performance',
          location: { file: 'source/events.ts', line: 34 }
        }
      }
    ]
  }
};

async function generatePRReport() {
  console.log('📊 Generating Enhanced PR Analysis Report\n');
  console.log('Repository: sindresorhus/ky');
  console.log('PR: #700\n');
  
  const generator = new EnhancedReportGenerator();
  
  // Generate enhanced report
  const markdownReport = await generator.generateEnhancedReport(mockResult);
  
  // Save to file
  const filename = `PR-700-Analysis-Report-${new Date().toISOString().split('T')[0]}.md`;
  fs.writeFileSync(filename, markdownReport);
  
  console.log(`\n✅ Report saved to: ${filename}`);
  
  // Also output to console
  console.log('\n' + '='.repeat(60));
  console.log('REPORT PREVIEW:');
  console.log('='.repeat(60) + '\n');
  console.log(markdownReport);
}

// Run the report generation
generatePRReport().catch(console.error);