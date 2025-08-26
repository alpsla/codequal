import { MarkdownToHtmlConverter } from './src/standard/utils/markdown-to-html-converter';
import * as fs from 'fs';

// Sample markdown report
const markdownReport = `# 📊 CodeQual Analysis Report V8

**Repository:** sindresorhus/ky
**PR:** #700
**Generated:** ${new Date().toISOString()}

## 🎯 Executive Summary

### Issue Summary
- 🔴 **Critical:** 0 | 🟠 **High:** 2 | 🟡 **Medium:** 3 | 🟢 **Low:** 1
- **New Issues:** 2 | **Resolved:** 3 | **Pre-existing:** 1

### Key Metrics
- **Quality Score:** 85/100 (B)
- **Test Coverage:** 92%
- **Security Score:** 95/100

| Metric | Main Branch | PR Branch | Change |
|--------|-------------|-----------|--------|
| Total Issues | 4 | 3 | -1 ✅ |
| Critical | 0 | 0 | 0 ➡️ |
| High | 1 | 2 | +1 ⚠️ |
| Medium | 2 | 1 | -1 ✅ |

## 📋 Detailed Issue Analysis

### 🆕 New Issues in PR

#### 🟠 High Priority Issue
**Location:** \`src/index.ts:45\`
**Description:** Missing error handling in async function

\`\`\`javascript
async function fetchData() {
  const response = await fetch(url); // No try-catch
  return response.json();
}
\`\`\`

#### 🟡 Medium Priority Issue  
**Location:** \`test/utils.test.ts:23\`
**Description:** Test case lacks proper assertions

### ✅ Fixed Issues
- Fixed memory leak in data processing
- Resolved race condition in cache updates
- Improved error messages

## 🔒 Security Analysis
✅ **No security vulnerabilities detected**

## 📊 Performance Metrics
- Bundle size: 12.5kb (gzipped)
- Load time: < 100ms
- Memory usage: Optimal

## 🎓 Recommendations
1. Add error handling to all async functions
2. Increase test coverage for edge cases
3. Consider implementing rate limiting`;

// Convert to HTML
const htmlReport = MarkdownToHtmlConverter.convertToHtml(markdownReport);

// Save files
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.writeFileSync(`test-reports/test-html-${timestamp}.html`, htmlReport);
fs.writeFileSync(`test-reports/test-markdown-${timestamp}.md`, markdownReport);

console.log('✅ Test reports generated:');
console.log(`   HTML: test-reports/test-html-${timestamp}.html`);
console.log(`   Markdown: test-reports/test-markdown-${timestamp}.md`);
console.log('\nOpening HTML report...');

// Open in browser (macOS)
require('child_process').exec(`open test-reports/test-html-${timestamp}.html`);