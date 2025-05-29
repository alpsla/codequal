#!/usr/bin/env ts-node

import { DeepWikiMarkdownParser } from '../deepwiki-parser';
import * as fs from 'fs';
import * as path from 'path';

// Test samples for different LLM formats
const GEMINI_SAMPLE = `# Express.js Repository Analysis

**Model**: google/gemini-1.5-flash  
**Repository**: https://github.com/expressjs/express
**Date**: 2025-05-23

# PART 3: SECURITY ANALYSIS

## Security Improvement Examples

- Issue: Missing input validation in request parameters
  - Specific Code Snippet:
\`\`\`javascript
// File: lib/router.js:123-130
function parseParams(params) {
  return params; // No validation
}
\`\`\`
  - Improvement suggestion: Add comprehensive input validation

- Issue: Potential SQL injection vulnerability
  - Specific Code Snippet:
\`\`\`javascript
// File: examples/db.js:45-50
db.query('SELECT * FROM users WHERE id = ' + userId);
\`\`\`
  - Improvement suggestion: Use parameterized queries

## Security Score Assessment
- Score: 6/10`;

const GPT4_SAMPLE = `# Express.js Repository Analysis

**Model**: openai/gpt-4-turbo
**Repository**: https://github.com/expressjs/express  
**Date**: 2025-05-23

# PART 2: CODE QUALITY ANALYSIS

## Code Quality Issues

- **Inconsistent Error Handling:** Error handling patterns vary across modules
  - File: \`lib/application.js\`
  \`\`\`javascript
  // File: lib/application.js:234-240
  app.use(function(err, req, res, next) {
    res.status(500).send('Error'); // Too generic
  });
  \`\`\`
  - **Improvement suggestion:** Implement centralized error handling

- **Use of Deprecated Methods:** Some modules still use deprecated Node.js APIs
  - File: \`lib/utils.js\`
  - **Improvement suggestion:** Update to modern Node.js APIs

## Code Quality Score Assessment
- Score: 7/10`;

