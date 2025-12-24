/**
 * Quick test to verify LSP now includes ALL issues (not just fixable ones)
 */

import { LSPSARIFConverter } from '../../src/two-branch/analyzers/lsp-sarif-converter';

const issues = [
  {
    file: 'src/test.ts',
    line: 10,
    rule: 'security.sql-injection',
    severity: 'high' as const,
    message: 'SQL injection vulnerability',
    tool: 'semgrep',
    category: 'Security',
    fixSuggestion: {
      correctedCode: 'const query = db.prepare(sql).run(params);',
      explanation: 'Use parameterized queries'
    }
  },
  {
    file: 'src/test.ts',
    line: 20,
    rule: 'security.xss',
    severity: 'medium' as const,
    message: 'XSS vulnerability - no sanitization',
    tool: 'semgrep',
    category: 'Security'
    // NO fixSuggestion - this should still appear in LSP with AI metadata
  },
  {
    file: 'src/api.ts',
    line: 5,
    rule: 'performance.n-plus-one',
    severity: 'low' as const,
    message: 'N+1 query pattern detected',
    tool: 'semgrep',
    category: 'Performance'
    // NO fixSuggestion - this should still appear in LSP with AI metadata
  }
];

async function main() {
  console.log('=== Testing LSP Enhancement ===\n');
  console.log('Input: 3 issues (1 with fix, 2 without)\n');

  const converter = new LSPSARIFConverter();
  const lspActions = converter.generateLSPCodeActions(issues as any, '/workspace');

  console.log('Output LSP Actions: ' + lspActions.length);
  console.log('');

  // Separate batch actions from individual actions
  const batchActions = lspActions.filter(a => a.title.startsWith('Apply'));
  const individualActions = lspActions.filter(a => !a.title.startsWith('Apply'));

  console.log('Batch actions: ' + batchActions.length);
  batchActions.forEach(a => console.log('  - ' + a.title));

  console.log('\nIndividual actions: ' + individualActions.length);
  individualActions.forEach((action, i) => {
    const hasEdit = !!action.edit;
    const source = action.data?.codequalFix?.source || 'N/A';
    console.log('  [' + (i + 1) + '] ' + action.title);
    console.log('      Has edit: ' + hasEdit);
    console.log('      Source: ' + source);
    if (action.data?.aiPrompt) {
      console.log('      AI Prompt: ' + action.data.aiPrompt.substring(0, 80) + '...');
    }
  });

  // Verify expectations
  console.log('\n=== Verification ===');
  const fixedCount = individualActions.filter(a => a.edit).length;
  const aiNeededCount = individualActions.filter(a => a.data?.codequalFix?.source === 'ai_needed').length;

  console.log('Issues with pre-generated fix: ' + fixedCount + ' (expected: 1)');
  console.log('Issues needing AI fix: ' + aiNeededCount + ' (expected: 2)');

  if (fixedCount === 1 && aiNeededCount === 2) {
    console.log('\n✅ SUCCESS: All 3 issues included in LSP output!');
    process.exit(0);
  } else {
    console.log('\n❌ FAILED: Expected 1 fixed + 2 AI-needed');
    process.exit(1);
  }
}

main().catch(console.error);
