/**
 * Test DeepWiki Analysis for ky PR #700
 * This will analyze both main branch and PR branch to identify changes and issues
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const DEEPWIKI_URL = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
const DEEPWIKI_API_KEY = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';

interface AnalysisResult {
  branch: string;
  success: boolean;
  duration: number;
  issues: any[];
  rawResponse?: string;
  error?: string;
}

interface PRAnalysis {
  prNumber: number;
  repository: string;
  mainBranch: AnalysisResult;
  prBranch: AnalysisResult;
  newIssues: any[];
  fixedIssues: any[];
  unchangedIssues: any[];
}

async function analyzeBranch(repoUrl: string, branch: string, prNumber?: number): Promise<AnalysisResult> {
  const startTime = Date.now();
  const result: AnalysisResult = {
    branch: prNumber ? `PR #${prNumber}` : branch,
    success: false,
    duration: 0,
    issues: []
  };

  try {
    console.log(`\n🔍 Analyzing ${branch} branch...`);
    
    // Construct the request
    const request: any = {
      repo_url: repoUrl,
      messages: [{
        role: 'user',
        content: `Analyze this repository for ALL code quality issues, security vulnerabilities, and best practice violations.
        
For each issue found, provide in this EXACT format:

Issue #[number]:
- Type: [security/performance/quality/style/best-practice]
- Severity: [critical/high/medium/low]
- File: [exact file path]
- Line: [line number or range]
- Description: [clear description of the issue]
- Code: [relevant code snippet if available]
- Fix: [suggested fix or improvement]

Be thorough and find ALL issues, not just the most critical ones.`
      }],
      stream: false,
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 4000
    };

    // Add PR-specific parameters if analyzing a PR
    if (prNumber) {
      request.pr_number = prNumber;
      request.branch = `pull/${prNumber}/head`;
    } else {
      request.branch = branch;
    }

    console.log(`   Repository: ${repoUrl}`);
    console.log(`   Branch: ${request.branch || branch}`);
    console.log(`   Sending request to DeepWiki...`);
    
    const response = await axios.post(
      `${DEEPWIKI_URL}/chat/completions/stream`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPWIKI_API_KEY}`
        },
        timeout: 180000 // 3 minutes
      }
    );
    
    result.duration = (Date.now() - startTime) / 1000;
    result.success = true;
    
    // Process response
    let responseText = '';
    if (typeof response.data === 'string') {
      responseText = response.data;
    } else if (response.data?.choices?.[0]?.message?.content) {
      responseText = response.data.choices[0].message.content;
    } else if (response.data?.choices?.[0]?.text) {
      responseText = response.data.choices[0].text;
    }
    
    result.rawResponse = responseText;
    
    // Parse issues from response
    result.issues = parseIssuesFromResponse(responseText);
    
    console.log(`   ✅ Analysis complete in ${result.duration.toFixed(1)}s`);
    console.log(`   📊 Issues found: ${result.issues.length}`);
    
  } catch (error: any) {
    result.duration = (Date.now() - startTime) / 1000;
    result.error = error.message;
    
    console.log(`   ❌ Error: ${error.message}`);
    if (error.response?.data) {
      console.log(`   Details:`, JSON.stringify(error.response.data, null, 2).substring(0, 500));
    }
  }
  
  return result;
}

function parseIssuesFromResponse(text: string): any[] {
  const issues = [];
  
  if (!text) return issues;
  
  // Try to parse structured issues
  const issuePattern = /Issue #?\d+:?\s*\n([\s\S]*?)(?=Issue #?\d+:|$)/gi;
  const matches = text.matchAll(issuePattern);
  
  for (const match of matches) {
    const issueText = match[1];
    const issue: any = {
      raw: match[0]
    };
    
    // Extract fields
    const typeMatch = issueText.match(/[-•]\s*Type:\s*([^\n]+)/i);
    const severityMatch = issueText.match(/[-•]\s*Severity:\s*([^\n]+)/i);
    const fileMatch = issueText.match(/[-•]\s*File:\s*([^\n]+)/i);
    const lineMatch = issueText.match(/[-•]\s*Line:\s*([^\n]+)/i);
    const descMatch = issueText.match(/[-•]\s*Description:\s*([^\n]+)/i);
    const codeMatch = issueText.match(/[-•]\s*Code:\s*([^\n]+)/i);
    const fixMatch = issueText.match(/[-•]\s*Fix:\s*([^\n]+)/i);
    
    if (typeMatch) issue.type = typeMatch[1].trim();
    if (severityMatch) issue.severity = severityMatch[1].trim();
    if (fileMatch) issue.file = fileMatch[1].trim();
    if (lineMatch) issue.line = lineMatch[1].trim();
    if (descMatch) issue.description = descMatch[1].trim();
    if (codeMatch) issue.code = codeMatch[1].trim();
    if (fixMatch) issue.fix = fixMatch[1].trim();
    
    issues.push(issue);
  }
  
  // Fallback: try to find any numbered list items
  if (issues.length === 0) {
    const listPattern = /\d+\.\s*(.+?)(?=\d+\.|$)/gs;
    const listMatches = text.matchAll(listPattern);
    
    for (const match of listMatches) {
      if (match[1] && match[1].length > 20) {
        issues.push({
          description: match[1].trim(),
          raw: match[0]
        });
      }
    }
  }
  
  return issues;
}

function compareIssues(mainIssues: any[], prIssues: any[]): { 
  newIssues: any[], 
  fixedIssues: any[], 
  unchangedIssues: any[] 
} {
  const newIssues = [];
  const fixedIssues = [];
  const unchangedIssues = [];
  
  // Find new issues in PR
  for (const prIssue of prIssues) {
    const found = mainIssues.find(mainIssue => 
      mainIssue.file === prIssue.file && 
      mainIssue.description === prIssue.description
    );
    
    if (!found) {
      newIssues.push(prIssue);
    } else {
      unchangedIssues.push(prIssue);
    }
  }
  
  // Find fixed issues (in main but not in PR)
  for (const mainIssue of mainIssues) {
    const found = prIssues.find(prIssue => 
      mainIssue.file === prIssue.file && 
      mainIssue.description === prIssue.description
    );
    
    if (!found) {
      fixedIssues.push(mainIssue);
    }
  }
  
  return { newIssues, fixedIssues, unchangedIssues };
}

async function analyzePR700() {
  const repoUrl = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;
  
  console.log('=' .repeat(70));
  console.log('🔬 DeepWiki PR Analysis Report');
  console.log('=' .repeat(70));
  console.log(`\n📦 Repository: ${repoUrl}`);
  console.log(`📝 Pull Request: #${prNumber}`);
  console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
  console.log(`🌐 DeepWiki URL: ${DEEPWIKI_URL}`);
  
  // Check PR details first
  console.log('\n📋 Fetching PR information...');
  try {
    const prInfo = await axios.get(
      `https://api.github.com/repos/sindresorhus/ky/pulls/${prNumber}`,
      { headers: { 'Accept': 'application/vnd.github.v3+json' } }
    );
    
    console.log(`   Title: ${prInfo.data.title}`);
    console.log(`   Author: ${prInfo.data.user.login}`);
    console.log(`   State: ${prInfo.data.state}`);
    console.log(`   Created: ${prInfo.data.created_at}`);
    console.log(`   Files Changed: ${prInfo.data.changed_files}`);
    console.log(`   Additions: +${prInfo.data.additions}`);
    console.log(`   Deletions: -${prInfo.data.deletions}`);
  } catch (error) {
    console.log('   ⚠️  Could not fetch PR information from GitHub');
  }
  
  // Analyze main branch
  console.log('\n' + '=' .repeat(70));
  console.log('📊 MAIN BRANCH ANALYSIS');
  console.log('=' .repeat(70));
  const mainAnalysis = await analyzeBranch(repoUrl, 'main');
  
  // Analyze PR branch
  console.log('\n' + '=' .repeat(70));
  console.log('📊 PR #700 BRANCH ANALYSIS');
  console.log('=' .repeat(70));
  const prAnalysis = await analyzeBranch(repoUrl, 'pr', prNumber);
  
  // Compare results
  let comparison = { newIssues: [], fixedIssues: [], unchangedIssues: [] };
  if (mainAnalysis.success && prAnalysis.success) {
    comparison = compareIssues(mainAnalysis.issues, prAnalysis.issues);
  }
  
  // Generate markdown report
  const report: PRAnalysis = {
    prNumber,
    repository: repoUrl,
    mainBranch: mainAnalysis,
    prBranch: prAnalysis,
    newIssues: comparison.newIssues,
    fixedIssues: comparison.fixedIssues,
    unchangedIssues: comparison.unchangedIssues
  };
  
  // Create markdown report
  const markdown = generateMarkdownReport(report);
  
  // Save report
  const reportPath = path.join(process.cwd(), `PR-700-Analysis-Report-${new Date().toISOString().split('T')[0]}.md`);
  fs.writeFileSync(reportPath, markdown);
  
  console.log('\n' + '=' .repeat(70));
  console.log('📄 REPORT SUMMARY');
  console.log('=' .repeat(70));
  console.log(`\n✅ Report saved to: ${reportPath}`);
  console.log(`\n📊 Analysis Results:`);
  console.log(`   Main Branch: ${mainAnalysis.success ? `${mainAnalysis.issues.length} issues found` : 'Failed'}`);
  console.log(`   PR Branch: ${prAnalysis.success ? `${prAnalysis.issues.length} issues found` : 'Failed'}`);
  
  if (comparison.newIssues.length > 0 || comparison.fixedIssues.length > 0) {
    console.log(`\n🔄 Changes in PR #${prNumber}:`);
    console.log(`   🆕 New Issues: ${comparison.newIssues.length}`);
    console.log(`   ✅ Fixed Issues: ${comparison.fixedIssues.length}`);
    console.log(`   ⚡ Unchanged Issues: ${comparison.unchangedIssues.length}`);
  }
  
  console.log('\n' + '=' .repeat(70));
}

function generateMarkdownReport(analysis: PRAnalysis): string {
  let md = `# Pull Request Analysis Report - PR #${analysis.prNumber}

## Executive Summary

**Repository:** ${analysis.repository}  
**PR Number:** #${analysis.prNumber}  
**Analysis Date:** ${new Date().toISOString()}  
**DeepWiki URL:** ${DEEPWIKI_URL}

## Analysis Results

### Main Branch Analysis
- **Status:** ${analysis.mainBranch.success ? '✅ Success' : '❌ Failed'}
- **Duration:** ${analysis.mainBranch.duration.toFixed(1)} seconds
- **Issues Found:** ${analysis.mainBranch.issues.length}

### PR Branch Analysis  
- **Status:** ${analysis.prBranch.success ? '✅ Success' : '❌ Failed'}
- **Duration:** ${analysis.prBranch.duration.toFixed(1)} seconds
- **Issues Found:** ${analysis.prBranch.issues.length}

## Impact Assessment

| Metric | Count | Status |
|--------|-------|--------|
| 🆕 New Issues Introduced | ${analysis.newIssues.length} | ${analysis.newIssues.length > 0 ? '⚠️ Needs Review' : '✅ Good'} |
| ✅ Issues Fixed | ${analysis.fixedIssues.length} | ${analysis.fixedIssues.length > 0 ? '✅ Improvements' : '—'} |
| ⚡ Unchanged Issues | ${analysis.unchangedIssues.length} | Existing |

`;

  // New Issues Section
  if (analysis.newIssues.length > 0) {
    md += `## 🆕 New Issues Introduced in PR

These issues were not present in the main branch and appear to be introduced by this PR:

`;
    
    for (let i = 0; i < analysis.newIssues.length; i++) {
      const issue = analysis.newIssues[i];
      md += `### Issue ${i + 1}
- **Type:** ${issue.type || 'Unknown'}
- **Severity:** ${issue.severity || 'Unknown'}
- **File:** \`${issue.file || 'Unknown'}\`
- **Line:** ${issue.line || 'Unknown'}
- **Description:** ${issue.description || issue.raw?.substring(0, 200) || 'No description'}
${issue.fix ? `- **Suggested Fix:** ${issue.fix}` : ''}

`;
    }
  }

  // Fixed Issues Section
  if (analysis.fixedIssues.length > 0) {
    md += `## ✅ Issues Fixed in PR

These issues were present in the main branch but have been resolved in this PR:

`;
    
    for (let i = 0; i < analysis.fixedIssues.length; i++) {
      const issue = analysis.fixedIssues[i];
      md += `### Fixed Issue ${i + 1}
- **Type:** ${issue.type || 'Unknown'}
- **File:** \`${issue.file || 'Unknown'}\`
- **Description:** ${issue.description || issue.raw?.substring(0, 200) || 'No description'}

`;
    }
  }

  // Unchanged Issues Section (limited to first 5)
  if (analysis.unchangedIssues.length > 0) {
    md += `## ⚡ Existing Issues (Unchanged)

These issues exist in both the main branch and the PR (showing first 5):

`;
    
    const displayIssues = analysis.unchangedIssues.slice(0, 5);
    for (let i = 0; i < displayIssues.length; i++) {
      const issue = displayIssues[i];
      md += `### Existing Issue ${i + 1}
- **Type:** ${issue.type || 'Unknown'}
- **Severity:** ${issue.severity || 'Unknown'}
- **File:** \`${issue.file || 'Unknown'}\`
- **Description:** ${issue.description || issue.raw?.substring(0, 200) || 'No description'}

`;
    }
    
    if (analysis.unchangedIssues.length > 5) {
      md += `\n*... and ${analysis.unchangedIssues.length - 5} more existing issues*\n\n`;
    }
  }

  // Recommendations
  md += `## Recommendations

`;

  if (analysis.newIssues.length > 0) {
    md += `### ⚠️ Action Required
The PR introduces ${analysis.newIssues.length} new issue(s) that should be reviewed and addressed before merging.

`;
  }

  if (analysis.fixedIssues.length > 0) {
    md += `### ✅ Positive Impact
The PR successfully resolves ${analysis.fixedIssues.length} existing issue(s), improving the codebase quality.

`;
  }

  if (analysis.newIssues.length === 0 && analysis.fixedIssues.length === 0) {
    md += `### 🔄 No Significant Impact
This PR does not introduce new issues or fix existing ones. It maintains the current code quality level.

`;
  }

  // Technical Details
  md += `## Technical Details

### Analysis Configuration
- **Model:** openai/gpt-4o-mini
- **Temperature:** 0.1
- **Max Tokens:** 4000
- **Provider:** openrouter

### Raw Response Samples

`;

  if (analysis.mainBranch.rawResponse) {
    md += `<details>
<summary>Main Branch Response (first 1000 chars)</summary>

\`\`\`
${analysis.mainBranch.rawResponse.substring(0, 1000)}...
\`\`\`

</details>

`;
  }

  if (analysis.prBranch.rawResponse) {
    md += `<details>
<summary>PR Branch Response (first 1000 chars)</summary>

\`\`\`
${analysis.prBranch.rawResponse.substring(0, 1000)}...
\`\`\`

</details>

`;
  }

  md += `---

*Generated by DeepWiki Analysis Tool*  
*Report Version: 1.0*  
*For questions or issues, contact the development team*
`;

  return md;
}

// Run the analysis
analyzePR700().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});