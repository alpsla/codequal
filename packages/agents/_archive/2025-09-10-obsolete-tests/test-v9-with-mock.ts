/**
 * V9 Analyzer Test with Mock Data
 * Demonstrates smart file selection and report generation
 */

import { V9JavaAnalyzer } from './src/two-branch/analyzers/v9-java-analyzer';
import { Issue } from './src/two-branch/analyzers/v9-types';
import * as fs from 'fs';
import * as path from 'path';

// Mock environment for testing
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key';

class MockV9JavaAnalyzer extends V9JavaAnalyzer {
  // Override to use mock data instead of real analysis
  async analyzePR(repoUrl: string, prNumber: number): Promise<void> {
    console.log('\n🚀 Starting V9 Analysis with Smart File Selection Demo\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Simulate repository information
    const repoInfo = {
      url: repoUrl,
      prNumber: prNumber,
      name: 'spring-projects/spring-petclinic',
      author: 'Sarah Chen',
      authorUsername: 'sarahchen',
      branch: 'feature/add-pet-vaccination-tracking',
      mainBranch: 'main',
      title: 'Add Pet Vaccination Tracking Feature'
    };
    
    console.log(`📦 Repository: ${repoInfo.name}`);
    console.log(`🔀 Pull Request: #${prNumber} - ${repoInfo.title}`);
    console.log(`👤 Author: ${repoInfo.author} (@${repoInfo.authorUsername})`);
    console.log(`📝 Branch: ${repoInfo.branch} → ${repoInfo.mainBranch}\n`);
    
    // Simulate file counting for smart selection
    console.log('📊 Analyzing repository size...');
    const mockFileCount = 12500;  // Large repository
    const mockLOC = 85000;         // Large codebase
    
    console.log(`   - Files: ${mockFileCount.toLocaleString()}`);
    console.log(`   - Lines of code: ${mockLOC.toLocaleString()}`);
    console.log(`   → Using smart file selection (500 file limit)\n`);
    
    // Simulate smart file selection with improved backfill
    console.log('📁 Smart File Selection Results:');
    console.log('   - PR modified files: 4');
    console.log('   - Security-critical files: 323 (includes backfill)');
    console.log('   - Entry points: 45');
    console.log('   - Configuration files: 12');
    console.log('   - Test files: 120');
    console.log('   - Total selected: 494 files (optimized to reach 500 target)\n');
    
    // Modified files
    const modifiedFiles = [
      'src/main/java/org/springframework/samples/petclinic/owner/PetController.java',
      'src/main/java/org/springframework/samples/petclinic/owner/Pet.java',
      'src/main/java/org/springframework/samples/petclinic/model/Vaccination.java',
      'src/main/java/org/springframework/samples/petclinic/service/VaccinationService.java'
    ];
    
    console.log('🔄 Files Modified in PR:');
    modifiedFiles.forEach(file => console.log(`   • ${file}`));
    console.log();
    
    // Simulate tool execution
    console.log('🔧 Running Analysis Tools:');
    console.log('   ✓ SpotBugs - completed in 3.2s');
    console.log('   ✓ PMD - completed in 2.1s');
    console.log('   ✓ Checkstyle - completed in 1.8s');
    console.log('   ✓ Dependency Check - completed in 4.5s');
    console.log('   ✓ Semgrep - completed in 2.7s\n');
    
    // Create mock issues
    const newIssues: Issue[] = [
      {
        id: 'SQL-001',
        category: 'Security',
        severity: 'critical',
        status: 'new',
        title: 'SQL Injection Vulnerability',
        description: 'Direct SQL concatenation with user input detected',
        file: 'src/main/java/org/springframework/samples/petclinic/service/VaccinationService.java',
        line: 45,
        tool: 'spotbugs',
        agent: 'SecurityAnalyzer',
        impact: 'High risk of data breach',
        businessImpact: 'Potential $4.35M breach cost',
        suggestedFix: 'Use PreparedStatement with parameterized queries',
        codeSnippet: 'String query = "SELECT * FROM vaccinations WHERE pet_name = \'" + petName + "\'"'
      },
      {
        id: 'SEC-002',
        category: 'Security',
        severity: 'critical',
        status: 'new',
        title: 'Hardcoded Database Credentials',
        description: 'Database password stored in plain text',
        file: 'src/main/java/org/springframework/samples/petclinic/service/VaccinationService.java',
        line: 12,
        tool: 'semgrep',
        agent: 'SecurityAnalyzer',
        impact: 'Exposes production database',
        businessImpact: 'Complete system compromise risk',
        suggestedFix: 'Use environment variables or secure vault'
      },
      {
        id: 'AUTH-001',
        category: 'Security',
        severity: 'high',
        status: 'new',
        title: 'Missing Authentication Check',
        description: 'Endpoint lacks proper authorization',
        file: 'src/main/java/org/springframework/samples/petclinic/owner/PetController.java',
        line: 78,
        tool: 'pmd',
        agent: 'SecurityAnalyzer',
        impact: 'Unauthorized data modification',
        businessImpact: 'Data integrity compromise',
        suggestedFix: 'Add @PreAuthorize annotation'
      }
    ];
    
    const existingInModified: Issue[] = [
      {
        id: 'XSS-001',
        category: 'Security',
        severity: 'critical',
        status: 'existing',
        title: 'Cross-Site Scripting (XSS)',
        description: 'User input rendered without HTML escaping',
        file: 'src/main/java/org/springframework/samples/petclinic/owner/PetController.java',
        line: 34,
        tool: 'spotbugs',
        agent: 'SecurityAnalyzer',
        impact: 'Script injection possible',
        businessImpact: 'User account compromise',
        suggestedFix: 'Use HtmlUtils.htmlEscape()'
      }
    ];
    
    const existingInUnmodified: Issue[] = [];
    // Add many existing issues in unmodified files to show they don't block
    for (let i = 0; i < 15; i++) {
      existingInUnmodified.push({
        id: `LEGACY-${i}`,
        category: 'Security',
        severity: 'critical',
        status: 'existing',
        title: `Legacy Security Issue ${i}`,
        description: 'Pre-existing issue in unmodified file',
        file: 'src/main/java/org/springframework/samples/petclinic/system/CacheConfiguration.java',
        line: 100 + i,
        tool: 'spotbugs',
        agent: 'SecurityAnalyzer',
        impact: 'Technical debt',
        businessImpact: 'Accumulated risk',
        suggestedFix: 'Refactor in future sprint'
      });
    }
    
    const resolvedIssues: Issue[] = [
      {
        id: 'FIXED-001',
        category: 'Security',
        severity: 'high',
        status: 'resolved',
        title: 'Fixed Authentication Bypass',
        description: 'Authentication vulnerability has been resolved',
        file: 'src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java',
        line: 45,
        tool: 'spotbugs',
        agent: 'SecurityAnalyzer',
        impact: 'Risk mitigated',
        businessImpact: 'Security improved',
        suggestedFix: 'Already fixed'
      }
    ];
    
    // Calculate metrics
    const blockingIssues = [
      ...newIssues.filter(i => ['critical', 'high'].includes(i.severity)),
      ...existingInModified.filter(i => ['critical', 'high'].includes(i.severity))
    ];
    
    // Calculate score
    let score = 100;
    // New issues
    score -= newIssues.filter(i => i.severity === 'critical').length * 5;
    score -= newIssues.filter(i => i.severity === 'high').length * 3;
    // Existing in modified
    score -= existingInModified.filter(i => i.severity === 'critical').length * 5;
    // Existing in unmodified (affects score but doesn't block)
    score -= existingInUnmodified.filter(i => i.severity === 'critical').length * 5;
    // Resolved issues add points
    score += resolvedIssues.filter(i => i.severity === 'high').length * 3;
    
    score = Math.max(0, Math.min(100, score));
    
    console.log('📊 Analysis Results:');
    console.log(`   • New Issues: ${newIssues.length}`);
    console.log(`   • Existing in Modified Files: ${existingInModified.length}`);
    console.log(`   • Existing in Unmodified Files: ${existingInUnmodified.length}`);
    console.log(`   • Resolved Issues: ${resolvedIssues.length}`);
    console.log(`   • Blocking Issues: ${blockingIssues.length}`);
    console.log(`   • Quality Score: ${score}/100\n`);
    
    const decision = blockingIssues.length > 0 ? 'DECLINED' : 'APPROVED';
    console.log(`📋 Decision: ${decision}`);
    
    if (blockingIssues.length > 0) {
      console.log(`   Reason: ${blockingIssues.length} blocking issues must be resolved`);
    } else {
      console.log(`   Reason: No blocking issues found, score meets threshold`);
    }
    
    // Generate the report
    const report = this.generateMockReport(
      repoInfo,
      newIssues,
      existingInModified,
      existingInUnmodified,
      resolvedIssues,
      blockingIssues,
      score,
      decision,
      modifiedFiles
    );
    
    // Save the report
    const reportPath = path.join(process.cwd(), `V9_ANALYSIS_REPORT_${Date.now()}.md`);
    fs.writeFileSync(reportPath, report);
    
    console.log(`\n✅ Report generated: ${reportPath}\n`);
    console.log('═══════════════════════════════════════════════════════\n');
  }
  
  private generateMockReport(
    repoInfo: any,
    newIssues: Issue[],
    existingInModified: Issue[],
    existingInUnmodified: Issue[],
    resolvedIssues: Issue[],
    blockingIssues: Issue[],
    score: number,
    decision: string,
    modifiedFiles: string[]
  ): string {
    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
    const timestamp = new Date().toISOString();
    
    return `# CodeQual V9 Analysis Report

**Hello ${repoInfo.author} (@${repoInfo.authorUsername})!** 👋

Thank you for submitting PR #${repoInfo.prNumber} to enhance ${repoInfo.name.split('/')[1]}. I've completed a comprehensive analysis of your changes using our V9 analyzer with smart file selection.

**Repository:** ${repoInfo.name}  
**Pull Request:** #${repoInfo.prNumber} - ${repoInfo.title}  
**Author:** ${repoInfo.author} (@${repoInfo.authorUsername})  
**Branch:** \`${repoInfo.branch}\` → \`${repoInfo.mainBranch}\`  
**Analysis Date:** ${new Date().toLocaleDateString()}  
**Session ID:** v9-analysis-${timestamp}  

---

## 📊 Decision

### ${decision === 'APPROVED' ? '✅' : '❌'} **${decision}**

${blockingIssues.length > 0 
  ? `**Hi ${repoInfo.author.split(' ')[0]}**, I found ${blockingIssues.length} critical issues that need your attention before we can merge this PR. Don't worry - I'll show you exactly how to fix them!`
  : `**Great work ${repoInfo.author.split(' ')[0]}!** Your code meets our quality standards and is ready to merge.`}

---

## 🎯 Overall Score

### **${score}/100 (Grade: ${grade})**

\`\`\`
Score Breakdown:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Starting Score:                    100.0 points

Your New Code:
    • Critical (${newIssues.filter(i => i.severity === 'critical').length}):                -${newIssues.filter(i => i.severity === 'critical').length * 5}.0
    • High (${newIssues.filter(i => i.severity === 'high').length}):                    -${newIssues.filter(i => i.severity === 'high').length * 3}.0
    
Files You Modified:
    • Existing issues to fix:      -${existingInModified.filter(i => i.severity === 'critical').length * 5}.0
    
Technical Debt (not blocking):
    • Pre-existing issues:          -${existingInUnmodified.filter(i => i.severity === 'critical').length * 5}.0
    
Your Improvements:
    • Issues you fixed:             +${resolvedIssues.filter(i => i.severity === 'high').length * 3}.0 ⭐
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Final Score:                       ${score.toFixed(1)}/100
\`\`\`

---

## 🚫 Blocking Issues (${blockingIssues.length} Must-Fix Items)

${blockingIssues.length === 0 ? '*No blocking issues found - excellent work!*' : blockingIssues.map((issue, index) => `
### ${index + 1}. ${issue.title}
**File:** \`${issue.file}\`  
**Line:** ${issue.line}  
**Severity:** ${issue.severity}  
**Category:** ${issue.category}  

**Current Code:**
\`\`\`java
${issue.codeSnippet}
\`\`\`

**The Problem:** ${issue.description}

**How to Fix:**
\`\`\`java
${issue.suggestedFix}
\`\`\`
`).join('\n')}

---

## 📋 Non-Blocking Issues

### Technical Debt in Unmodified Files (${existingInUnmodified.length})
*These ${existingInUnmodified.length} critical issues exist in files you didn't modify. They affect your score but don't block the PR.*

- \`CacheConfiguration.java\`: ${existingInUnmodified.filter(i => i.file.includes('CacheConfiguration')).length} legacy security issues
- Various other unmodified files contain technical debt
- These will be addressed in future sprints

---

## ✅ Resolved Issues (${resolvedIssues.length})

Great work fixing these issues! You've earned back points:

${resolvedIssues.map(issue => `- ✅ ${issue.title} - Fixed in \`${issue.file}\``).join('\n')}

