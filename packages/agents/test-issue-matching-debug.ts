#!/usr/bin/env ts-node

/**
 * Debug Issue Matching
 * 
 * Test why issues aren't matching between main and PR branches
 */

import { EnhancedIssueMatcher } from './dist/standard/services/issue-matcher-enhanced';

// Sample issues from DeepWiki (based on actual output)
const mainIssues = [
  {
    title: 'Potential SQL Injection in Query Parameters',
    severity: 'high',
    category: 'security',
    location: { file: 'unknown', line: 0 },
    message: 'User input is not sanitized'
  },
  {
    title: 'Memory Leak in Shared Abort Signal',
    severity: 'high', 
    category: 'performance',
    location: { file: 'unknown', line: 0 },
    message: 'Abort controller not cleaned up'
  },
  {
    title: 'Hardcoded URLs',
    severity: 'medium',
    category: 'maintainability',
    location: { file: 'unknown', line: 0 },
    message: 'URLs should be configurable'
  }
];

const prIssues = [
  {
    title: 'Potential SQL Injection in Query Parameters',
    severity: 'high',
    category: 'security',
    location: { file: 'unknown', line: 0 },
    message: 'User input is not sanitized'
  },
  {
    title: 'Memory Leak in Shared Abort Signal',
    severity: 'high',
    category: 'performance', 
    location: { file: 'unknown', line: 0 },
    message: 'Abort controller not cleaned up'
  },
  {
    title: 'Hardcoded URLs',
    severity: 'medium',
    category: 'maintainability',
    location: { file: 'unknown', line: 0 },
    message: 'URLs should be configurable'
  }
];

console.log('🔍 Testing Issue Matching\n');
console.log('=' .repeat(80));

const matcher = new EnhancedIssueMatcher();

console.log('\n📊 Main Branch Issues:', mainIssues.length);
console.log('📊 PR Branch Issues:', prIssues.length);

console.log('\n🔄 Testing Matching Logic:\n');

// Test matching each main issue against PR issues
mainIssues.forEach((mainIssue, i) => {
  console.log(`\nMain Issue ${i + 1}: ${mainIssue.title}`);
  console.log(`  Category: ${mainIssue.category}, Severity: ${mainIssue.severity}`);
  
  prIssues.forEach((prIssue, j) => {
    const matchResult = matcher.matchIssues(mainIssue as any, prIssue as any);
    
    if (matchResult.isMatch) {
      console.log(`  ✅ MATCHED with PR Issue ${j + 1}`);
      console.log(`     Confidence: ${matchResult.confidence}%`);
      console.log(`     Match Type: ${matchResult.matchType}`);
      console.log(`     Details: ${matchResult.details}`);
    } else {
      console.log(`  ❌ No match with PR Issue ${j + 1}`);
    }
  });
});

// Now test with actual DeepWiki format (all unknown locations)
console.log('\n' + '=' .repeat(80));
console.log('\n🧪 Testing with Actual DeepWiki Format (unknown locations):\n');

const deepwikiMain = [
  {
    title: 'Potential SQL Injection in Query Parameters',
    severity: 'high',
    category: 'security',
    file: 'test/stream.ts',
    line: 25,
    location: { file: 'src/controllers/auth.controller.ts', line: 199 }
  }
];

const deepwikiPR = [
  {
    title: 'Potential SQL Injection in Query Parameters',
    severity: 'high',
    category: 'security',
    file: 'test/hooks.ts',
    line: 117,
    location: { file: 'src/utils/database.utils.ts', line: 45 }
  }
];

console.log('DeepWiki Main Issue:');
console.log('  Title:', deepwikiMain[0].title);
console.log('  Location:', deepwikiMain[0].location);

console.log('\nDeepWiki PR Issue:');
console.log('  Title:', deepwikiPR[0].title);
console.log('  Location:', deepwikiPR[0].location);

const deepwikiMatch = matcher.matchIssues(deepwikiMain[0] as any, deepwikiPR[0] as any);
console.log('\nMatch Result:');
console.log('  Is Match:', deepwikiMatch.isMatch);
console.log('  Confidence:', deepwikiMatch.confidence);
console.log('  Type:', deepwikiMatch.matchType);
console.log('  Details:', deepwikiMatch.details);

console.log('\n💡 Conclusion:');
if (deepwikiMatch.isMatch) {
  console.log('✅ Issues with same title but different locations ARE matching');
  console.log('   The problem might be that DeepWiki returns different issues for each branch');
} else {
  console.log('❌ Issues with same title but different locations are NOT matching');
  console.log('   This is why all issues appear as new/resolved');
}