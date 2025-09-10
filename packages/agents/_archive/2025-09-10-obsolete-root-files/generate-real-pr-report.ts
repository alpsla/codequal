/**
 * Generate Real-Looking PR Report with Enhanced Features
 * Demonstrates Type A/B distinction and deduplication with realistic data
 */

import { IssueDeduplicator } from './src/standard/services/issue-deduplicator';
import * as fs from 'fs';

// Create realistic PR data similar to what DeepWiki would return
const realPRData = {
  repositoryUrl: 'https://github.com/vercel/swr',
  prNumber: 2950,
  prTitle: 'Fix: Add proper error handling and improve type safety',
  prAuthor: 'johndoe',
  
  // Issues from main branch
  mainBranchIssues: [
    {
      title: 'Missing error handling in data fetcher',
      severity: 'high',
      category: 'bug',
      location: { file: 'src/utils/fetcher.ts', line: 45 },
      description: 'No catch block for failed requests',
      codeSnippet: `export const fetcher = (url) => {
  return fetch(url).then(res => res.json());
}`
    },
    {
      title: 'Vulnerability in dependency "axios" version 0.21.1',
      severity: 'high',
      category: 'dependency-vulnerability',
      location: { file: 'package.json', line: 32 },
      description: 'Known CVE-2021-45046'
    },
    {
      title: 'Vulnerability in dependency "axios" version 0.21.1',
      severity: 'high',
      category: 'dependency-vulnerability',
      location: { file: 'package.json', line: 32 },
      description: 'Known CVE-2021-45046'
    },
    {
      title: 'Type "any" used in function parameter',
      severity: 'medium',
      category: 'type-safety',
      location: { file: 'src/hooks/useSWR.ts', line: 89 },
      codeSnippet: `function processData(data: any) {
  return data.items || [];
}`
    }
  ],
  
  // Issues from PR branch  
  prBranchIssues: [
    {
      title: 'SQL injection vulnerability in query builder',
      severity: 'critical',
      category: 'security',
      location: { file: 'src/db/query.ts', line: 156 },
      description: 'User input directly concatenated in SQL',
      codeSnippet: `function getUserById(id) {
  return db.query('SELECT * FROM users WHERE id = ' + id);
}`
    },
    {
      title: 'Synchronous file read blocking event loop',
      severity: 'high',
      category: 'performance',
      location: { file: 'src/cache/manager.ts', line: 78 },
      codeSnippet: `function loadConfig(path) {
  const data = fs.readFileSync(path, 'utf8');
  return JSON.parse(data);
}`
    },
    {
      title: 'Vulnerability in dependency "axios" version 0.21.1',
      severity: 'high',
      category: 'dependency-vulnerability',
      location: { file: 'package.json', line: 32 },
      description: 'Known CVE-2021-45046'
    },
    {
      title: 'Vulnerability in dependency "axios" version 0.21.1',
      severity: 'high',
      category: 'dependency-vulnerability',
      location: { file: 'package.json', line: 32 },
      description: 'Known CVE-2021-45046'
    },
    {
      title: 'Type "any" used in function parameter',
      severity: 'medium',
      category: 'type-safety',
      location: { file: 'src/hooks/useSWR.ts', line: 89 },
      codeSnippet: `function processData(data: any) {
  return data.items || [];
}`
    },
    {
      title: 'Missing null check in options handler',
      severity: 'medium',
      category: 'bug',
      location: { file: 'src/core/config.ts', line: 234 },
      codeSnippet: `function applyOptions(options) {
  return options.timeout || 5000;
}`
    }
  ]
};

// Analyze fix types
function analyzeFixType(issue: any): 'A' | 'B' {
  const title = issue.title.toLowerCase();
  const desc = (issue.description || '').toLowerCase();
  
  // Type B: Changes signature or requires migration
  if (title.includes('sql') || 
      title.includes('injection') ||
      title.includes('synchronous') ||
      title.includes('async') ||
      desc.includes('parameter')) {
    return 'B';
  }
  
  // Type A: Simple fixes
  return 'A';
}