---

## 📊 Smart File Selection Report

### Repository Analysis
\`\`\`
Repository Size:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Files:           12,500 files
Lines of Code:         85,000 LOC
Classification:        Large Repository
Analysis Strategy:     Smart File Selection ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

### Files Selected for Analysis
\`\`\`
Smart Selection Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files Analyzed:        494 / 12,500 (3.9%)
Selection Strategy:    Priority-based + Backfill

Breakdown:
• PR Modified:         4 files (100% coverage)
• Security-Critical:   323 files (auth, services, repos)
• Entry Points:        45 files (controllers)
• Configuration:       12 files (pom.xml, etc)
• Test Files:          120 files (unit + integration)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Performance Impact:
• Analysis Time:       28.6 seconds (vs ~5 min)
• Files Skipped:       12,006 (96.1%)
• Speed Improvement:   ~10x faster
• Coverage Quality:    Near-optimal (494/500 target)
\`\`\`

---

## 🎓 Personalized Learning Path

Based on the specific issues found:

### Phase 1: Fix Blocking Issues (This Week)

#### SQL Injection Prevention
- **Quick Fix** (15 min): [Spring JdbcTemplate Best Practices](https://spring.io/guides)
- **Your Fix**: Replace string concatenation with parameterized queries

#### Secure Configuration
- **Quick Fix** (10 min): [Environment Variables in Spring Boot](https://spring.io/guides)
- **Your Fix**: Move credentials to application.yml with \${} placeholders

---

## 💰 Business Impact

### Risk Analysis
- **Current Risk Exposure**: $4.35M (potential breach cost)
- **After Fixes**: < $50K (residual risk)
- **ROI of Fixes**: 87:1 (4 hours work prevents millions in losses)

---

## 📈 Your Performance

| Metric | Your Score | Team Average |
|--------|------------|--------------|
| Issues Introduced | ${newIssues.length} | 8 |
| Issues Fixed | ${resolvedIssues.length} | 3 |
| Code Quality | ${score}% | 75% |

---

## ✅ Next Steps

${blockingIssues.length > 0 ? `
1. Fix the ${blockingIssues.length} blocking issues listed above
2. Run \`npm test\` to verify fixes
3. Push changes and re-run analysis
4. Expected score after fixes: ~${score + blockingIssues.length * 4}/100
` : `
1. Your PR is ready to merge!
2. Consider addressing technical debt in future PRs
3. Keep up the excellent work!
`}

---

## 💬 PR Comment

\`\`\`markdown
## CodeQual Analysis - V9

Hi @${repoInfo.authorUsername}! 

**Score:** ${score}/100 (Grade: ${grade})  
**Status:** ${decision === 'APPROVED' ? '✅ Ready to merge' : `❌ ${blockingIssues.length} issues need attention`}

${blockingIssues.length > 0 ? `
### Action Required 🔧
I found ${blockingIssues.length} issues that need fixing:
${blockingIssues.map(i => `- ${i.title} (\`${i.file.split('/').pop()}:${i.line}\`)`).join('\n')}

Each issue has a specific fix provided in the full report.
` : `
### Great Work! 🎉
No blocking issues found. Your code is ready to merge.
`}

**Smart Selection:** Analyzed 494 of 12,500 files (10x faster, near-optimal coverage)

[View Full Report](https://codequal.io/reports/v9-${timestamp})
\`\`\`

---

*Generated by CodeQual V9 with Smart File Selection - Optimized for Large Repositories*`;
  }
}

// Run the test
async function runTest() {
  const analyzer = new MockV9JavaAnalyzer();
  
  try {
    await analyzer.analyzePR(
      'https://github.com/spring-projects/spring-petclinic',
      1234
    );
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Execute
runTest();