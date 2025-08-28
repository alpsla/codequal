/**
 * Test Issue Deduplication
 * 
 * Fixes the duplicate issue problem where the same issues appear multiple times
 * in reports, especially dependency vulnerabilities like axios CVE.
 */

import { IssueDeduplicator } from './src/standard/services/issue-deduplicator';
import * as fs from 'fs';

// Load the actual report with duplicates
const reportPath = './test-reports/pr-analysis-v8-2025-08-27T18-16-16-713Z.json';

async function testDeduplication() {
  console.log('🔍 Testing Issue Deduplication\n');
  console.log('='.repeat(60));
  
  const deduplicator = new IssueDeduplicator();
  
  // Test with mock duplicate data first
  const mockIssues = [
    // Duplicate axios vulnerabilities (should be deduplicated)
    {
      title: 'Vulnerability in third-party dependency `axios` `"axios": "^0.21.1"`',
      severity: 'high',
      category: 'dependency-vulnerability',
      location: { file: 'package.json', line: 12 },
      description: 'Outdated axios dependency with known CVE'
    },
    {
      title: 'Vulnerability in third-party dependency `axios` `"axios": "^0.21.1"`',
      severity: 'high',
      category: 'dependency-vulnerability',
      location: { file: 'package.json', line: 12 },
      description: 'Outdated axios dependency with known CVE'
    },
    // Duplicate error handling issues (same location)
    {
      title: 'Lack of error handling in fetch calls',
      severity: 'medium',
      category: 'bug',
      location: { file: 'src/index.ts', line: 120 },
      codeSnippet: 'fetch(url).then(res => res.json())'
    },
    {
      title: 'Lack of error handling in fetch calls',
      severity: 'medium',
      category: 'bug',
      location: { file: 'src/index.ts', line: 120 },
      codeSnippet: 'fetch(url).then(res => res.json())'
    },
    // Different issues (should not be deduplicated)
    {
      title: 'Missing null check',
      severity: 'medium',
      category: 'bug',
      location: { file: 'src/handler.ts', line: 45 },
      codeSnippet: 'return obj[key];'
    },
    {
      title: 'Missing null check',
      severity: 'medium',
      category: 'bug',
      location: { file: 'src/handler.ts', line: 67 }, // Different line
      codeSnippet: 'return data[prop];'
    }
  ];
  
  console.log('📊 Before Deduplication:');
  const statsBefore = deduplicator.getDuplicateStats(mockIssues);
  console.log(`  Total issues: ${statsBefore.total}`);
  console.log(`  Unique issues: ${statsBefore.unique}`);
  console.log(`  Duplicates: ${statsBefore.duplicates}`);
  
  if (statsBefore.duplicateGroups.length > 0) {
    console.log('\n  Duplicate Groups:');
    for (const group of statsBefore.duplicateGroups) {
      console.log(`    - "${group.title}" appears ${group.count} times`);
    }
  }
  
  // Deduplicate
  const deduplicated = deduplicator.deduplicateIssues(mockIssues);
  
  console.log('\n✅ After Deduplication:');
  console.log(`  Total issues: ${deduplicated.length}`);
  console.log('\n  Remaining issues:');
  for (const issue of deduplicated) {
    console.log(`    - ${issue.title} (${issue.location.file}:${issue.location.line})`);
  }
  
  // Now test with real report data if it exists
  if (fs.existsSync(reportPath)) {
    console.log('\n' + '-'.repeat(60));
    console.log('\n📄 Testing with Real Report Data:\n');
    
    try {
      const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      
      // Combine all issues from the report
      const allIssues = [
        ...(reportData.mainBranchIssues || []),
        ...(reportData.prBranchIssues || [])
      ];
      
      const realStats = deduplicator.getDuplicateStats(allIssues);
      console.log(`  Total issues in report: ${realStats.total}`);
      console.log(`  Unique issues: ${realStats.unique}`);
      console.log(`  Duplicates found: ${realStats.duplicates}`);
      
      if (realStats.duplicateGroups.length > 0) {
        console.log('\n  Top duplicate issues:');
        const topDuplicates = realStats.duplicateGroups
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        for (const group of topDuplicates) {
          console.log(`\n    📍 "${group.title}"`);
          console.log(`       Appears ${group.count} times at:`);
          for (const loc of group.locations.slice(0, 3)) {
            console.log(`       - ${loc.file}:${loc.line}`);
          }
        }
      }
      
      // Deduplicate categorized issues if available
      if (reportData.categorized) {
        const categorized = reportData.categorized;
        const beforeCounts = {
          new: categorized.newIssues?.length || 0,
          unchanged: categorized.unchangedIssues?.length || 0,
          fixed: categorized.fixedIssues?.length || 0
        };
        
        const deduplicatedCategorized = deduplicator.deduplicateCategorizedIssues({
          newIssues: categorized.newIssues || [],
          unchangedIssues: categorized.unchangedIssues || [],
          fixedIssues: categorized.fixedIssues || []
        });
        
        const afterCounts = {
          new: deduplicatedCategorized.newIssues.length,
          unchanged: deduplicatedCategorized.unchangedIssues.length,
          fixed: deduplicatedCategorized.fixedIssues.length
        };
        
        console.log('\n  Categorized Issues Deduplication:');
        console.log(`    New issues: ${beforeCounts.new} → ${afterCounts.new}`);
        console.log(`    Unchanged issues: ${beforeCounts.unchanged} → ${afterCounts.unchanged}`);
        console.log(`    Fixed issues: ${beforeCounts.fixed} → ${afterCounts.fixed}`);
        
        const totalBefore = beforeCounts.new + beforeCounts.unchanged + beforeCounts.fixed;
        const totalAfter = afterCounts.new + afterCounts.unchanged + afterCounts.fixed;
        const removed = totalBefore - totalAfter;
        
        console.log(`\n    Total removed: ${removed} duplicate issues`);
        console.log(`    Reduction: ${((removed / totalBefore) * 100).toFixed(1)}%`);
      }
      
    } catch (error) {
      console.log('  ⚠️ Error loading real report:', error);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 Deduplication Strategy Summary:\n');
  console.log('1. **Dependency Issues**: Deduplicated by title only');
  console.log('   → Multiple axios CVEs become one issue');
  console.log('\n2. **Code Issues**: Deduplicated by title + location');
  console.log('   → Same issue at different lines kept separate');
  console.log('\n3. **Priority Order**: New > Unchanged > Fixed');
  console.log('   → Ensures important issues aren\'t hidden');
  console.log('\n✨ Benefits:');
  console.log('  • Cleaner, more readable reports');
  console.log('  • No duplicate work for developers');
  console.log('  • Accurate issue counts');
  console.log('  • Better prioritization');
}

// Run the test
testDeduplication().catch(console.error);