// Generate fix suggestion based on issue
function generateFixSuggestion(issue: any) {
  const fixType = analyzeFixType(issue);
  
  const suggestions: any = {
    'Missing error handling in data fetcher': {
      fixedCode: `export const fetcher = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed');
    return res.json();
  } catch (error) {
    console.error('Fetcher error:', error);
    throw error;
  }
}`,
      explanation: 'Add proper error handling and async/await',
      estimatedMinutes: 15,
      fixType: 'B',
      adjustmentNotes: 'Function is now async - add await to all calls'
    },
    'SQL injection vulnerability in query builder': {
      fixedCode: `function getUserById(id, connection) {
  return connection.query('SELECT * FROM users WHERE id = ?', [id]);
}`,
      explanation: 'Use parameterized queries',
      estimatedMinutes: 25,
      fixType: 'B',
      adjustmentNotes: 'Add connection parameter to all function calls'
    },
    'Synchronous file read blocking event loop': {
      fixedCode: `async function loadConfig(path) {
  const data = await fs.promises.readFile(path, 'utf8');
  return JSON.parse(data);
}`,
      explanation: 'Convert to async file operation',
      estimatedMinutes: 20,
      fixType: 'B',
      adjustmentNotes: 'Function is now async - add await to all calls'
    },
    'Missing null check in options handler': {
      fixedCode: `function applyOptions(options) {
  if (!options) return 5000;
  return options.timeout || 5000;
}`,
      explanation: 'Add null check',
      estimatedMinutes: 5,
      fixType: 'A'
    },
    'Type "any" used in function parameter': {
      fixedCode: `interface DataResponse {
  items?: unknown[];
}

function processData(data: DataResponse) {
  return data.items || [];
}`,
      explanation: 'Add proper TypeScript types',
      estimatedMinutes: 10,
      fixType: 'A'
    },
    'Vulnerability in dependency "axios" version 0.21.1': {
      fixedCode: '"axios": "^1.6.0"',
      explanation: 'Update to secure version',
      estimatedMinutes: 10,
      fixType: 'A'
    }
  };
  
  return suggestions[issue.title] || {
    fixedCode: '// Fix implementation needed',
    explanation: 'Manual fix required',
    estimatedMinutes: 15,
    fixType: 'A'
  };
}

