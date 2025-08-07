#!/usr/bin/env ts-node

/**
 * Test the DiffAnalyzer service with real git repositories
 * Demonstrates actual diff analysis between branches
 */

import { DiffAnalyzerService } from './src/standard/services/diff-analyzer.service';
import { SmartIssueMatcher } from './src/standard/comparison/smart-issue-matcher';
import { Issue } from './src/standard/types/analysis-types';
import * as path from 'path';

// Create logger
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  debug: (msg: string, data?: any) => console.log(`[DEBUG] ${msg}`, data || '')
};

async function testDiffAnalyzer() {
  console.log('='.repeat(70));
  console.log('DIFF ANALYZER TEST');
  console.log('='.repeat(70));
  
  // Initialize DiffAnalyzer
  const diffAnalyzer = new DiffAnalyzerService(logger);
  
  // Test repository path (current CodeQual repo)
  const repoPath = path.resolve(__dirname, '../..');
  const baseBranch = 'main';
  const headBranch = 'HEAD'; // Current branch
  
  console.log('\n📁 Repository:', repoPath);
  console.log('🔀 Comparing:', baseBranch, '→', headBranch);
  
  try {
    // 1. Fetch diff
    console.log('\n1️⃣ Fetching git diff...');
    const diff = await diffAnalyzer.fetchDiff(repoPath, baseBranch, headBranch);
    
    console.log('\n📊 Diff Statistics:');
    console.log('  Files changed:', diff.stats.totalFiles);
    console.log('  Additions:', diff.stats.additions);
    console.log('  Deletions:', diff.stats.deletions);
    console.log('  Files added:', diff.stats.filesAdded);
    console.log('  Files modified:', diff.stats.filesModified);
    console.log('  Files deleted:', diff.stats.filesDeleted);
    
    // Show first 5 changed files
    console.log('\n📝 Changed Files (first 5):');
    diff.files.slice(0, 5).forEach(file => {
      console.log(`  ${file.status.toUpperCase()}: ${file.path}`);
      console.log(`    +${file.additions} -${file.deletions} (${file.language || 'unknown'})`);
    });
    
    // 2. Analyze changes
    console.log('\n2️⃣ Analyzing changes...');
    const changes = await diffAnalyzer.analyzeChanges(diff);
    
    console.log('\n🔍 Change Analysis:');
    console.log('  Changed functions:', changes.changedFunctions.length);
    console.log('  Changed classes:', changes.changedClasses.length);
    console.log('  Breaking changes:', changes.breakingChanges.length);
    console.log('  Security changes:', changes.securityChanges.length);
    console.log('  Performance changes:', changes.performanceChanges.length);
    
    // Show breaking changes
    if (changes.breakingChanges.length > 0) {
      console.log('\n⚠️ Breaking Changes:');
      changes.breakingChanges.slice(0, 3).forEach(bc => {
        console.log(`  ${bc.severity.toUpperCase()}: ${bc.description}`);
        console.log(`    Type: ${bc.type}`);
        console.log(`    Component: ${bc.component}`);
        if (bc.migrationPath) {
          console.log(`    Migration: ${bc.migrationPath}`);
        }
      });
    }
    
    // 3. Test with mock issues
    console.log('\n3️⃣ Testing issue mapping with mock data...');
    
    // Create mock issues based on actual changed files
    const mockMainIssues: Issue[] = diff.files.slice(0, 3).map((file, i) => ({
      id: `MAIN-${i + 1}`,
      category: 'code-quality',
      severity: 'medium',
      message: `Issue in ${path.basename(file.path)}`,
      location: {
        file: file.path,
        line: 10 + i * 10,
        column: 0
      },
      metadata: {
        title: `Code quality issue in ${path.basename(file.path)}`
      }
    }));
    
    const mockPrIssues: Issue[] = [
      // Some issues remain
      ...mockMainIssues.slice(1),
      // New issue introduced
      {
        id: 'PR-NEW-1',
        category: 'security',
        severity: 'high',
        message: 'New security issue introduced',
        location: {
          file: diff.files[0]?.path || 'unknown',
          line: 50,
          column: 0
        },
        metadata: {
          title: 'Potential security vulnerability'
        }
      }
    ];
    
    // Map issues to changes
    const mainMappings = await diffAnalyzer.mapIssuesToChanges(
      mockMainIssues.map(i => ({
        id: i.id || '',
        title: i.metadata?.title || i.message || '',
        severity: i.severity,
        location: `${i.location?.file || ''}:${i.location?.line || 0}`
      })),
      changes,
      diff
    );
    
    console.log('\n📍 Issue Mappings:');
    mainMappings.forEach(mapping => {
      console.log(`  ${mapping.issue.id}: ${mapping.verificationStatus}`);
      console.log(`    Confidence: ${(mapping.confidence * 100).toFixed(0)}%`);
      console.log(`    Location: ${mapping.changeLocation.file}`);
    });
    
    // 4. Test enhanced SmartIssueMatcher
    console.log('\n4️⃣ Testing SmartIssueMatcher with diff analysis...');
    
    // Set the diff analyzer
    SmartIssueMatcher.setDiffAnalyzer(diffAnalyzer);
    
    // Match issues with diff
    const matchResult = await SmartIssueMatcher.matchIssuesWithDiff(
      mockMainIssues,
      mockPrIssues,
      repoPath,
      baseBranch,
      headBranch
    );
    
    console.log('\n✅ Match Results:');
    console.log('  Resolved issues:', matchResult.resolved.length);
    console.log('  New issues:', matchResult.new.length);
    console.log('  Unchanged issues:', matchResult.unchanged.length);
    console.log('  Modified issues:', matchResult.modified.length);
    
    if (matchResult.verificationDetails) {
      console.log('\n🔬 Verification Details:');
      console.log('  Used diff analysis:', matchResult.verificationDetails.usedDiffAnalysis);
      console.log('  Files analyzed:', matchResult.verificationDetails.filesAnalyzed);
      console.log('  Confidence:', (matchResult.verificationDetails.confidence * 100).toFixed(0) + '%');
    }
    
    // 5. Test impact analysis
    console.log('\n5️⃣ Testing impact radius analysis...');
    const impact = await diffAnalyzer.analyzeImpactRadius(changes);
    
    console.log('\n💥 Impact Analysis:');
    console.log('  Direct impact:', impact.directImpact.length, 'files');
    console.log('  Indirect impact:', impact.indirectImpact.length, 'files');
    console.log('  Risk level:', impact.riskLevel.toUpperCase());
    
    if (impact.directImpact.length > 0) {
      console.log('\n  Directly impacted files (first 5):');
      impact.directImpact.slice(0, 5).forEach(file => {
        console.log(`    - ${file}`);
      });
    }
    
    // 6. Test breaking change detection
    console.log('\n6️⃣ Detecting breaking changes...');
    const breakingChanges = await diffAnalyzer.detectBreakingChanges(diff);
    
    if (breakingChanges.length > 0) {
      console.log(`\n🚨 Found ${breakingChanges.length} breaking changes`);
      breakingChanges.slice(0, 3).forEach(bc => {
        console.log(`  - ${bc.description}`);
      });
    } else {
      console.log('\n✅ No breaking changes detected');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ DIFF ANALYZER TEST COMPLETE');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDiffAnalyzer().catch(console.error);