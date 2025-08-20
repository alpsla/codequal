#!/usr/bin/env ts-node

/**
 * V8 Report Generator Test with Real DeepWiki Data
 * 
 * This test uses the actual DeepWiki response data you provided to ensure
 * all issues are properly displayed in the V8 report.
 * 
 * Usage:
 *   npm run build
 *   npx ts-node test-v8-with-real-deepwiki-data.ts
 */

import { ReportGeneratorV8Final } from './dist/standard/comparison/report-generator-v8-final';
import { ComparisonResult, Issue } from './dist/standard/types/analysis-types';
import * as fs from 'fs';
import * as path from 'path';

// Load the real DeepWiki data from your debug files
function loadRealDeepWikiData(): { prIssues: any[], mainIssues: any[] } {
  try {
    // Load PR branch issues
    const prRawData = fs.readFileSync('./debug-pr-issues.json', 'utf-8');
    const prIssues = JSON.parse(prRawData);
    
    // Load main branch issues  
    const mainRawData = fs.readFileSync('./debug-main-issues.json', 'utf-8');
    const mainIssues = JSON.parse(mainRawData);
    
    return { prIssues, mainIssues };
  } catch (error) {
    console.log('⚠️ Could not load debug files, using inline data');
    // Fallback to inline data from your system reminders
    return {
      prIssues: [
        {
          title: "Potential security vulnerability in dependency",
          severity: "high",
          category: "dependencies",
          file: "package.json",
          line: 1,
          impact: "Using outdated dependencies can expose the application to known vulnerabilities.",
          codeSnippet: "See outdated dependencies list.",
          fix: "Update dependencies to their latest stable versions.",
          recommendation: "Regularly audit dependencies using tools like npm audit."
        },
        {
          title: "Insecure HTTP method exposure",
          severity: "medium",
          category: "security",
          file: "test/main.ts",
          line: 10,
          impact: "Exposing HTTP methods can lead to unwanted actions on the server.",
          codeSnippet: "server.get('/', ...);",
          fix: "Limit exposed methods to only those necessary.",
          recommendation: "Review and restrict HTTP methods in the server configuration."
        },
        {
          title: "Inefficient data processing",
          severity: "medium",
          category: "performance",
          file: "test/stream.ts",
          line: 50,
          impact: "Excessive memory usage due to large data processing.",
          codeSnippet: "data.push(progress);",
          fix: "Use a more efficient data structure or processing method.",
          recommendation: "Consider streaming data instead of buffering it all at once."
        },
        {
          title: "Missing error handling",
          severity: "high",
          category: "code-quality",
          file: "test/fetch.ts",
          line: 25,
          impact: "Uncaught exceptions may crash the application.",
          codeSnippet: "return new Response(input.url);",
          fix: "Add try-catch blocks around asynchronous code.",
          recommendation: "Implement comprehensive error handling throughout the application."
        },
        {
          title: "Potential memory leak",
          severity: "high",
          category: "performance",
          file: "test/memory-leak.ts",
          line: 10,
          impact: "Excessive memory usage can lead to application crashes.",
          codeSnippet: "const detector = new LeakDetector(url);",
          fix: "Ensure proper cleanup of resources.",
          recommendation: "Review memory management practices."
        },
        {
          title: "Lack of unit tests for critical functions",
          severity: "high",
          category: "code-quality",
          file: "source/index.ts",
          line: 1,
          impact: "Increased risk of bugs in production.",
          codeSnippet: "function criticalFunction() {...}",
          fix: "Add unit tests to cover critical functions.",
          recommendation: "Implement a test-driven development approach."
        },
        {
          title: "Circular dependency detected",
          severity: "medium",
          category: "architecture",
          file: "source/index.ts",
          line: 20,
          impact: "Can lead to unpredictable behavior and difficulty in debugging.",
          codeSnippet: "import { ... } from 'anotherModule';",
          fix: "Refactor code to eliminate circular dependencies.",
          recommendation: "Analyze module dependencies and restructure as needed."
        },
        {
          title: "High cyclomatic complexity",
          severity: "medium",
          category: "code-quality",
          file: "source/core/constants.ts",
          line: 30,
          impact: "Difficult to understand and maintain.",
          codeSnippet: "if (condition1 && condition2 || condition3) {...}",
          fix: "Break down complex functions into smaller, simpler ones.",
          recommendation: "Refactor to improve maintainability."
        },
        {
          title: "Inefficient looping mechanism",
          severity: "medium",
          category: "performance",
          file: "test/stream.ts",
          line: 40,
          impact: "Performance degradation in larger datasets.",
          codeSnippet: "for (let i = 0; i < data.length; i++) {...}",
          fix: "Consider using array methods like forEach or map.",
          recommendation: "Optimize loops for better performance."
        }
      ],
      mainIssues: [
        {
          title: "Potential XSS vulnerability in user-input handling",
          severity: "high",
          category: "security",
          file: "test/main.ts",
          line: 30,
          impact: "User input is not sanitized, potentially allowing XSS attacks.",
          codeSnippet: "t.is(await ky(server.url).text(), 'GET');",
          fix: "Implement input sanitization before processing.",
          recommendation: "Use libraries like DOMPurify to sanitize user input."
        },
        {
          title: "Potential memory leak in HTTP server setup",
          severity: "high",
          category: "performance",
          file: "test/helpers/index.ts",
          line: 15,
          impact: "Improper handling of server connections may lead to memory leaks.",
          codeSnippet: "server.get('/', (request, response) => { response.end(); });",
          fix: "Ensure proper cleanup of server resources.",
          recommendation: "Use 'server.close()' to release resources."
        },
        {
          title: "Improper retry logic in network requests",
          severity: "high",
          category: "performance",
          file: "test/retry.ts",
          line: 25,
          impact: "Inefficient retry logic may lead to excessive network calls.",
          codeSnippet: "await t.throwsAsync(ky(server.url, { retry: { limit: 0 } }).text(), { message: /Request Timeout/ });",
          fix: "Implement exponential backoff strategy for retries.",
          recommendation: "Use libraries like 'axios-retry' for better handling."
        },
        {
          title: "Missing input validation in request handlers",
          severity: "high",
          category: "security",
          file: "test/main.ts",
          line: 15,
          impact: "Unvalidated input can lead to various attacks.",
          codeSnippet: "const { ok } = await ky(server.url);",
          fix: "Add validation checks for incoming requests.",
          recommendation: "Use libraries like 'joi' for schema validation."
        }
      ]
    };
  }
}

