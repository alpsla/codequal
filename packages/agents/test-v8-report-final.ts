#!/usr/bin/env ts-node
/**
 * Generate V8 Report with All Fixes - Proper Format
 */

import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

async function generateProperV8Report() {
  console.log('🚀 Generating V8 Report with All Fixes Applied...\n');
  
  // Create the comparison result in the exact format the V8 generator expects
  // Based on the actual code, it expects mainBranch and prBranch with issues arrays
  const comparisonResult: any = {
    repositoryUrl: 'https://github.com/sindresorhus/ky',
    
    mainBranch: {
      name: 'main',
      issues: [
        {
          id: 'MAIN-HIGH-1',
          title: 'SQL Injection Vulnerability', 
          description: 'Direct string concatenation in SQL query allows injection attacks',
          severity: 'critical',
          category: 'security',
          type: 'vulnerability',
          location: { file: 'source/database/query.ts', line: 34 },
          codeSnippet: `const query = "SELECT * FROM users WHERE id = " + userId;`,
          suggestedFix: 'Use parameterized queries'
        },
        {
          id: 'MAIN-HIGH-2',
          title: 'Memory Leak in Event Listeners',
          description: 'Event listeners not properly cleaned up causing memory leaks',
          severity: 'high',
          category: 'performance',
          type: 'memory-leak',
          location: { file: 'source/events/manager.ts', line: 89 },
          codeSnippet: `element.addEventListener('click', handler);
// No removeEventListener in cleanup`,
          suggestedFix: 'Add proper cleanup in component unmount'
        }
      ],
      metrics: {
        totalIssues: 2,
        criticalIssues: 1,
        highIssues: 1,
        mediumIssues: 0,
        lowIssues: 0
      }
    },
    
    prBranch: {
      name: 'PR #700',
      issues: [
        {
          id: 'PR-HIGH-1',
          title: 'Missing Input Validation in Request Handler',
          description: 'User input is not properly validated before processing, could lead to injection attacks',
          severity: 'high',
          category: 'security',
          type: 'vulnerability',
          location: { file: 'source/core/request.ts', line: 145 },
          codeSnippet: `const processRequest = (userInput: any) => {
  // No validation here
  return fetch(userInput.url, userInput.options);
}`,
          suggestedFix: 'Implement schema validation using Zod or similar library',
          estimatedFixTime: 30
        },
        {
          id: 'PR-HIGH-2',
          title: 'Synchronous File Read Blocking Event Loop',
          description: 'Using fs.readFileSync in request handler blocks the event loop',
          severity: 'high',
          category: 'performance',
          type: 'bottleneck',
          location: { file: 'source/utils/config.ts', line: 23 },
          codeSnippet: `export function loadConfig() {
  const data = fs.readFileSync('./config.json', 'utf8');
  return JSON.parse(data);
}`,
          suggestedFix: 'Use fs.promises.readFile for async operation',
          estimatedFixTime: 15
        },
        {
          id: 'PR-MEDIUM-1',
          title: 'Redundant Code in Test Files',
          description: 'Duplicate test setup code across multiple test files',
          severity: 'medium',
          category: 'code-quality',
          type: 'duplication',
          file: 'test/helpers/setup.test.ts',
          line: 10,
          codeSnippet: `// This exact setup is repeated in 5 test files
beforeEach(() => {
  mockServer.reset();
  cache.clear();
  initializeTestEnvironment();
});`,
          suggestion: 'Extract to shared test utility function',
          estimatedFixTime: 20
        },
        {
          id: 'PR-HIGH-3',
          title: 'High Severity Issue in Test Mock',
          description: 'Test mock has potential race condition that could cause flaky tests',
          severity: 'high',
          category: 'testing',
          type: 'bug',
          file: 'test/mocks/server.test.ts',
          line: 45,
          codeSnippet: `// Race condition in mock server
let serverInstance;
async function startMockServer() {
  serverInstance = await createServer();
  // No await here causes race condition
  serverInstance.listen(3000);
}`,
          suggestion: 'Add proper async/await handling',
          estimatedFixTime: 10
        },
        {
          id: 'PR-LOW-1',
          title: 'Missing API Documentation',
          description: 'Public API methods lack JSDoc comments',
          severity: 'low',
          category: 'documentation',
          type: 'missing-docs',
          file: 'source/index.ts',
          line: 78,
          codeSnippet: `// No documentation
export function makeRequest(options: RequestOptions) {
  return internalRequest(options);
}`,
          suggestion: 'Add comprehensive JSDoc comments',
          estimatedFixTime: 15
        },
        {
          id: 'PR-MEDIUM-2',
          title: 'Complex Cyclomatic Complexity',
          description: 'Function has cyclomatic complexity of 15',
          severity: 'medium',
          category: 'code-quality',
          type: 'complexity',
          location: { file: 'source/core/parser.ts', line: 234 },
          codeSnippet: `function parseResponse(response: any) {
  // 15 different code paths here...
  if (response.type === 'json') {
    // ...
  } else if (response.type === 'xml') {
    // ...
  }
  // etc...
}`,
          suggestedFix: 'Refactor using strategy pattern',
          estimatedFixTime: 60
        }
      ],
      metrics: {
        totalIssues: 6,
        criticalIssues: 0,
        highIssues: 3,
        mediumIssues: 2,
        lowIssues: 1
      }
    },
    
    // Issues that were added in PR
    addedIssues: [
      {
        id: 'PR-HIGH-1',
        title: 'Missing Input Validation in Request Handler',
        description: 'User input is not properly validated before processing',
        severity: 'high',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'source/core/request.ts', line: 145 }
      },
      {
        id: 'PR-HIGH-2',
        title: 'Synchronous File Read Blocking Event Loop',
        description: 'Using fs.readFileSync blocks the event loop',
        severity: 'high',
        category: 'performance',
        type: 'bottleneck',
        location: { file: 'source/utils/config.ts', line: 23 }
      },
      {
        id: 'PR-HIGH-3',
        title: 'High Severity Issue in Test Mock',
        description: 'Test mock has potential race condition',
        severity: 'high',
        category: 'testing',
        type: 'bug',
        file: 'test/mocks/server.test.ts',
        line: 45
      },
      {
        id: 'PR-LOW-1',
        title: 'Missing API Documentation',
        description: 'Public API methods lack JSDoc comments',
        severity: 'low',
        category: 'documentation',
        type: 'missing-docs',
        file: 'source/index.ts',
        line: 78
      }
    ],
    
    // Issues that were fixed in PR
    fixedIssues: [
      {
        id: 'MAIN-HIGH-1',
        title: 'SQL Injection Vulnerability',
        description: 'Direct string concatenation in SQL query',
        severity: 'critical',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'source/database/query.ts', line: 34 }
      },
      {
        id: 'MAIN-HIGH-2',
        title: 'Memory Leak in Event Listeners',
        description: 'Event listeners not properly cleaned up',
        severity: 'high',
        category: 'performance',
        type: 'memory-leak',
        location: { file: 'source/events/manager.ts', line: 89 }
      }
    ],
    
    // Issues that persist
    persistentIssues: [
      {
        id: 'PR-MEDIUM-2',
        title: 'Complex Cyclomatic Complexity',
        description: 'Function has cyclomatic complexity of 15',
        severity: 'medium',
        category: 'code-quality',
        type: 'complexity',
        location: { file: 'source/core/parser.ts', line: 234 }
      }
    ]
  };
  
  try {
    // Generate the report
    const generator = new ReportGeneratorV8Final();
    const htmlReport = await generator.generateReport(comparisonResult);
    
    // Save the report
    const outputDir = path.join(__dirname, 'test-outputs', 'v8-fixed');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outputFile = path.join(outputDir, `v8-report-fixed-${timestamp}.html`);
    
    fs.writeFileSync(outputFile, htmlReport);
    
    console.log('✅ Report generated successfully!');
    console.log(`📁 Saved to: ${outputFile}`);
    
    // Open in browser
    exec(`open "${outputFile}"`, (err) => {
      if (err) console.error('Could not open browser:', err);
    });
    
    // Validate the report content
    console.log('\n📊 Report Validation:');
    
    // Check for test file adjustments
    const hasTestAdjustment = htmlReport.includes('Severity adjusted') || 
                             htmlReport.includes('test file') ||
                             htmlReport.includes('non-blocking');
    console.log(`✅ Test file severity adjusted: ${hasTestAdjustment}`);
    
    // Check for code snippets
    const hasCodeSnippets = htmlReport.includes('<pre>') || htmlReport.includes('```');
    console.log(`✅ Code snippets included: ${hasCodeSnippets}`);
    
    // Check for proper location format
    const hasProperLocations = !htmlReport.includes('Unknown location');
    console.log(`✅ Proper file locations: ${hasProperLocations}`);
    
    // Check for educational content
    const hasEducation = htmlReport.includes('Best Practices') || 
                        htmlReport.includes('Learning') ||
                        htmlReport.includes('Resources');
    console.log(`✅ Educational content included: ${hasEducation}`);
    
    // Check for impact fields
    const hasImpact = htmlReport.includes('Impact:') || htmlReport.includes('impact');
    console.log(`✅ Impact analysis included: ${hasImpact}`);
    
    // Check for file statistics
    const hasFileStats = htmlReport.includes('Files Analyzed');
    console.log(`✅ File statistics included: ${hasFileStats}`);
    
    // Check for model name (not "Dynamic Model Selection")
    const hasRealModel = !htmlReport.includes('Dynamic Model Selection Active');
    console.log(`✅ Real AI model name shown: ${hasRealModel}`);
    
    // Check for test coverage
    const hasTestCoverage = htmlReport.includes('Test Coverage') && 
                           !htmlReport.includes('Not measured');
    console.log(`✅ Test coverage calculated: ${hasTestCoverage}`);
    
    // Check for recommendations (not direct fixes)
    const hasRecommendations = htmlReport.includes('Recommend') || 
                              htmlReport.includes('suggest') ||
                              htmlReport.includes('Consider');
    console.log(`✅ Recommendations included: ${hasRecommendations}`);
    
    // Check for branch division
    const hasBranchDivision = htmlReport.includes('Main Branch') || 
                             htmlReport.includes('PR Branch') ||
                             htmlReport.includes('New Issues');
    console.log(`✅ Branch comparison shown: ${hasBranchDivision}`);
    
    console.log('\n🎉 V8 Report with all fixes has been generated and opened in your browser!');
    
  } catch (error) {
    console.error('❌ Error generating report:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the report generation
generateProperV8Report().catch(console.error);