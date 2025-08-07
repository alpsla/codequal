#!/usr/bin/env node

/**
 * Generate Comprehensive PR Analysis Report Demo
 * 
 * This demonstrates the full report format using mock data,
 * matching the critical-pr-report.md template exactly.
 */

const { ComparisonAgent } = require('./dist/standard/comparison/comparison-agent');
const { generateEnhancedMockAnalysis } = require('../../apps/api/dist/services/deepwiki-mock-enhanced');
const fs = require('fs');
const path = require('path');

const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  debug: () => {}
};

async function generateComprehensiveReport() {
  try {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     COMPREHENSIVE PR ANALYSIS REPORT - DEMONSTRATION          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    console.log('This demonstrates the comprehensive report format matching critical-pr-report.md\n');
    
    const comparisonAgent = new ComparisonAgent(logger);
    
    // Initialize with configuration
    await comparisonAgent.initialize({
      language: 'typescript',
      complexity: 'high',
      performance: 'optimized',
      rolePrompt: 'You are an expert code reviewer focused on security, performance, and architectural best practices.'
    });
    
    // Repository for demo
    const repoUrl = 'https://github.com/vercel/next.js';
    const prNumber = 72000;
    
    console.log(`📦 Repository: ${repoUrl}`);
    console.log(`📝 PR #${prNumber}: Performance optimizations for SSR\n`);
    
    // Generate mock data for main branch
    console.log('🔍 Analyzing main branch...');
    const mainMockData = generateEnhancedMockAnalysis(repoUrl, { branch: 'main' });
    const mainAnalysis = {
      issues: mainMockData.vulnerabilities.map(v => ({
        id: v.id,
        severity: v.severity.toLowerCase(),
        category: v.category.toLowerCase().replace(' ', '-'),
        type: 'vulnerability',
        message: v.title,
        title: v.title,
        description: v.impact,
        location: v.location,
        codeSnippet: v.evidence?.snippet,
        suggestedFix: v.remediation.steps.join('\n'),
        metadata: {
          cwe: v.cwe?.id,
          cvss: v.cvss,
          remediation: v.remediation
        }
      })),
      scores: {
        overall: 74,
        security: 72,
        performance: 78,
        maintainability: 76,
        testing: 71,
        codeQuality: 75
      }
    };
    
    console.log(`  ✅ Found ${mainAnalysis.issues.length} issues`);
    console.log(`  📊 Overall score: ${mainAnalysis.scores.overall}\n`);
    
    // Generate mock data for PR branch (different issues)
    console.log('🔍 Analyzing PR branch...');
    const prMockData = generateEnhancedMockAnalysis(repoUrl, { branch: 'pr/72000' });
    const prAnalysis = {
      issues: prMockData.vulnerabilities.map(v => ({
        id: v.id,
        severity: v.severity.toLowerCase(),
        category: v.category.toLowerCase().replace(' ', '-'),
        type: 'vulnerability',
        message: v.title,
        title: v.title,
        description: v.impact,
        location: v.location,
        codeSnippet: v.evidence?.snippet,
        suggestedFix: v.remediation.steps.join('\n'),
        metadata: {
          cwe: v.cwe?.id,
          cvss: v.cvss,
          remediation: v.remediation
        }
      })),
      scores: {
        overall: 68,
        security: 65,
        performance: 82,  // Better performance due to optimizations
        maintainability: 71,
        testing: 68,
        codeQuality: 70
      }
    };
    
    console.log(`  ✅ Found ${prAnalysis.issues.length} issues`);
    console.log(`  📊 Overall score: ${prAnalysis.scores.overall}`);
    console.log(`  🚀 Performance improved: ${prAnalysis.scores.performance} (+${prAnalysis.scores.performance - mainAnalysis.scores.performance})\n`);
    
    // Run comprehensive comparison
    console.log('📊 Generating comprehensive comparison report...\n');
    const result = await comparisonAgent.analyze({
      mainBranchAnalysis: mainAnalysis,
      featureBranchAnalysis: prAnalysis,
      prMetadata: {
        number: prNumber,
        title: 'Performance optimizations for Server-Side Rendering',
        description: `This PR implements critical performance optimizations for SSR:

## Changes
- **Optimized hydration**: Reduced client-side hydration time by 40%
- **Bundle splitting**: Implemented intelligent code splitting reducing initial bundle by 30%
- **Caching strategy**: Added multi-layer caching for SSR pages
- **Memory management**: Fixed memory leaks in production builds
- **Streaming support**: Added React 18 streaming SSR support

## Performance Impact
- Initial page load: -30% faster
- Time to Interactive: -35% improvement  
- Memory usage: -40% reduction
- Build times: -20% faster

## Testing
- All existing tests pass
- Added 45 new performance tests
- Load testing shows significant improvements`,
        author: 'Sarah Chen',
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        repository_url: repoUrl,
        filesChanged: 89,
        linesAdded: 2847,
        linesRemoved: 1523
      },
      userProfile: {
        userId: 'sarah-chen-001',
        username: 'schen',
        overallScore: 85,
        categoryScores: {
          security: 88,
          performance: 92,  // High performance skills
          codeQuality: 85,
          architecture: 87,
          dependencies: 82,
          testing: 84
        },
        level: 'Senior Developer',
        tenure: '2.5 years',
        previousPRs: 234,
        approvalRate: 0.96,
        specializations: ['Performance Optimization', 'React', 'SSR', 'Architecture']
      },
      historicalIssues: [
        { 
          id: 'HIST-001', 
          severity: 'critical', 
          category: 'security', 
          fixed: true, 
          age: '2 months',
          description: 'XSS vulnerability in dynamic content rendering'
        },
        { 
          id: 'HIST-002', 
          severity: 'high', 
          category: 'performance', 
          fixed: true, 
          age: '1 month',
          description: 'Memory leak in SSR cache invalidation'
        },
        { 
          id: 'HIST-003', 
          severity: 'critical', 
          category: 'security', 
          fixed: false, 
          age: '4 months',
          description: 'CSRF vulnerability in API routes'
        },
        { 
          id: 'HIST-004', 
          severity: 'high', 
          category: 'dependencies', 
          fixed: false, 
          age: '6 months',
          description: 'Multiple vulnerable dependencies need updating'
        },
        { 
          id: 'HIST-005', 
          severity: 'medium', 
          category: 'code-quality', 
          fixed: true, 
          age: '3 weeks',
          description: 'High cyclomatic complexity in router module'
        }
      ],
      generateReport: true,
      generatePRComment: true
    });
    
    console.log('✅ Analysis complete!\n');
    
    // Display summary
    if (result.success && result.summary) {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                    ANALYSIS SUMMARY                        ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      
      console.log('📊 Issue Changes:');
      console.log(`  ✅ Resolved: ${result.summary.totalResolved} issues`);
      console.log(`  🆕 New: ${result.summary.totalNew} issues`);
      console.log(`  📝 Modified: ${result.summary.totalModified} issues`);
      console.log(`  ⏸️  Unchanged: ${result.summary.totalUnchanged} issues\n`);
      
      // Check for blocking issues
      const criticalNew = result.newIssues?.filter(i => i.issue?.severity === 'critical').length || 0;
      const highNew = result.newIssues?.filter(i => i.issue?.severity === 'high').length || 0;
      
      console.log('🎯 PR Decision Analysis:');
      console.log(`  Critical new issues: ${criticalNew}`);
      console.log(`  High new issues: ${highNew}`);
      
      if (criticalNew > 0) {
        console.log('  Decision: ❌ DECLINED - Critical issues must be fixed');
      } else if (highNew > 0) {
        console.log('  Decision: ⚠️ REVIEW REQUIRED - High priority issues need attention');
      } else {
        console.log('  Decision: ✅ APPROVED - No blocking issues found');
      }
    }
    
    // Save the comprehensive report
    if (result.report) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportsDir = path.join(__dirname, 'reports', 'comprehensive');
      
      // Ensure directory exists
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      // Save timestamped version
      const reportPath = path.join(reportsDir, `pr-${prNumber}-comprehensive-${timestamp}.md`);
      fs.writeFileSync(reportPath, result.report);
      
      // Save as latest for easy access
      const latestPath = path.join(__dirname, 'COMPREHENSIVE-PR-REPORT.md');
      fs.writeFileSync(latestPath, result.report);
      
      console.log('\n📄 Report Files:');
      console.log(`  ✅ Saved to: ${reportPath}`);
      console.log(`  ✅ Latest: COMPREHENSIVE-PR-REPORT.md`);
      
      // Validate all required sections
      console.log('\n✔️ Report Section Validation:');
      const requiredSections = [
        'Pull Request Analysis Report',
        'PR Decision:',
        'Executive Summary',
        'Overall Score:',
        'Key Metrics',
        'Issue Distribution',
        'Security Analysis',
        'Performance Analysis', 
        'Code Quality Analysis',
        'Architecture Analysis',
        'Dependencies Analysis',
        'Testing Analysis',
        'PR Issues',
        'Repository Issues',
        'Educational Insights',
        'Individual & Team Skills Tracking',
        'Business Impact',
        'Action Items',
        'Score Impact Summary'
      ];
      
      let allPresent = true;
      let missingCount = 0;
      for (const section of requiredSections) {
        const present = result.report.includes(section);
        if (!present) {
          console.log(`  ❌ Missing: ${section}`);
          allPresent = false;
          missingCount++;
        }
      }
      
      if (allPresent) {
        console.log('  ✅ All 19 required sections present!');
      } else {
        console.log(`  ⚠️ ${missingCount} sections missing`);
      }
      
      // Report statistics
      const lines = result.report.split('\n');
      console.log('\n📊 Report Statistics:');
      console.log(`  Lines: ${lines.length}`);
      console.log(`  Characters: ${result.report.length}`);
      console.log(`  Size: ${(result.report.length / 1024).toFixed(2)} KB`);
      
      // Display preview
      console.log('\n════════════════════════════════════════════════════════════');
      console.log('                    REPORT PREVIEW                          ');
      console.log('════════════════════════════════════════════════════════════\n');
      console.log(lines.slice(0, 100).join('\n'));
      console.log('\n... [See COMPREHENSIVE-PR-REPORT.md for full report]');
    } else {
      console.log('\n❌ No report generated');
    }
    
    // Save PR comment if generated
    if (result.prComment) {
      const commentPath = path.join(__dirname, 'reports', 'comprehensive', `pr-${prNumber}-comment.md`);
      fs.writeFileSync(commentPath, result.prComment);
      console.log(`\n✅ PR comment saved to: ${commentPath}`);
    }
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ REPORT GENERATION COMPLETE                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n📖 To review the full comprehensive report:');
    console.log('   cat COMPREHENSIVE-PR-REPORT.md');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  setTimeout(() => process.exit(0), 1000);
}

// Run the generator
console.log('Starting comprehensive PR analysis report generation...\n');
generateComprehensiveReport();