// Convert raw DeepWiki issues to our Issue format
function convertToIssues(rawIssues: any[]): Issue[] {
  return rawIssues.map((issue, index) => ({
    id: `issue-${index + 1}`,
    type: mapCategoryToType(issue.category) as any,
    category: issue.category as any,
    severity: issue.severity as any,
    message: issue.title,
    description: issue.impact,
    suggestedFix: issue.fix,
    location: {
      file: issue.file,
      line: issue.line
    }
  }));
}

function mapCategoryToType(category: string): 'vulnerability' | 'bug' | 'code-smell' | 'optimization' | 'design-issue' {
  const mapping: Record<string, 'vulnerability' | 'bug' | 'code-smell' | 'optimization' | 'design-issue'> = {
    'security': 'vulnerability',
    'performance': 'optimization',
    'code-quality': 'code-smell',
    'dependencies': 'vulnerability',
    'architecture': 'design-issue',
    'documentation': 'code-smell'
  };
  return mapping[category] || 'code-smell';
}

// Determine which issues are new, resolved, or unchanged
function compareIssues(prIssues: Issue[], mainIssues: Issue[]): ComparisonResult {
  // Find new issues (in PR but not in main)
  const newIssues = prIssues.filter(prIssue => 
    !mainIssues.some(mainIssue => 
      mainIssue.location?.file === prIssue.location?.file &&
      mainIssue.location?.line === prIssue.location?.line &&
      mainIssue.message === prIssue.message
    )
  );

  // Find resolved issues (in main but not in PR)
  const resolvedIssues = mainIssues.filter(mainIssue =>
    !prIssues.some(prIssue =>
      prIssue.location?.file === mainIssue.location?.file &&
      prIssue.location?.line === mainIssue.location?.line &&
      prIssue.message === mainIssue.message
    )
  );

  // Find unchanged issues (in both)
  const unchangedIssues = prIssues.filter(prIssue =>
    mainIssues.some(mainIssue =>
      mainIssue.location?.file === prIssue.location?.file &&
      mainIssue.location?.line === prIssue.location?.line &&
      mainIssue.message === prIssue.message
    )
  );

  // Calculate summary
  const allCurrentIssues = [...newIssues, ...unchangedIssues];
  const summary = {
    totalIssues: allCurrentIssues.length,
    criticalIssues: allCurrentIssues.filter(i => i.severity === 'critical').length,
    highIssues: allCurrentIssues.filter(i => i.severity === 'high').length,
    mediumIssues: allCurrentIssues.filter(i => i.severity === 'medium').length,
    lowIssues: allCurrentIssues.filter(i => i.severity === 'low').length,
    resolvedIssues: resolvedIssues.length,
    overallScore: calculateScore(allCurrentIssues)
  };

  return {
    newIssues,
    resolvedIssues,
    unchangedIssues,
    summary,
    success: true
  };
}