// Generate the report
async function generateEnhancedReport() {
  console.log('📊 Generating Enhanced PR Analysis Report\n');
  console.log('='.repeat(60));
  
  // Step 1: Deduplicate issues
  const deduplicator = new IssueDeduplicator();
  
  console.log('\n🔄 Deduplication Process:');
  console.log(`  Main branch issues: ${realPRData.mainBranchIssues.length} (before dedup)`);
  console.log(`  PR branch issues: ${realPRData.prBranchIssues.length} (before dedup)`);
  
  const deduplicatedMain = deduplicator.deduplicateIssues(realPRData.mainBranchIssues);
  const deduplicatedPR = deduplicator.deduplicateIssues(realPRData.prBranchIssues);
  
  console.log(`  Main branch issues: ${deduplicatedMain.length} (after dedup)`);
  console.log(`  PR branch issues: ${deduplicatedPR.length} (after dedup)`);
  console.log(`  ✅ Removed ${(realPRData.mainBranchIssues.length + realPRData.prBranchIssues.length) - (deduplicatedMain.length + deduplicatedPR.length)} duplicates`);
  
  // Step 2: Categorize issues
  const newIssues = deduplicatedPR.filter(prIssue => 
    !deduplicatedMain.some(mainIssue => 
      mainIssue.title === prIssue.title && 
      mainIssue.location.file === prIssue.location.file
    )
  );
  
  const fixedIssues = deduplicatedMain.filter(mainIssue =>
    !deduplicatedPR.some(prIssue =>
      mainIssue.title === prIssue.title &&
      mainIssue.location.file === prIssue.location.file
    )
  );
  
  const unchangedIssues = deduplicatedPR.filter(prIssue =>
    deduplicatedMain.some(mainIssue =>
      mainIssue.title === prIssue.title &&
      mainIssue.location.file === prIssue.location.file
    )
  );
  
  console.log('\n📊 Issue Categorization:');
  console.log(`  New issues: ${newIssues.length}`);
  console.log(`  Fixed issues: ${fixedIssues.length}`);
  console.log(`  Unchanged issues: ${unchangedIssues.length}`);
  
  // Step 3: Analyze fix types
  let typeACount = 0;
  let typeBCount = 0;
  
  [...newIssues, ...unchangedIssues].forEach(issue => {
    const fixType = analyzeFixType(issue);
    if (fixType === 'A') typeACount++;
    else typeBCount++;
  });
  
  console.log('\n🔧 Fix Type Analysis:');
  console.log(`  Type A (copy-paste): ${typeACount}`);
  console.log(`  Type B (needs adjustment): ${typeBCount}`);
  
  // Step 4: Generate markdown report
  let markdown = `# 📊 CodeQual PR Analysis Report - Enhanced

**Repository:** vercel/swr  
**PR #${realPRData.prNumber}:** ${realPRData.prTitle}  
**Author:** @${realPRData.prAuthor}  
**Date:** ${new Date().toISOString().split('T')[0]}

---

## 🔧 Fix Classification Overview

### Fix Types Distribution
- 🟢 **Type A Fixes (Direct Copy-Paste)**: ${typeACount}
- 🟡 **Type B Fixes (Requires Adjustments)**: ${typeBCount}

> ⚠️ **Note**: Type B fixes require updating all function callers. See individual fix details for migration steps.

---

## 🎯 Executive Summary

### Issues After Deduplication
- 🔴 **Critical:** ${[...newIssues, ...unchangedIssues].filter(i => i.severity === 'critical').length}
- 🟠 **High:** ${[...newIssues, ...unchangedIssues].filter(i => i.severity === 'high').length}
- 🟡 **Medium:** ${[...newIssues, ...unchangedIssues].filter(i => i.severity === 'medium').length}
- 🟢 **Low:** ${[...newIssues, ...unchangedIssues].filter(i => i.severity === 'low').length}

### PR Impact
- **New Issues:** ${newIssues.length}
- **Fixed Issues:** ${fixedIssues.length}
- **Unchanged Issues:** ${unchangedIssues.length}

### Deduplication Results
- **Duplicates Removed:** ${(realPRData.mainBranchIssues.length + realPRData.prBranchIssues.length) - (deduplicatedMain.length + deduplicatedPR.length)}
- **Efficiency Gain:** ${Math.round(((realPRData.mainBranchIssues.length + realPRData.prBranchIssues.length) - (deduplicatedMain.length + deduplicatedPR.length)) / (realPRData.mainBranchIssues.length + realPRData.prBranchIssues.length) * 100)}% reduction

---

## 📋 Detailed Issue Analysis

`;

  // Add new issues
  if (newIssues.length > 0) {
    markdown += `### 🆕 New Issues (Introduced by This PR)\n\n`;
    
    newIssues.forEach((issue, index) => {
      const fix = generateFixSuggestion(issue);
      const fixType = fix.fixType;
      
      markdown += `#### ${index + 1}. ${issue.title}
**Location:** \`${issue.location.file}:${issue.location.line}\`  
**Severity:** ${issue.severity} | **Category:** ${issue.category}

`;
      
      if (issue.codeSnippet) {
        markdown += `**Current Code:**
\`\`\`javascript
${issue.codeSnippet}
\`\`\`

`;
      }
      
      markdown += `### 💡 Fix Suggestion

`;
      
      if (fixType === 'A') {
        markdown += `#### 🟢 Type A Fix - Direct Copy-Paste
*This fix maintains the same function signature. Safe to apply directly.*

`;
      } else {
        markdown += `#### 🟡 Type B Fix - Requires Adjustments
*This fix changes the function signature or behavior. Update all callers accordingly.*

`;
        if (fix.adjustmentNotes) {
          markdown += `**Required Adjustments:** ${fix.adjustmentNotes}

`;
        }
      }
      
      markdown += `**Fixed Code:**
\`\`\`javascript
${fix.fixedCode}
\`\`\`

**Explanation:** ${fix.explanation}  
**Confidence:** High | **Estimated Time:** ${fix.estimatedMinutes} minutes

---

`;
    });
  }
  
  // Add unchanged issues
  if (unchangedIssues.length > 0) {
    markdown += `### 📌 Pre-existing Issues (Not Addressed)\n\n`;
    
    unchangedIssues.forEach((issue, index) => {
      const fix = generateFixSuggestion(issue);
      const fixType = fix.fixType;
      
      // Mark if it was deduplicated
      const isDuplicate = issue.title.includes('axios');
      
      markdown += `#### ${index + 1}. ${issue.title}${isDuplicate ? ' (deduplicated)' : ''}
**Location:** \`${issue.location.file}:${issue.location.line}\`  
**Severity:** ${issue.severity} | **Category:** ${issue.category}

`;
      
      markdown += `**Fix Type:** ${fixType === 'A' ? '🟢 Type A (copy-paste)' : '🟡 Type B (needs adjustment)'}  
**Estimated Time:** ${fix.estimatedMinutes} minutes

`;
    });
  }
  
  // Add migration guide
  markdown += `---

## 🎯 Migration Guide for Type B Fixes

### Functions Requiring Updates:
`;
  
  const typeBIssues = [...newIssues, ...unchangedIssues].filter(i => analyzeFixType(i) === 'B');
  typeBIssues.forEach(issue => {
    const fix = generateFixSuggestion(issue);
    markdown += `- \`${issue.location.file}\` - ${fix.adjustmentNotes || 'Signature change'}
`;
  });
  
  markdown += `
### Search Commands:
\`\`\`bash
# Find all affected function calls
${typeBIssues.map(i => `grep -r "${i.location.file.split('/').pop().split('.')[0]}" --include="*.ts" --include="*.tsx"`).join('\n')}
\`\`\`

---

## 📈 Quality Metrics

- **Total Issues:** ${newIssues.length + unchangedIssues.length}
- **Deduplication Efficiency:** ${Math.round(((realPRData.mainBranchIssues.length + realPRData.prBranchIssues.length) - (deduplicatedMain.length + deduplicatedPR.length)) / (realPRData.mainBranchIssues.length + realPRData.prBranchIssues.length) * 100)}%
- **Type A/B Ratio:** ${Math.round(typeACount / (typeACount + typeBCount) * 100)}% can be copy-pasted
- **Total Fix Time:** ~${[...newIssues, ...unchangedIssues].reduce((sum, i) => sum + generateFixSuggestion(i).estimatedMinutes, 0)} minutes
- **Breaking Changes:** ${typeBCount} functions need caller updates

---

*Report generated with Type A/B Fix Classification and Issue Deduplication*  
*CodeQual v1.5.0 - Enhanced Features Enabled*
`;
  
  // Save report
  const filename = `Enhanced-PR-Report-${realPRData.prNumber}-${new Date().toISOString().split('T')[0]}.md`;
  fs.writeFileSync(filename, markdown);
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Enhanced report saved to: ${filename}\n`);
  
  // Show preview
  console.log('📄 Report Preview (first 100 lines):\n');
  console.log(markdown.split('\n').slice(0, 100).join('\n'));
}

// Run report generation
generateEnhancedReport().catch(console.error);