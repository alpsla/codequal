import { SmartIssueMatcher } from './src/standard/comparison/smart-issue-matcher';
import { IssueIdGenerator } from './src/standard/services/issue-id-generator';

// Mock issues for testing
const mainBranchIssues = [
  {
    id: IssueIdGenerator.generateIssueId({
      category: 'security',
      severity: 'high',
      title: 'SQL Injection',
      message: 'Potential SQL injection vulnerability',
      location: { file: 'api.js', line: 42 },
      CWE: 'CWE-89'
    }),
    category: 'security' as const,
    severity: 'high' as const,
    title: 'SQL Injection',
    message: 'Potential SQL injection vulnerability',
    location: { file: 'api.js', line: 42, column: 10 }
  },
  {
    id: IssueIdGenerator.generateIssueId({
      category: 'security',
      severity: 'medium',
      title: 'XSS Vulnerability',
      message: 'Cross-site scripting vulnerability',
      location: { file: 'frontend.js', line: 100 },
      CWE: 'CWE-79'
    }),
    category: 'security' as const,
    severity: 'medium' as const,
    title: 'XSS Vulnerability',
    message: 'Cross-site scripting vulnerability',
    location: { file: 'frontend.js', line: 100, column: 5 }
  }
];

// PR branch has same issues (should be unchanged)
const prBranchIssues = [
  {
    id: IssueIdGenerator.generateIssueId({
      category: 'security',
      severity: 'high',
      title: 'SQL Injection',
      message: 'Potential SQL injection vulnerability',
      location: { file: 'api.js', line: 42 },
      CWE: 'CWE-89'
    }),
    category: 'security' as const,
    severity: 'high' as const,
    title: 'SQL Injection',
    message: 'Potential SQL injection vulnerability',
    location: { file: 'api.js', line: 42, column: 10 }
  },
  {
    id: IssueIdGenerator.generateIssueId({
      category: 'security',
      severity: 'medium',
      title: 'XSS Vulnerability',
      message: 'Cross-site scripting vulnerability',
      location: { file: 'frontend.js', line: 100 },
      CWE: 'CWE-79'
    }),
    category: 'security' as const,
    severity: 'medium' as const,
    title: 'XSS Vulnerability',
    message: 'Cross-site scripting vulnerability',
    location: { file: 'frontend.js', line: 100, column: 5 }
  },
  // New issue in PR
  {
    id: IssueIdGenerator.generateIssueId({
      category: 'performance',
      severity: 'low',
      title: 'Memory Leak',
      message: 'Potential memory leak in event handler',
      location: { file: 'events.js', line: 25 },
      CWE: ''
    }),
    category: 'performance' as const,
    severity: 'low' as const,
    title: 'Memory Leak',
    message: 'Potential memory leak in event handler',
    location: { file: 'events.js', line: 25, column: 15 }
  }
];

console.log('Testing SmartIssueMatcher with identical IDs...\n');

console.log('Main branch issues:');
mainBranchIssues.forEach(issue => {
  console.log(`  - ${issue.title} (${issue.severity}) - ID: ${issue.id}`);
});

console.log('\nPR branch issues:');
prBranchIssues.forEach(issue => {
  console.log(`  - ${issue.title} (${issue.severity}) - ID: ${issue.id}`);
});

const matched = SmartIssueMatcher.matchIssues(mainBranchIssues, prBranchIssues);

console.log('\n=== MATCHING RESULTS ===');
console.log('Resolved (in main but not PR):', matched.resolved.length);
console.log('New (in PR but not main):', matched.new.length);
console.log('Unchanged (in both):', matched.unchanged.length);
console.log('Modified (in both but changed):', matched.modified.length);

if (matched.unchanged.length === 0) {
  console.log('\n❌ ERROR: No unchanged issues found!');
  console.log('This means pre-existing issues won\'t show in the report.');
  
  // Debug: Check if IDs are matching
  console.log('\n=== DEBUGGING ===');
  console.log('Main IDs:', mainBranchIssues.map(i => i.id));
  console.log('PR IDs:', prBranchIssues.map(i => i.id));
} else {
  console.log('\n✅ SUCCESS: Found unchanged issues that will show as pre-existing in report');
}