function calculateScore(issues: Issue[]): number {
  let score = 100;
  issues.forEach(issue => {
    switch(issue.severity) {
      case 'critical': score -= 20; break;
      case 'high': score -= 10; break;
      case 'medium': score -= 5; break;
      case 'low': score -= 2; break;
    }
  });
  return Math.max(0, score);
}

async function generateReportWithRealData() {
  console.log('🔍 V8 Report Generator Test with Real DeepWiki Data\n');
  console.log('=' .repeat(70));
  
  // Load real data
  const { prIssues: rawPrIssues, mainIssues: rawMainIssues } = loadRealDeepWikiData();
  
  console.log(`📊 Loaded Data:`);
  console.log(`- PR Branch Issues: ${rawPrIssues.length}`);
  console.log(`- Main Branch Issues: ${rawMainIssues.length}\n`);
  
  // Convert to our format
  const prIssues = convertToIssues(rawPrIssues);
  const mainIssues = convertToIssues(rawMainIssues);
  
  // Compare issues
  const comparison = compareIssues(prIssues, mainIssues);
  
  // Add metadata
  (comparison as any).duration = 23.5;
  (comparison as any).scanDuration = '23.5s';
  (comparison as any).modelUsed = 'gpt-4-turbo';
  (comparison as any).prMetadata = {
    number: 700,
    title: 'Feature: Add retry mechanism with exponential backoff',
    author: 'sindresorhus',
    branch: 'feature/retry-mechanism',
    targetBranch: 'main',
    filesChanged: 15,
    additions: 450,
    deletions: 120,
    testCoverage: 75
  };
  (comparison as any).dependencies = [
    { name: 'typescript', version: '^5.5.4', isOutdated: true, latest: '^5.6.0' },
    { name: 'express', version: '4.17.1', isOutdated: false },
    { name: 'axios', version: '0.27.2', isOutdated: false }
  ];
  (comparison as any).testCoverage = {
    overall: 75,
    byCategory: {
      unit: 80,
      integration: 60,
      e2e: 40
    }
  };
  
  console.log('📈 Issue Analysis:');
  console.log(`- New Issues: ${comparison.newIssues.length}`);
  console.log(`- Resolved Issues: ${comparison.resolvedIssues.length}`);
  console.log(`- Unchanged Issues: ${comparison.unchangedIssues.length}`);
  console.log(`- Quality Score: ${comparison.summary.overallScore}/100`);
  console.log(`- Decision: ${comparison.summary.overallScore >= 70 ? 'APPROVED ✅' : 'DECLINED ❌'}\n`);
  
  // Generate V8 report
  const generator = new ReportGeneratorV8Final();
  const report = generator.generateReport(comparison, {
    format: 'html',
    includeEducation: true,
    includeArchitectureDiagram: true,
    includeSkillTracking: true,
    includeBusinessMetrics: true,
    includeAIIDESection: true
  });
  
  // Save report
  const outputDir = path.join(__dirname, 'v8-real-data-reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const outputPath = path.join(outputDir, `real-deepwiki-data-${timestamp}.html`);
  fs.writeFileSync(outputPath, report);
  
  // Validate key features
  console.log('✅ Validation Results:\n');
  
  const validations = [
    { 
      name: 'All PR issues displayed',
      check: () => {
        let found = 0;
        rawPrIssues.forEach(issue => {
          if (report.includes(issue.file) && report.includes(`:${issue.line}`)) {
            found++;
          }
        });
        return found === rawPrIssues.length;
      }
    },
    {
      name: 'Issue locations shown',
      check: () => report.includes('.ts:') && report.includes('.json:')
    },
    {
      name: 'Code snippets included',
      check: () => report.includes('```typescript') || report.includes('// File:')
    },
    {
      name: 'Dependencies analysis',
      check: () => report.includes('Dependencies') && report.includes('typescript')
    },
    {
      name: 'Test coverage shown',
      check: () => report.includes('75%') || report.includes('Test Coverage')
    },
    {
      name: 'PR metadata complete',
      check: () => report.includes('sindresorhus') && report.includes('retry-mechanism')
    }
  ];
  
  validations.forEach(v => {
    const passed = v.check();
    console.log(`${passed ? '✅' : '❌'} ${v.name}`);
  });
  
  console.log('\n' + '=' .repeat(70));
  console.log(`📁 Report Location: ${outputPath}`);
  console.log('🌐 Open in browser to verify all issues are displayed correctly');
  console.log('\n💡 If issues are missing, check:');
  console.log('1. Issue parsing in ComparisonAgent');
  console.log('2. DeepWiki response parsing');
  console.log('3. Issue deduplication logic');
}

// Run the test
generateReportWithRealData().catch(console.error);