/**
 * Simple AI Report Test
 * Tests the AI impact categorization with a simplified report generation
 */

import { AIImpactCategorizer } from './src/standard/comparison/ai-impact-categorizer';
import { ModelVersionSync } from '@codequal/core';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('test-simple-ai-report');

async function generateSimpleReport() {
  console.log('🚀 Generating Simple Report with AI Impact Categorization\n');
  console.log('=' .repeat(60));
  
  try {
    // Initialize model version sync
    const modelVersionSync = new ModelVersionSync(
      logger,
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    );
    
    // Create AI Impact Categorizer
    const aiCategorizer = new AIImpactCategorizer(modelVersionSync);
    
    // Sample issues from a real PR analysis
    const newIssues = [
      {
        severity: 'critical',
        category: 'security',
        message: 'SQL injection vulnerability in user query endpoint',
        location: { file: 'api/users/search.ts', line: 89 }
      },
      {
        severity: 'high',
        category: 'performance',
        message: 'Memory leak in WebSocket connection handler',
        location: { file: 'realtime/ws-handler.ts', line: 234 }
      },
      {
        severity: 'medium',
        category: 'security',
        message: 'Sensitive data logged in production',
        location: { file: 'utils/logger.ts', line: 78 }
      }
    ];
    
    // Generate report with AI impacts
    let report = `# Pull Request Analysis Report

**Repository:** example-repo  
**PR:** #123 - Add new features  
**Date:** ${new Date().toISOString()}  

---

## PR Decision: ❌ DECLINED - CRITICAL ISSUES MUST BE FIXED

This PR introduces ${newIssues.filter(i => i.severity === 'critical').length} critical and ${newIssues.filter(i => i.severity === 'high').length} high severity issues that must be resolved.

---

## Issues Found (${newIssues.length})

`;
    
    // Add issues with AI-generated impacts
    for (const issue of newIssues) {
      const impact = await aiCategorizer.getSpecificImpact(issue as any);
      
      report += `### ${issue.severity.toUpperCase()}: ${issue.message}
**File:** ${issue.location.file}:${issue.location.line}  
**Impact:** ${impact}  
**Category:** ${issue.category}

---

`;
    }
    
    report += `## Summary

**Critical Issues:** ${newIssues.filter(i => i.severity === 'critical').length}  
**High Issues:** ${newIssues.filter(i => i.severity === 'high').length}  
**Medium Issues:** ${newIssues.filter(i => i.severity === 'medium').length}  

All critical and high severity issues must be fixed before merge.
`;
    
    // Save report
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `./test-outputs/simple-ai-report-${timestamp}.md`;
    
    if (!fs.existsSync('./test-outputs')) {
      fs.mkdirSync('./test-outputs', { recursive: true });
    }
    
    fs.writeFileSync(reportPath, report);
    
    console.log('📄 Report Generated:\n');
    console.log(report);
    console.log('\n' + '=' .repeat(60));
    console.log(`\n✅ Report saved to: ${reportPath}`);
    
    // Display AI-generated impacts
    console.log('\n✨ AI-Generated Impacts:');
    const impactRegex = /\*\*Impact:\*\* ([^\n]+)/g;
    const impacts = [...report.matchAll(impactRegex)];
    impacts.forEach((match, index) => {
      console.log(`  ${index + 1}. ${match[1]}`);
    });
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
generateSimpleReport().catch(console.error);