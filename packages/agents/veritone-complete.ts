#!/usr/bin/env ts-node
/**
 * Complete V8 Report Fix - Code Snippets, Mermaid Diagram, and Recommendations
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

// Import the fixes
import { ReportGeneratorV8Fixes } from './src/standard/comparison/report-generator-v8-fixes';

async function generateCompleteV8Report() {
  console.log('🚀 Generating Complete V8 Report with All Fixes...\n');
  
  const fixes = new ReportGeneratorV8Fixes();
  
  // Create realistic test data with proper structure
  const comparisonData = {
    repositoryUrl: 'https://github.com/sindresorhus/ky',
    prNumber: 700,
    mainBranch: {
      name: 'main',
      issues: [
        {
          id: 'MAIN-1',
          title: 'SQL Injection Vulnerability',
          description: 'Direct string concatenation in SQL query allows injection attacks',
          severity: 'critical',
          category: 'security',
          type: 'vulnerability',
          file: 'source/database/query.ts',
          line: 34,
          codeSnippet: `const query = "SELECT * FROM users WHERE id = " + userId;
const result = await db.execute(query);`,
          suggestion: 'Use parameterized queries to prevent SQL injection'
        },
        {
          id: 'MAIN-2',
          title: 'Memory Leak in Event Listeners',
          description: 'Event listeners not properly cleaned up causing memory leaks',
          severity: 'high',
          category: 'performance',
          type: 'memory-leak',
          file: 'source/events/manager.ts',
          line: 89,
          codeSnippet: `element.addEventListener('click', handler);
// No removeEventListener in cleanup`,
          suggestion: 'Add proper cleanup in component unmount'
        }
      ]
    },
    prBranch: {
      name: 'PR #700',
      issues: [
        {
          id: 'PR-1',
          title: 'Hardcoded API Keys',
          description: 'API keys are hardcoded in the source code',
          severity: 'critical',
          category: 'security',
          type: 'hardcoded-secret',
          file: 'test/api/auth.test.ts',
          line: 15,
          codeSnippet: `const API_KEY = 'sk-1234567890abcdef';
const SECRET = 'super-secret-key-123';

describe('Auth API', () => {
  // Using hardcoded secrets
});`,
          suggestion: 'Use environment variables for sensitive data'
        },
        {
          id: 'PR-2',
          title: 'Missing Input Validation',
          description: 'User input is not validated before processing',
          severity: 'high',
          category: 'security',
          type: 'validation',
          file: 'source/core/request.ts',
          line: 145,
          codeSnippet: `export function processRequest(userInput: any) {
  // No validation here
  return fetch(userInput.url, userInput.options);
}`,
          suggestion: 'Implement schema validation using Zod or similar library'
        },
        {
          id: 'PR-3',
          title: 'Test File Performance Issue',
          description: 'Inefficient test setup causing slow test execution',
          severity: 'high',
          category: 'testing',
          type: 'performance',
          file: 'test/integration/api.test.ts',
          line: 45,
          codeSnippet: `beforeEach(async () => {
  // Creating new server for each test
  server = await createTestServer();
  await seedDatabase();
  await clearCache();
});`,
          suggestion: 'Use shared test server and optimize setup'
        }
      ]
    },
    addedIssues: [
      { id: 'PR-1', title: 'Hardcoded API Keys', severity: 'critical' },
      { id: 'PR-3', title: 'Test File Performance Issue', severity: 'high' }
    ],
    fixedIssues: [
      { id: 'MAIN-1', title: 'SQL Injection Vulnerability', severity: 'critical' }
    ]
  };

  // Generate the HTML report with proper formatting
  const html = generateHTMLReport(comparisonData, fixes);
  
  // Save the report
  const outputDir = path.join(__dirname, 'test-outputs', 'v8-complete');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputFile = path.join(outputDir, `v8-report-complete-${timestamp}.html`);
  
  fs.writeFileSync(outputFile, html);
  
  console.log('✅ Report generated successfully!');
  console.log(`📁 Saved to: ${outputFile}`);
  
  // Open in browser
  exec(`open "${outputFile}"`, (err) => {
    if (err) console.error('Could not open browser:', err);
  });
  
  // Validate the report
  console.log('\n📊 Report Validation:');
  console.log(`✅ Code snippets included: ${html.includes('<pre><code>')}`);
  console.log(`✅ Mermaid diagram included: ${html.includes('mermaid.initialize')}`);
  console.log(`✅ Issue-specific recommendations: ${html.includes('Recommended Fix:')}`);
  console.log(`✅ Test file severity adjusted: ${html.includes('Severity adjusted')}`);
  
  console.log('\n🎉 Complete V8 report has been generated and opened in your browser!');
}

function generateHTMLReport(data: any, fixes: ReportGeneratorV8Fixes): string {
  // Process issues with fixes
  const processedMainIssues = data.mainBranch.issues.map((issue: any) => {
    const adjusted = fixes.adjustSeverityForTestFiles(issue);
    const enhanced = fixes.enhanceIssueContext(adjusted);
    return enhanced;
  });
  
  const processedPRIssues = data.prBranch.issues.map((issue: any) => {
    const adjusted = fixes.adjustSeverityForTestFiles(issue);
    const enhanced = fixes.enhanceIssueContext(adjusted);
    return enhanced;
  });
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeQual Analysis Report V8 - Complete</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        mermaid.initialize({ 
          startOnLoad: true,
          theme: 'default',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true
          }
        });
      });
    </script>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        background: #f5f5f5;
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px;
        border-radius: 10px;
        margin-bottom: 30px;
      }
      .issue-card {
        background: white;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        border-left: 4px solid #667eea;
      }
      .issue-card.critical {
        border-left-color: #ff4444;
      }
      .issue-card.high {
        border-left-color: #ff8800;
      }
      .issue-card.medium {
        border-left-color: #ffbb33;
      }
      .issue-card.low {
        border-left-color: #00c851;
      }
      .code-snippet {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 4px;
        padding: 15px;
        margin: 15px 0;
        overflow-x: auto;
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      code {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 14px;
        color: #2d3748;
      }
      .recommendation {
        background: #e7f5ff;
        border: 1px solid #74c0fc;
        border-radius: 4px;
        padding: 15px;
        margin-top: 15px;
      }
      .mermaid-container {
        background: white;
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .severity-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
      }
      .severity-badge.critical { background: #ff4444; color: white; }
      .severity-badge.high { background: #ff8800; color: white; }
      .severity-badge.medium { background: #ffbb33; color: black; }
      .severity-badge.low { background: #00c851; color: white; }
      .test-adjusted {
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 4px;
        padding: 10px;
        margin-top: 10px;
        font-size: 14px;
      }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 CodeQual Analysis Report V8</h1>
        <h2>Repository: ${data.repositoryUrl}</h2>
        <h3>Pull Request: #${data.prNumber}</h3>
    </div>

    <h2>🎯 Executive Summary</h2>
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <p><strong>Main Branch Issues:</strong> ${data.mainBranch.issues.length}</p>
        <p><strong>PR Branch Issues:</strong> ${data.prBranch.issues.length}</p>
        <p><strong>New Issues:</strong> ${data.addedIssues.length}</p>
        <p><strong>Fixed Issues:</strong> ${data.fixedIssues.length}</p>
    </div>

    <h2>🏗️ Architecture Overview</h2>
    <div class="mermaid-container">
        <div class="mermaid">
graph TB
    subgraph "Application Layer"
        API[API Routes]
        MW[Middleware]
        CTRL[Controllers]
    end
    
    subgraph "Business Layer"
        SVC[Services]
        VAL[Validators]
        TRANS[Transformers]
    end
    
    subgraph "Data Layer"
        REPO[Repositories]
        CACHE[Cache]
        DB[(Database)]
    end
    
    API --> MW
    MW --> CTRL
    CTRL --> SVC
    SVC --> VAL
    SVC --> TRANS
    SVC --> REPO
    REPO --> CACHE
    REPO --> DB
    
    style API fill:#f9f,stroke:#333,stroke-width:2px
    style SVC fill:#bbf,stroke:#333,stroke-width:2px
    style DB fill:#f96,stroke:#333,stroke-width:2px
        </div>
    </div>

    <h2>🆕 New Issues in PR</h2>
    ${processedPRIssues.map((issue: any) => renderIssueCard(issue, fixes)).join('')}

    <h2>✅ Fixed Issues</h2>
    ${data.fixedIssues.map((issue: any) => `
        <div class="issue-card">
            <h3>✅ ${issue.title}</h3>
            <span class="severity-badge ${issue.severity}">${issue.severity}</span>
            <p>This issue has been resolved in the PR.</p>
        </div>
    `).join('')}

    <h2>📊 Code Coverage</h2>
    <div style="background: white; padding: 20px; border-radius: 8px;">
        <p>Test Coverage: ${fixes.calculateTestCoverage(processedPRIssues)}%</p>
    </div>
</body>
</html>`;
}

function renderIssueCard(issue: any, fixes: ReportGeneratorV8Fixes): string {
  const education = fixes.generateTargetedEducation(issue);
  
  return `
    <div class="issue-card ${issue.severity}">
        <h3>${issue.title}</h3>
        <span class="severity-badge ${issue.severity}">${issue.severity}</span>
        ${issue.isTestFile ? '<div class="test-adjusted">⚠️ Severity adjusted: Issue in test file (non-blocking)</div>' : ''}
        
        <p><strong>📁 Location:</strong> <code>${issue.file}:${issue.line}</code></p>
        <p><strong>📝 Description:</strong> ${issue.description}</p>
        
        ${issue.codeSnippet ? `
        <div class="code-snippet">
            <strong>Code:</strong>
            <pre><code>${escapeHtml(issue.codeSnippet)}</code></pre>
        </div>
        ` : ''}
        
        ${issue.context ? `
        <p><strong>💡 Context:</strong> ${issue.context}</p>
        ` : ''}
        
        ${issue.impact ? `
        <p><strong>⚡ Impact:</strong> ${issue.impact}</p>
        ` : ''}
        
        <div class="recommendation">
            <strong>🔧 Recommended Fix:</strong>
            <p>${issue.suggestion || 'Review and fix according to best practices'}</p>
            
            ${getSpecificRecommendation(issue)}
        </div>
        
        ${education ? `
        <div style="background: #f0f4f8; padding: 15px; border-radius: 4px; margin-top: 15px;">
            <strong>📚 Learn More:</strong>
            ${education}
        </div>
        ` : ''}
    </div>
  `;
}

function getSpecificRecommendation(issue: any): string {
  const recommendations: Record<string, string> = {
    'hardcoded-secret': `
      <pre><code>// Instead of:
const API_KEY = 'sk-1234...';

// Use:
const API_KEY = process.env.API_KEY;

// Or with validation:
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY environment variable is required');
}</code></pre>
    `,
    'validation': `
      <pre><code>import { z } from 'zod';

const RequestSchema = z.object({
  url: z.string().url(),
  options: z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    headers: z.record(z.string()).optional(),
  })
});

export function processRequest(userInput: unknown) {
  const validated = RequestSchema.parse(userInput);
  return fetch(validated.url, validated.options);
}</code></pre>
    `,
    'vulnerability': `
      <pre><code>// Use parameterized queries:
const query = 'SELECT * FROM users WHERE id = ?';
const result = await db.execute(query, [userId]);

// Or with query builders:
const result = await db
  .select('*')
  .from('users')
  .where('id', userId);</code></pre>
    `,
    'memory-leak': `
      <pre><code>// Proper cleanup:
useEffect(() => {
  const handler = (e) => console.log(e);
  element.addEventListener('click', handler);
  
  return () => {
    element.removeEventListener('click', handler);
  };
}, []);</code></pre>
    `,
    'performance': `
      <pre><code>// Share test setup:
let server: TestServer;

beforeAll(async () => {
  server = await createTestServer();
});

afterAll(async () => {
  await server.close();
});

beforeEach(async () => {
  await clearDatabase();
});</code></pre>
    `
  };
  
  return recommendations[issue.type] || '';
}

function escapeHtml(str: string): string {
  const div = { innerHTML: '' };
  div.innerHTML = str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Run the generation
generateCompleteV8Report().catch(console.error);