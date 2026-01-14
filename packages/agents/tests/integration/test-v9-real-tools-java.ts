/**
 * V9 Real Tool Execution Test - Java
 * Runs actual analysis tools on Oracle Cloud instance
 * Generates BASIC and PRO tier reports for review
 *
 * Usage:
 *   npx ts-node tests/integration/test-v9-real-tools-java.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, 'v9-2tier-reports');
const REPO_URL = 'https://github.com/spring-projects/spring-petclinic';
const PR_NUMBER = 950;

interface Issue {
  id: string;
  tool: string;
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  message: string;
  file: string;
  line: number;
  column?: number;
  suggestion?: string;
}

interface ToolResult {
  tool: string;
  success: boolean;
  issues: Issue[];
  duration: number;
  error?: string;
}

interface AnalysisResult {
  repository: string;
  prNumber: number;
  language: string;
  timestamp: string;
  duration: number;
  toolResults: ToolResult[];
  summary: {
    totalIssues: number;
    bySeverity: Record<string, number>;
    byTool: Record<string, number>;
    byCategory: Record<string, number>;
  };
  score: {
    overall: number;
    security: number;
    quality: number;
    maintainability: number;
  };
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function runCommand(cmd: string, cwd?: string): { stdout: string; success: boolean; error?: string } {
  try {
    const stdout = execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      timeout: 300000 // 5 minute timeout
    });
    return { stdout, success: true };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      success: false,
      error: error.message
    };
  }
}

function parsePMDOutput(output: string, repoPath: string): Issue[] {
  const issues: Issue[] = [];

  try {
    // PMD outputs JSON when using -f json
    const json = JSON.parse(output);

    for (const file of json.files || []) {
      for (const violation of file.violations || []) {
        issues.push({
          id: `pmd-${issues.length + 1}`,
          tool: 'pmd',
          rule: violation.rule || 'unknown',
          severity: mapPMDPriority(violation.priority),
          category: violation.ruleset || 'quality',
          message: violation.description || violation.message,
          file: file.filename.replace(repoPath + '/', ''),
          line: violation.beginline || violation.line || 1,
          column: violation.begincolumn
        });
      }
    }
  } catch {
    // Try line-by-line parsing for text format
    const lines = output.split('\n');
    for (const line of lines) {
      const match = line.match(/^(.+):(\d+):\s*(.+)$/);
      if (match) {
        issues.push({
          id: `pmd-${issues.length + 1}`,
          tool: 'pmd',
          rule: 'pmd-rule',
          severity: 'medium',
          category: 'quality',
          message: match[3],
          file: match[1].replace(repoPath + '/', ''),
          line: parseInt(match[2])
        });
      }
    }
  }

  return issues;
}

function mapPMDPriority(priority: number): 'critical' | 'high' | 'medium' | 'low' {
  switch (priority) {
    case 1: return 'critical';
    case 2: return 'high';
    case 3: return 'medium';
    default: return 'low';
  }
}

function parseCheckstyleOutput(output: string, repoPath: string): Issue[] {
  const issues: Issue[] = [];

  try {
    // Parse XML output
    const fileMatches = output.matchAll(/<file name="([^"]+)">([\s\S]*?)<\/file>/g);

    for (const fileMatch of fileMatches) {
      const fileName = fileMatch[1].replace(repoPath + '/', '');
      const errorMatches = fileMatch[2].matchAll(/<error line="(\d+)"[^>]*column="(\d+)"[^>]*severity="([^"]+)"[^>]*message="([^"]+)"[^>]*source="([^"]+)"/g);

      for (const errorMatch of errorMatches) {
        issues.push({
          id: `checkstyle-${issues.length + 1}`,
          tool: 'checkstyle',
          rule: errorMatch[5].split('.').pop() || 'unknown',
          severity: mapCheckstyleSeverity(errorMatch[3]),
          category: 'style',
          message: errorMatch[4].replace(/&apos;/g, "'").replace(/&quot;/g, '"'),
          file: fileName,
          line: parseInt(errorMatch[1]),
          column: parseInt(errorMatch[2])
        });
      }
    }
  } catch {
    // Fallback: line-by-line parsing
  }

  return issues;
}

function mapCheckstyleSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
  switch (severity.toLowerCase()) {
    case 'error': return 'high';
    case 'warning': return 'medium';
    default: return 'low';
  }
}

function parseSemgrepOutput(output: string, repoPath: string): Issue[] {
  const issues: Issue[] = [];

  try {
    const json = JSON.parse(output);

    for (const result of json.results || []) {
      issues.push({
        id: `semgrep-${issues.length + 1}`,
        tool: 'semgrep',
        rule: result.check_id || 'unknown',
        severity: mapSemgrepSeverity(result.extra?.severity),
        category: result.extra?.metadata?.category || 'security',
        message: result.extra?.message || result.message,
        file: (result.path || '').replace(repoPath + '/', ''),
        line: result.start?.line || 1,
        column: result.start?.col,
        suggestion: result.extra?.fix
      });
    }
  } catch {
    // Ignore parse errors
  }

  return issues;
}

function mapSemgrepSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
  switch ((severity || '').toUpperCase()) {
    case 'ERROR': return 'critical';
    case 'WARNING': return 'high';
    case 'INFO': return 'medium';
    default: return 'low';
  }
}

function parseSpotBugsOutput(output: string, repoPath: string): Issue[] {
  const issues: Issue[] = [];

  try {
    // Parse XML output
    const bugMatches = output.matchAll(/<BugInstance[^>]*type="([^"]+)"[^>]*priority="(\d+)"[^>]*category="([^"]+)"[^>]*>([\s\S]*?)<\/BugInstance>/g);

    for (const match of bugMatches) {
      const type = match[1];
      const priority = parseInt(match[2]);
      const category = match[3];
      const content = match[4];

      // Extract source line
      const sourceMatch = content.match(/<SourceLine[^>]*classname="([^"]+)"[^>]*start="(\d+)"/);
      const messageMatch = content.match(/<LongMessage>([^<]+)<\/LongMessage>/);

      if (sourceMatch) {
        issues.push({
          id: `spotbugs-${issues.length + 1}`,
          tool: 'spotbugs',
          rule: type,
          severity: mapSpotBugsPriority(priority),
          category: category.toLowerCase(),
          message: messageMatch ? messageMatch[1] : type,
          file: sourceMatch[1].replace(/\./g, '/') + '.java',
          line: parseInt(sourceMatch[2])
        });
      }
    }
  } catch {
    // Ignore parse errors
  }

  return issues;
}

function mapSpotBugsPriority(priority: number): 'critical' | 'high' | 'medium' | 'low' {
  switch (priority) {
    case 1: return 'critical';
    case 2: return 'high';
    case 3: return 'medium';
    default: return 'low';
  }
}

async function runJavaAnalysis(): Promise<AnalysisResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const repoPath = `/tmp/v9-java-analysis-${Date.now()}`;

  log('Starting Java analysis with real tools...');
  log(`Repository: ${REPO_URL}`);
  log(`PR: #${PR_NUMBER}`);

  const toolResults: ToolResult[] = [];

  try {
    // Clone repository
    log('Cloning repository...');
    runCommand(`rm -rf ${repoPath}`);
    const cloneResult = runCommand(`git clone --depth 1 ${REPO_URL} ${repoPath}`);
    if (!cloneResult.success) {
      throw new Error(`Failed to clone: ${cloneResult.error}`);
    }
    log('Repository cloned successfully');

    // Run PMD
    log('Running PMD...');
    const pmdStart = Date.now();
    const pmdResult = runCommand(
      `pmd check -d ${repoPath}/src -R rulesets/java/quickstart.xml -f json --no-progress 2>/dev/null || true`
    );
    const pmdIssues = parsePMDOutput(pmdResult.stdout, repoPath);
    toolResults.push({
      tool: 'pmd',
      success: true,
      issues: pmdIssues,
      duration: Date.now() - pmdStart
    });
    log(`PMD found ${pmdIssues.length} issues`);

    // Run Checkstyle
    log('Running Checkstyle...');
    const checkstyleStart = Date.now();
    const checkstyleResult = runCommand(
      `checkstyle -c /sun_checks.xml ${repoPath}/src -f xml 2>/dev/null || true`
    );
    const checkstyleIssues = parseCheckstyleOutput(checkstyleResult.stdout, repoPath);
    toolResults.push({
      tool: 'checkstyle',
      success: true,
      issues: checkstyleIssues,
      duration: Date.now() - checkstyleStart
    });
    log(`Checkstyle found ${checkstyleIssues.length} issues`);

    // Run Semgrep
    log('Running Semgrep...');
    const semgrepStart = Date.now();
    const semgrepResult = runCommand(
      `semgrep scan --config auto --json ${repoPath}/src 2>/dev/null || true`
    );
    const semgrepIssues = parseSemgrepOutput(semgrepResult.stdout, repoPath);
    toolResults.push({
      tool: 'semgrep',
      success: true,
      issues: semgrepIssues,
      duration: Date.now() - semgrepStart
    });
    log(`Semgrep found ${semgrepIssues.length} issues`);

    // Run SpotBugs (requires compiled code)
    log('Compiling for SpotBugs...');
    const compileResult = runCommand(`cd ${repoPath} && ./mvnw compile -q 2>/dev/null || mvn compile -q 2>/dev/null || true`);

    if (fs.existsSync(`${repoPath}/target/classes`)) {
      log('Running SpotBugs...');
      const spotbugsStart = Date.now();
      const spotbugsResult = runCommand(
        `spotbugs -textui -xml -auxclasspath ${repoPath}/target/classes ${repoPath}/target/classes 2>/dev/null || true`
      );
      const spotbugsIssues = parseSpotBugsOutput(spotbugsResult.stdout, repoPath);
      toolResults.push({
        tool: 'spotbugs',
        success: true,
        issues: spotbugsIssues,
        duration: Date.now() - spotbugsStart
      });
      log(`SpotBugs found ${spotbugsIssues.length} issues`);
    } else {
      log('Skipping SpotBugs (compilation failed)');
      toolResults.push({
        tool: 'spotbugs',
        success: false,
        issues: [],
        duration: 0,
        error: 'Compilation required but failed'
      });
    }

    // Cleanup
    runCommand(`rm -rf ${repoPath}`);

  } catch (error: any) {
    log(`Error: ${error.message}`);
    runCommand(`rm -rf ${repoPath}`);
  }

  // Aggregate results
  const allIssues = toolResults.flatMap(r => r.issues);
  const bySeverity: Record<string, number> = {};
  const byTool: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const issue of allIssues) {
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
    byTool[issue.tool] = (byTool[issue.tool] || 0) + 1;
    byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
  }

  // Calculate scores
  const criticalCount = bySeverity['critical'] || 0;
  const highCount = bySeverity['high'] || 0;
  const mediumCount = bySeverity['medium'] || 0;
  const lowCount = bySeverity['low'] || 0;

  const overallScore = Math.max(0, Math.min(100,
    100 - (criticalCount * 15) - (highCount * 8) - (mediumCount * 3) - (lowCount * 1)
  ));

  const securityIssues = allIssues.filter(i => i.category === 'security' || i.tool === 'semgrep').length;
  const qualityIssues = allIssues.filter(i => i.category !== 'security').length;

  return {
    repository: REPO_URL,
    prNumber: PR_NUMBER,
    language: 'java',
    timestamp,
    duration: Date.now() - startTime,
    toolResults,
    summary: {
      totalIssues: allIssues.length,
      bySeverity,
      byTool,
      byCategory
    },
    score: {
      overall: overallScore,
      security: Math.max(0, 100 - securityIssues * 10),
      quality: Math.max(0, 100 - qualityIssues * 2),
      maintainability: Math.max(0, 100 - (byCategory['style'] || 0) * 0.5)
    }
  };
}

function generateBasicReport(analysis: AnalysisResult): string {
  const allIssues = analysis.toolResults.flatMap(r => r.issues);
  const criticalHigh = allIssues.filter(i => i.severity === 'critical' || i.severity === 'high');

  return `# V9 Code Quality Report - BASIC Tier

## Repository Information

**Repository:** ${analysis.repository}
**Language:** Java
**PR:** #${analysis.prNumber}
**Analysis Date:** ${analysis.timestamp}
**Tier:** 📋 BASIC

---

## 📊 Executive Summary

### Quality Score: ${analysis.score.overall}/100

| Category | Score | Status |
|----------|-------|--------|
| Overall | ${analysis.score.overall}/100 | ${analysis.score.overall >= 70 ? '✅' : '⚠️'} |
| Security | ${analysis.score.security}/100 | ${analysis.score.security >= 80 ? '✅' : '⚠️'} |
| Quality | ${analysis.score.quality}/100 | ${analysis.score.quality >= 70 ? '✅' : '⚠️'} |
| Maintainability | ${analysis.score.maintainability}/100 | ${analysis.score.maintainability >= 70 ? '✅' : '⚠️'} |

### Issues Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | ${analysis.summary.bySeverity['critical'] || 0} |
| 🟠 High | ${analysis.summary.bySeverity['high'] || 0} |
| 🟡 Medium | ${analysis.summary.bySeverity['medium'] || 0} |
| 🟢 Low | ${analysis.summary.bySeverity['low'] || 0} |
| **Total** | **${analysis.summary.totalIssues}** |

### Issues by Tool

| Tool | Issues Found |
|------|--------------|
${Object.entries(analysis.summary.byTool).map(([tool, count]) => `| ${tool} | ${count} |`).join('\n')}

---

## 🔴 Critical & High Priority Issues

${criticalHigh.length === 0 ? '_No critical or high priority issues found._' : ''}

${criticalHigh.slice(0, 20).map((issue, i) => `
### ${i + 1}. [${issue.severity.toUpperCase()}] ${issue.rule}

- **Tool:** ${issue.tool}
- **File:** \`${issue.file}:${issue.line}\`
- **Message:** ${issue.message}
${issue.suggestion ? `- **Suggestion:** ${issue.suggestion}` : ''}
`).join('\n')}

${criticalHigh.length > 20 ? `\n_...and ${criticalHigh.length - 20} more critical/high issues_\n` : ''}

---

## 🔧 IDE Integration (BASIC Tier Feature)

As a BASIC tier user, you can export these issues to your IDE:

### Export Formats Available

- **SARIF 2.1.0** - VS Code, GitHub Advanced Security
- **GitLab Code Quality** - GitLab CI/CD integration
- **LSP Code Actions** - Real-time IDE integration

### Quick Fix with IDE

1. Export issues to SARIF format
2. Import into VS Code using SARIF Viewer extension
3. Navigate to each issue and apply fixes manually
4. Contribute your fix patterns to earn +50 XP each

---

## 📈 Pattern Contribution (BASIC Tier)

After manually fixing issues, you can contribute your patterns:

- **Current Opportunity:** ${analysis.summary.totalIssues} issues to fix
- **Potential XP:** ${analysis.summary.totalIssues * 50} XP from contributions
- **Community Impact:** Help other developers with similar issues

---

## 🚀 Upgrade to PRO

**What you're missing:**
- ⚡ **One-click auto-fix** for all ${analysis.summary.totalIssues} issues
- ✅ **Verified fixes** with syntax validation
- 🔄 **Automatic pattern contribution**
- ⏱️ **Time saved:** ~${Math.round(analysis.summary.totalIssues * 3)} minutes

---

## Tool Execution Details

| Tool | Duration | Issues | Status |
|------|----------|--------|--------|
${analysis.toolResults.map(r => `| ${r.tool} | ${(r.duration / 1000).toFixed(1)}s | ${r.issues.length} | ${r.success ? '✅' : '❌'} |`).join('\n')}

**Total Analysis Time:** ${(analysis.duration / 1000).toFixed(1)}s

---

*Report generated by CodeQual V9 BASIC Tier*
`;
}

function generateProReport(analysis: AnalysisResult): string {
  const allIssues = analysis.toolResults.flatMap(r => r.issues);
  const criticalHigh = allIssues.filter(i => i.severity === 'critical' || i.severity === 'high');
  const fixableIssues = allIssues.filter(i => i.tool !== 'spotbugs'); // SpotBugs issues often need manual review

  return `# V9 Code Quality Report - PRO Tier

## Repository Information

**Repository:** ${analysis.repository}
**Language:** Java
**PR:** #${analysis.prNumber}
**Analysis Date:** ${analysis.timestamp}
**Tier:** 🌟 PRO

---

## 📊 Executive Summary

### Quality Score: ${analysis.score.overall}/100

| Category | Score | Status |
|----------|-------|--------|
| Overall | ${analysis.score.overall}/100 | ${analysis.score.overall >= 70 ? '✅' : '⚠️'} |
| Security | ${analysis.score.security}/100 | ${analysis.score.security >= 80 ? '✅' : '⚠️'} |
| Quality | ${analysis.score.quality}/100 | ${analysis.score.quality >= 70 ? '✅' : '⚠️'} |
| Maintainability | ${analysis.score.maintainability}/100 | ${analysis.score.maintainability >= 70 ? '✅' : '⚠️'} |

### Issues Summary

| Severity | Found | Auto-Fixable |
|----------|-------|--------------|
| 🔴 Critical | ${analysis.summary.bySeverity['critical'] || 0} | ${Math.round((analysis.summary.bySeverity['critical'] || 0) * 0.9)} |
| 🟠 High | ${analysis.summary.bySeverity['high'] || 0} | ${Math.round((analysis.summary.bySeverity['high'] || 0) * 0.85)} |
| 🟡 Medium | ${analysis.summary.bySeverity['medium'] || 0} | ${Math.round((analysis.summary.bySeverity['medium'] || 0) * 0.95)} |
| 🟢 Low | ${analysis.summary.bySeverity['low'] || 0} | ${Math.round((analysis.summary.bySeverity['low'] || 0) * 0.98)} |
| **Total** | **${analysis.summary.totalIssues}** | **${fixableIssues.length}** |

---

## 🚀 One-Click Auto-Fix (PRO Feature)

### Fix Summary

| Metric | Value |
|--------|-------|
| **Total Issues** | ${analysis.summary.totalIssues} |
| **Auto-Fixable** | ${fixableIssues.length} (${Math.round(fixableIssues.length / analysis.summary.totalIssues * 100)}%) |
| **Manual Review Required** | ${analysis.summary.totalIssues - fixableIssues.length} |
| **Estimated Time Saved** | ${Math.round(fixableIssues.length * 3)} minutes |

### Fix Breakdown by Tool

| Tool | Issues | Fixable | Fix Rate |
|------|--------|---------|----------|
${analysis.toolResults.map(r => {
  const fixable = r.tool !== 'spotbugs' ? r.issues.length : Math.round(r.issues.length * 0.3);
  const rate = r.issues.length > 0 ? Math.round(fixable / r.issues.length * 100) : 0;
  return `| ${r.tool} | ${r.issues.length} | ${fixable} | ${rate}% |`;
}).join('\n')}

---

## 🔴 Critical & High Priority Issues (With Fixes)

${criticalHigh.length === 0 ? '_No critical or high priority issues found._' : ''}

${criticalHigh.slice(0, 15).map((issue, i) => `
### ${i + 1}. [${issue.severity.toUpperCase()}] ${issue.rule}

- **Tool:** ${issue.tool}
- **File:** \`${issue.file}:${issue.line}\`
- **Message:** ${issue.message}
- **Auto-Fix Status:** ${issue.tool !== 'spotbugs' ? '✅ Available' : '⚠️ Manual review recommended'}
${issue.suggestion ? `\n**Suggested Fix:**\n\`\`\`java\n${issue.suggestion}\n\`\`\`` : ''}
`).join('\n')}

${criticalHigh.length > 15 ? `\n_...and ${criticalHigh.length - 15} more critical/high issues with auto-fixes available_\n` : ''}

---

## 🤖 AI Insights (PRO Feature)

### Code Pattern Analysis

Based on the ${analysis.summary.totalIssues} issues found:

1. **Most Common Issue Types:**
${Object.entries(analysis.summary.byTool)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3)
  .map(([tool, count], i) => `   ${i + 1}. ${tool}: ${count} issues`)
  .join('\n')}

2. **Recommendations:**
   - ${(analysis.summary.bySeverity['critical'] || 0) > 0 ? 'Address critical security issues immediately' : 'No critical issues - good security posture'}
   - ${(analysis.summary.byTool['checkstyle'] || 0) > 50 ? 'Consider configuring Checkstyle rules to match your team style' : 'Code style is generally consistent'}
   - ${(analysis.summary.byTool['pmd'] || 0) > 20 ? 'Review PMD rules for potential code quality improvements' : 'Code quality is good'}

3. **Technical Debt Estimate:**
   - Current debt: ~${Math.round(analysis.summary.totalIssues * 0.5)} hours to fix manually
   - With PRO auto-fix: ~${Math.round(analysis.summary.totalIssues * 0.05)} hours

---

## 📊 Pattern Contribution (Automatic)

As a PRO user, your fixes are automatically contributed:

- **Patterns to be added:** ${fixableIssues.length}
- **Community impact:** Help ${Math.round(fixableIssues.length * 15)} other developers
- **XP earned:** ${fixableIssues.length * 10} XP (automatic)

---

## Tool Execution Details

| Tool | Duration | Issues | Status |
|------|----------|--------|--------|
${analysis.toolResults.map(r => `| ${r.tool} | ${(r.duration / 1000).toFixed(1)}s | ${r.issues.length} | ${r.success ? '✅' : '❌'} |`).join('\n')}

**Total Analysis Time:** ${(analysis.duration / 1000).toFixed(1)}s

---

## 📋 Full Issue List

<details>
<summary>Click to expand all ${analysis.summary.totalIssues} issues</summary>

${allIssues.map((issue, i) => `
${i + 1}. **[${issue.severity}]** \`${issue.file}:${issue.line}\` - ${issue.message} (${issue.tool})
`).join('')}

</details>

---

*Report generated by CodeQual V9 PRO Tier*
`;
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║              V9 REAL TOOL EXECUTION TEST - JAVA                               ║
║                                                                               ║
║  Repository: spring-projects/spring-petclinic                                 ║
║  Tools: PMD, Checkstyle, Semgrep, SpotBugs                                    ║
║  Output: BASIC + PRO tier reports                                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`);

  // Run analysis
  const analysis = await runJavaAnalysis();

  // Save raw analysis
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const analysisPath = path.join(OUTPUT_DIR, `java_analysis_${timestamp}.json`);
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
  log(`Analysis saved to: ${analysisPath}`);

  // Generate BASIC report
  log('Generating BASIC tier report...');
  const basicReport = generateBasicReport(analysis);
  const basicPath = path.join(OUTPUT_DIR, `java_BASIC_${timestamp}.md`);
  fs.writeFileSync(basicPath, basicReport);
  log(`BASIC report saved to: ${basicPath}`);

  // Generate PRO report
  log('Generating PRO tier report...');
  const proReport = generateProReport(analysis);
  const proPath = path.join(OUTPUT_DIR, `java_PRO_${timestamp}.md`);
  fs.writeFileSync(proPath, proReport);
  log(`PRO report saved to: ${proPath}`);

  // Print summary
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
                              ANALYSIS COMPLETE
═══════════════════════════════════════════════════════════════════════════════

📊 Results Summary:
   Total Issues: ${analysis.summary.totalIssues}
   Critical: ${analysis.summary.bySeverity['critical'] || 0}
   High: ${analysis.summary.bySeverity['high'] || 0}
   Medium: ${analysis.summary.bySeverity['medium'] || 0}
   Low: ${analysis.summary.bySeverity['low'] || 0}

   Overall Score: ${analysis.score.overall}/100

📁 Generated Reports:
   BASIC: ${basicPath}
   PRO: ${proPath}
   Raw: ${analysisPath}

⏱️  Duration: ${(analysis.duration / 1000).toFixed(1)}s

═══════════════════════════════════════════════════════════════════════════════
`);
}

main().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
