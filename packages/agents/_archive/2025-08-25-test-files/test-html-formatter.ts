#!/usr/bin/env npx ts-node

/**
 * Quick test for HTML formatter
 */

import { HTMLIssueFormatter } from './src/standard/comparison/html-issue-formatter';
import * as fs from 'fs';
import * as path from 'path';

const formatter = new HTMLIssueFormatter();

// Sample issues
const issues = [
  {
    id: 'sec-1',
    severity: 'critical',
    title: 'SQL Injection Vulnerability',
    description: 'User input is directly concatenated into SQL queries without proper sanitization.',
    location: { file: 'src/database/queries.ts', line: 45 },
    category: 'security',
    type: 'SQL Injection',
    impact: 'Attackers could execute arbitrary SQL commands and access sensitive data.',
    recommendation: 'Use parameterized queries or prepared statements to prevent SQL injection.'
  },
  {
    id: 'perf-1',
    severity: 'high',
    title: 'N+1 Query Problem',
    description: 'Multiple database queries are executed in a loop, causing performance degradation.',
    location: { file: 'src/api/users.ts', line: 123 },
    category: 'performance',
    type: 'Database',
    codeSnippet: 'users.forEach(user => db.query(`SELECT * FROM orders WHERE user_id = ${user.id}`))'
  },
  {
    id: 'quality-1',
    severity: 'medium',
    title: 'Unused Variables',
    description: 'Several variables are declared but never used in the codebase.',
    location: { file: 'src/utils/helpers.ts', line: 15 },
    category: 'code-quality',
    type: 'Dead Code'
  }
];

// Generate HTML report
const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML Formatter Test</title>
    ${formatter.getStyles()}
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 2rem;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-bottom: 2rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 CodeQual Issue Report - HTML Formatter Test</h1>
        
        ${formatter.formatIssueSection('Critical Issues', issues.filter(i => i.severity === 'critical'), 'critical-issues')}
        ${formatter.formatIssueSection('High Priority Issues', issues.filter(i => i.severity === 'high'), 'high-issues')}
        ${formatter.formatIssueSection('Medium Priority Issues', issues.filter(i => i.severity === 'medium'), 'medium-issues')}
    </div>
</body>
</html>`;

// Save HTML file
const outputPath = path.join(process.cwd(), 'test-reports', 'html-formatter-test.html');
fs.writeFileSync(outputPath, html);

console.log(`✅ HTML test report generated: ${outputPath}`);
console.log('📂 Opening in browser...');

// Open in browser
import { exec } from 'child_process';
exec(`open "${outputPath}"`);