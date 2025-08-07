#!/usr/bin/env node

/**
 * Simple test to demonstrate DiffAnalyzer functionality
 * Uses the current repository to show actual diff analysis
 */

const { DiffAnalyzerService } = require('./dist/standard/services/diff-analyzer.service');
const { SmartIssueMatcher } = require('./dist/standard/comparison/smart-issue-matcher');
const path = require('path');

// Simple logger
const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  debug: (msg, data) => console.log(`[DEBUG] ${msg}`, data || '')
};

async function testDiffAnalyzer() {
  console.log('='.repeat(70));
  console.log('DIFF ANALYZER DEMONSTRATION');
  console.log('='.repeat(70));
  
  // Initialize DiffAnalyzer
  const diffAnalyzer = new DiffAnalyzerService(logger);
  
  // Use current repository
  const repoPath = path.resolve(__dirname, '../..');
  
  console.log('\n📁 Repository:', repoPath);
  console.log('🔀 Analyzing diff between origin/main and current HEAD');
  
  try {
    // 1. Fetch diff between origin/main and HEAD
    console.log('\n1️⃣ Fetching git diff...');
    const diff = await diffAnalyzer.fetchDiff(repoPath, 'origin/main', 'HEAD');
    
    console.log('\n📊 Diff Statistics:');
    console.log('  Files changed:', diff.stats.totalFiles);
    console.log('  Lines added:', diff.stats.additions);
    console.log('  Lines deleted:', diff.stats.deletions);
    console.log('  Files added:', diff.stats.filesAdded);
    console.log('  Files modified:', diff.stats.filesModified);
    console.log('  Files deleted:', diff.stats.filesDeleted);
    
    if (diff.files.length > 0) {
      console.log('\n📝 Changed Files (first 10):');
      diff.files.slice(0, 10).forEach(file => {
        const status = {
          'added': '🆕',
          'modified': '📝',
          'deleted': '🗑️',
          'renamed': '📛'
        }[file.status] || '❓';
        
        console.log(`  ${status} ${file.path}`);
        console.log(`     +${file.additions} -${file.deletions} lines`);
      });
      
      // 2. Analyze changes
      console.log('\n2️⃣ Analyzing code changes...');
      const changes = await diffAnalyzer.analyzeChanges(diff);
      
      console.log('\n🔍 Change Analysis:');
      console.log('  Functions changed:', changes.changedFunctions.length);
      console.log('  Classes changed:', changes.changedClasses.length);
      console.log('  Breaking changes detected:', changes.breakingChanges.length);
      console.log('  Security implications:', changes.securityChanges.length);
      console.log('  Performance impacts:', changes.performanceChanges.length);
      
      // Show some examples
      if (changes.changedFunctions.length > 0) {
        console.log('\n📦 Example Changed Functions:');
        changes.changedFunctions.slice(0, 3).forEach(func => {
          console.log(`  - ${func.name} in ${path.basename(func.file)}`);
          if (func.signatureChanged) {
            console.log('    ⚠️ Signature changed!');
          }
        });
      }
      
      if (changes.breakingChanges.length > 0) {
        console.log('\n⚠️ Breaking Changes Detected:');
        changes.breakingChanges.slice(0, 3).forEach(bc => {
          console.log(`  ${bc.severity.toUpperCase()}: ${bc.description}`);
          if (bc.migrationPath) {
            console.log(`    Migration: ${bc.migrationPath}`);
          }
        });
      }
      
      // 3. Test impact analysis
      console.log('\n3️⃣ Analyzing impact radius...');
      const impact = await diffAnalyzer.analyzeImpactRadius(changes);
      
      console.log('\n💥 Impact Analysis:');
      console.log('  Risk level:', impact.riskLevel.toUpperCase());
      console.log('  Direct impact:', impact.directImpact.length, 'files');
      console.log('  Indirect impact:', impact.indirectImpact.length, 'files');
      
      // 4. Create mock issues to test matching
      console.log('\n4️⃣ Testing issue matching with diff data...');
      
      // Mock some issues based on changed files
      const mockMainIssues = [
        {
          id: 'MAIN-1',
          category: 'code-quality',
          severity: 'medium',
          message: 'Code quality issue',
          location: { 
            file: diff.files[0]?.path || 'test.js',
            line: 10 
          },
          metadata: { title: 'Unused variable' }
        }
      ];
      
      const mockPrIssues = [
        {
          id: 'PR-1',
          category: 'security',
          severity: 'high',
          message: 'Security issue introduced',
          location: { 
            file: diff.files[0]?.path || 'test.js',
            line: 20 
          },
          metadata: { title: 'Potential SQL injection' }
        }
      ];
      
      // Set diff analyzer for SmartIssueMatcher
      SmartIssueMatcher.setDiffAnalyzer(diffAnalyzer);
      
      // Match issues
      const matchResult = await SmartIssueMatcher.matchIssuesWithDiff(
        mockMainIssues,
        mockPrIssues,
        repoPath,
        'origin/main',
        'HEAD'
      );
      
      console.log('\n✅ Issue Matching Results:');
      console.log('  Resolved:', matchResult.resolved.length);
      console.log('  New:', matchResult.new.length);
      console.log('  Unchanged:', matchResult.unchanged.length);
      console.log('  Modified:', matchResult.modified.length);
      
      if (matchResult.verificationDetails) {
        console.log('\n🔬 Verification Details:');
        console.log('  Used diff analysis:', matchResult.verificationDetails.usedDiffAnalysis);
        console.log('  Files analyzed:', matchResult.verificationDetails.filesAnalyzed);
        console.log('  Confidence:', (matchResult.verificationDetails.confidence * 100).toFixed(0) + '%');
      }
      
    } else {
      console.log('\n✅ No changes detected between origin/main and HEAD');
      console.log('   (You may need to make some local changes to see the diff analyzer in action)');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('💡 KEY BENEFITS OF DIFF ANALYSIS:');
    console.log('='.repeat(70));
    console.log('1. ✅ Accurate issue detection - only flags issues in changed code');
    console.log('2. ✅ Verified fixes - confirms issues were actually resolved');
    console.log('3. ✅ Breaking change detection - identifies API/interface changes');
    console.log('4. ✅ Impact analysis - shows which files are affected');
    console.log('5. ✅ Confidence scoring - provides reliability metrics');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nNote: This test requires git to be installed and accessible.');
    console.log('Also ensure you have uncommitted changes or are on a feature branch.');
  }
}

// Run the test
testDiffAnalyzer().catch(console.error);