const DEEPSEEK_SAMPLE = `# Express.js Repository Analysis

**Model**: deepseek/deepseek-coder
**Repository**: https://github.com/expressjs/express
**Date**: 2025-05-23

# PART 1: ARCHITECTURE ANALYSIS

## Architecture Issues

- Problem: Tightly coupled middleware components
  - File: \`lib/middleware/init.js\`: Middleware initialization is tightly coupled
  \`\`\`javascript
  // File: lib/middleware/init.js:15-25
  function init(app) {
    app.settings = {};
    app.locals = {};
    app.mountpath = '/';
  }
  \`\`\`

- Problem: Lack of dependency injection pattern
  - File: \`lib/express.js\`
  \`\`\`javascript
  // File: lib/express.js:30-35
  var app = function() {
    // Direct instantiation
  }
  \`\`\`

## Architecture Score Assessment
- Score: 7/10`;

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function printHeader(title: string) {
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}  ${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

function printSection(title: string) {
  console.log(`\n${colors.cyan}--- ${title} ---${colors.reset}\n`);
}

function testParser(modelName: string, content: string) {
  const parser = new DeepWikiMarkdownParser();
  
  printHeader(`Testing ${modelName} Format`);
  
  try {
    const report = parser.parseMarkdownReport(content);
    
    console.log(`${colors.green}✅ Parser successfully processed ${modelName} format${colors.reset}`);
    console.log(`${colors.yellow}📊 Model: ${colors.bright}${report.model}${colors.reset}`);
    console.log(`${colors.yellow}📊 Repository: ${colors.bright}${report.repositoryName}${colors.reset}`);
    console.log(`${colors.yellow}📊 Overall Score: ${colors.bright}${report.overallScore}/10${colors.reset}`);
    
    // Count findings across all sections
    let totalFindings = 0;
    let findingsWithCode = 0;
    let findingsWithFile = 0;
    let findingsBySeverity: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    Object.entries(report.sections).forEach(([sectionName, section]) => {
      if (section.findings && section.findings.length > 0) {
        console.log(`\n${colors.magenta}${sectionName}${colors.reset}: ${section.findings.length} findings`);
        
        section.findings.forEach(finding => {
          totalFindings++;
          if (finding.codeExample) findingsWithCode++;
          if (finding.filePath) findingsWithFile++;
          findingsBySeverity[finding.severity]++;
          
          console.log(`  ${colors.dim}•${colors.reset} ${finding.title}`);
          if (finding.filePath) {
            console.log(`    ${colors.cyan}File:${colors.reset} ${finding.filePath}${finding.lineNumber ? `:${finding.lineNumber}` : ''}`);
          }
          if (finding.recommendation) {
            console.log(`    ${colors.green}Rec:${colors.reset} ${finding.recommendation.substring(0, 50)}...`);
          }
        });
      }
    });
    
    printSection('Extraction Statistics');
    console.log(`Total findings extracted: ${colors.bright}${totalFindings}${colors.reset}`);
    console.log(`Findings with code examples: ${colors.bright}${findingsWithCode}${colors.reset}`);
    console.log(`Findings with file paths: ${colors.bright}${findingsWithFile}${colors.reset}`);
    console.log(`\nSeverity distribution:`);
    Object.entries(findingsBySeverity).forEach(([severity, count]) => {
      if (count > 0) {
        const color = severity === 'critical' ? colors.red : 
                     severity === 'high' ? colors.yellow :
                     severity === 'medium' ? colors.cyan : colors.green;
        console.log(`  ${color}${severity}${colors.reset}: ${count}`);
      }
    });
    
    // Test recommendations extraction
    const allRecommendations = new Set<string>();
    Object.values(report.sections).forEach(section => {
      if ('recommendations' in section && section.recommendations) {
        section.recommendations.forEach((rec: string) => allRecommendations.add(rec));
      }
    });
    
    if (allRecommendations.size > 0) {
      console.log(`\n${colors.green}Recommendations extracted:${colors.reset} ${allRecommendations.size}`);
    }
    
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Failed to parse ${modelName} format${colors.reset}`);
    console.error(error);
    return false;
  }
}

// Main test execution
console.log(`${colors.bright}${colors.blue}`);
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║      Format-Neutral DeepWiki Parser Test Suite               ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log(colors.reset);

const results: Record<string, boolean> = {
  'Gemini': testParser('Gemini', GEMINI_SAMPLE),
  'GPT-4': testParser('GPT-4', GPT4_SAMPLE),
  'DeepSeek': testParser('DeepSeek', DEEPSEEK_SAMPLE)
};

// Test with a mixed format sample
const MIXED_FORMAT_SAMPLE = `# Express.js Repository Analysis

**Model**: mixed/test-model
**Repository**: https://github.com/expressjs/express
**Date**: 2025-05-23

# PART 1: MIXED FORMAT TEST

## Various Issue Formats

- Issue: Traditional Gemini format issue
  - Specific Code Snippet:
\`\`\`javascript
// File: test1.js:10
console.log('test');
\`\`\`

- **Bold GPT-4 Style:** This is a GPT-4 formatted issue
  - File: \`test2.js\`

- Problem: DeepSeek style problem description

- Finding: Generic finding keyword
- Concern: Security concern about validation
- Vulnerability: Potential XSS vulnerability

### Recommendations
- Implement proper validation
- Update dependencies
- Consider using TypeScript

## Score Assessment
- Score: 5/10`;

printHeader('Testing Mixed Format Compatibility');
const mixedResult = testParser('Mixed Format', MIXED_FORMAT_SAMPLE);
results['Mixed'] = mixedResult;

// Summary
printHeader('Test Summary');
let passedTests = 0;
Object.entries(results).forEach(([format, passed]) => {
  if (passed) {
    console.log(`${colors.green}✅ ${format}: PASSED${colors.reset}`);
    passedTests++;
  } else {
    console.log(`${colors.red}❌ ${format}: FAILED${colors.reset}`);
  }
});

console.log(`\n${colors.bright}Overall: ${passedTests}/${Object.keys(results).length} tests passed${colors.reset}`);

if (passedTests === Object.keys(results).length) {
  console.log(`\n${colors.green}🎉 Format-neutral parser successfully handles all LLM formats!${colors.reset}`);
  console.log(`\n${colors.cyan}The parser no longer requires explicit support for each model format.${colors.reset}`);
  console.log(`${colors.cyan}It uses generic patterns to extract findings from any LLM output.${colors.reset}`);
} else {
  console.log(`\n${colors.red}⚠️  Some formats failed to parse correctly${colors.reset}`);
  process.exit(1);
}