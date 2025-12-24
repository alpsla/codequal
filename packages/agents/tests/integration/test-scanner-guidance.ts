/**
 * Test Scanner Guidance Section in Reports
 * Verifies that the new scanner guidance section appears correctly
 */

import { generateScannerGuidanceSection } from '../../src/two-branch/report/header-sections';

// Create mock issues from scanner tools
const mockIssues = [
  // Lighthouse issues (Performance)
  {
    file: 'src/app/page.tsx',
    line: 1,
    rule: 'largest-contentful-paint',
    tool: 'lighthouse',
    severity: 'medium' as const,
    message: 'LCP is 4.2s, should be under 2.5s',
    category: 'NEW' as const,
    detectedCategory: 'Performance'
  },
  {
    file: 'src/app/page.tsx',
    line: 1,
    rule: 'cumulative-layout-shift',
    tool: 'lighthouse',
    severity: 'low' as const,
    message: 'CLS is 0.15, should be under 0.1',
    category: 'NEW' as const,
    detectedCategory: 'Performance'
  },
  // Madge issues (Architecture)
  {
    file: 'src/services/auth.ts',
    line: 5,
    rule: 'circular-dependency',
    tool: 'madge',
    severity: 'high' as const,
    message: 'Circular dependency: auth.ts -> user.ts -> auth.ts',
    category: 'NEW' as const,
    detectedCategory: 'Architecture'
  },
  // pydeps issues (Architecture)
  {
    file: 'src/utils/helpers.py',
    line: 10,
    rule: 'circular-import',
    tool: 'pydeps',
    severity: 'medium' as const,
    message: 'Circular import detected in module chain',
    category: 'NEW' as const,
    detectedCategory: 'Architecture'
  },
  // Bandit issues (Security)
  {
    file: 'src/auth/login.py',
    line: 25,
    rule: 'B105',
    tool: 'bandit',
    severity: 'high' as const,
    message: 'Possible hardcoded password',
    category: 'NEW' as const,
    detectedCategory: 'Security'
  },
  {
    file: 'src/db/query.py',
    line: 42,
    rule: 'B608',
    tool: 'bandit',
    severity: 'critical' as const,
    message: 'Possible SQL injection',
    category: 'NEW' as const,
    detectedCategory: 'Security'
  },
  // Regular ESLint issue (should NOT show scanner guidance)
  {
    file: 'src/components/Button.tsx',
    line: 15,
    rule: 'no-unused-vars',
    tool: 'eslint',
    severity: 'low' as const,
    message: 'Unused variable x',
    category: 'NEW' as const,
    detectedCategory: 'Code Quality'
  }
];

console.log('='.repeat(80));
console.log('SCANNER GUIDANCE SECTION TEST');
console.log('='.repeat(80));
console.log('\nTest Issues:');
console.log('- lighthouse: 2 issues');
console.log('- madge: 1 issue');
console.log('- pydeps: 1 issue');
console.log('- bandit: 2 issues');
console.log('- eslint: 1 issue (should NOT show guidance)');
console.log('\n' + '='.repeat(80));
console.log('GENERATED SCANNER GUIDANCE SECTION:');
console.log('='.repeat(80) + '\n');

const section = generateScannerGuidanceSection(mockIssues as any);

if (section) {
  console.log(section);
  console.log('='.repeat(80));
  console.log('SUCCESS: Scanner guidance section generated!');
  console.log('   Section length: ' + section.length + ' characters');

  // Check for expected tools
  const expectedTools = ['Lighthouse', 'Madge', 'pydeps', 'Bandit'];
  const missingTools = expectedTools.filter(t => !section.includes(t));

  if (missingTools.length === 0) {
    console.log('   All expected tools found in section');
  } else {
    console.log('   WARNING: Missing tools: ' + missingTools.join(', '));
  }

  // Check that ESLint is NOT in scanner guidance (it has auto-fix)
  if (!section.includes('ESLint')) {
    console.log('   ESLint correctly excluded (has auto-fix)');
  } else {
    console.log('   WARNING: ESLint incorrectly included');
  }
} else {
  console.log('FAILURE: No scanner guidance section generated!');
}

console.log('='.repeat(80));
