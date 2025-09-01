/**
 * Test Complete MCP Flow
 * 
 * Demonstrates the full orchestration without DeepWiki
 */

import { MCPBasedOrchestrator } from '../orchestrators/mcp-based-orchestrator';

async function testCompleteMCPFlow() {
  console.log('🚀 Testing Complete MCP-Based Flow (No DeepWiki!)');
  console.log('================================================\n');
  
  // Initialize orchestrator
  const orchestrator = new MCPBasedOrchestrator();
  
  // Test with a real GitHub PR
  const repoUrl = 'https://github.com/sindresorhus/ky';
  const prNumber = 700; // Example PR
  
  try {
    console.log(`📊 Analyzing PR: ${repoUrl}#${prNumber}`);
    console.log('This will:');
    console.log('1. Get git diff from GitHub');
    console.log('2. Run MCP tools on both branches');
    console.log('3. Process with specialized agents');
    console.log('4. Compare with git diff integration');
    console.log('5. Generate educational content');
    console.log('6. Calculate skill impact\n');
    
    const startTime = Date.now();
    
    // Run the complete analysis
    const result = await orchestrator.analyzePullRequest(
      repoUrl,
      prNumber,
      {
        includeEducation: true,
        updateSkills: true
      }
    );
    
    const duration = Date.now() - startTime;
    
    // Display results
    console.log('\n✅ Analysis Complete!');
    console.log('====================\n');
    
    // Decision
    console.log(`📋 DECISION: ${result.summary.decision.toUpperCase()} ${getEmoji(result.summary.decision)}`);
    console.log(`   Confidence: ${(result.summary.confidence * 100).toFixed(0)}%`);
    console.log(`   Quality Score: ${result.summary.qualityScore}/100\n`);
    
    // Reasons
    console.log('📝 Reasons:');
    result.summary.reasons.forEach(reason => {
      console.log(`   - ${reason}`);
    });
    console.log('');
    
    // Issue Summary
    const comparison = result.comparison.summary;
    console.log('📊 Issue Summary:');
    console.log(`   ✅ Resolved: ${comparison.totalResolved} issues`);
    console.log(`   📌 Existing: ${comparison.totalExisting} issues (pre-existing)`);
    console.log(`   ❌ New in diff: ${comparison.totalNewInDiff} issues (introduced)`);
    console.log(`   ⚠️  New in files: ${comparison.totalNewInFiles} issues (should clean)\n`);
    
    // Per-category breakdown
    console.log('📁 By Category:');
    Object.entries(result.comparison.byCategory).forEach(([category, data]: [string, any]) => {
      const hasIssues = data.summary.totalResolved > 0 || 
                       data.summary.totalNewInDiff > 0 || 
                       data.summary.totalNewInFiles > 0;
      
      if (hasIssues) {
        console.log(`   ${formatCategory(category)}:`);
        if (data.summary.totalResolved > 0) {
          console.log(`     ✅ Fixed: ${data.summary.totalResolved}`);
        }
        if (data.summary.totalNewInDiff > 0) {
          console.log(`     ❌ New: ${data.summary.totalNewInDiff}`);
        }
        if (data.summary.totalNewInFiles > 0) {
          console.log(`     ⚠️  Not cleaned: ${data.summary.totalNewInFiles}`);
        }
      }
    });
    console.log('');
    
    // Skill Impact
    if (result.skillUpdate) {
      console.log('🎯 Skill Impact:');
      console.log(`   Previous Score: ${result.skillUpdate.previousScore}`);
      console.log(`   New Score: ${result.skillUpdate.newScore}`);
      console.log(`   Change: ${result.skillUpdate.change > 0 ? '+' : ''}${result.skillUpdate.change}`);
      console.log(`   Breakdown:`);
      console.log(`     - Resolved: +${result.skillUpdate.breakdown.resolved}`);
      console.log(`     - Introduced: ${result.skillUpdate.breakdown.newIntroduced}`);
      console.log(`     - Not Cleaned: ${result.skillUpdate.breakdown.notCleaned}`);
      console.log(`     - Existing: ${result.skillUpdate.breakdown.existing}\n`);
    }
    
    // Educational Content
    if (result.education) {
      console.log('📚 Educational Resources:');
      console.log(`   Generated ${result.education.resources?.length || 0} learning resources`);
      console.log(`   Focus areas: ${result.education.focusAreas?.join(', ') || 'none'}\n`);
    }
    
    // Timing
    console.log(`⏱️  Execution Time: ${(duration / 1000).toFixed(2)}s`);
    console.log(`🛠️  Tools Used: ${result.metadata.toolsUsed.join(', ')}\n`);
    
    // Show example issues if blocked
    if (result.summary.decision === 'block') {
      console.log('⚠️  Critical/High Issues Found:');
      
      // Show first few critical/high issues
      Object.values(result.comparison.byCategory).forEach((category: any) => {
        const criticalHigh = [
          ...category.newInDiff.filter((i: any) => ['critical', 'high'].includes(i.severity)),
          ...category.newInFiles.filter((i: any) => ['critical', 'high'].includes(i.severity))
        ].slice(0, 3);
        
        criticalHigh.forEach((issue: any) => {
          console.log(`\n   [${issue.severity.toUpperCase()}] ${issue.title}`);
          console.log(`   File: ${issue.location.file}:${issue.location.startLine}`);
          console.log(`   ${issue.description}`);
          if (issue.recommendation) {
            console.log(`   Fix: ${issue.recommendation.description}`);
          }
        });
      });
    }
    
    // Save report
    console.log('\n💾 Saving Reports...');
    
    // Save markdown report
    const fs = require('fs').promises;
    await fs.writeFile(
      `pr-${prNumber}-report.md`,
      result.reports.markdown,
      'utf-8'
    );
    console.log(`   ✅ Markdown report saved to pr-${prNumber}-report.md`);
    
    // Save PR comment
    await fs.writeFile(
      `pr-${prNumber}-comment.md`,
      result.reports.prComment,
      'utf-8'
    );
    console.log(`   ✅ PR comment saved to pr-${prNumber}-comment.md`);
    
    // Save JSON data
    await fs.writeFile(
      `pr-${prNumber}-data.json`,
      JSON.stringify(result.reports.json, null, 2),
      'utf-8'
    );
    console.log(`   ✅ JSON data saved to pr-${prNumber}-data.json`);
    
  } catch (error: any) {
    console.error('\n❌ Analysis Failed!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

function getEmoji(decision: string): string {
  return decision === 'approve' ? '✅' : '🚫';
}

function formatCategory(category: string): string {
  const names: Record<string, string> = {
    security: '🔒 Security',
    performance: '⚡ Performance',
    codeQuality: '✨ Code Quality',
    dependency: '📦 Dependencies',
    architecture: '🏗️ Architecture'
  };
  return names[category] || category;
}

// Run the test
testCompleteMCPFlow().catch(console.error);