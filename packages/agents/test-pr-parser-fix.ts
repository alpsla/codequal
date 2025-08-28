/**
 * Test the fixed PR parser directly without cache
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { loadEnvironment } from './src/standard/utils/env-loader';

loadEnvironment();

async function testParserFix() {
  console.log('🔍 Testing PR Parser Fix\n');
  
  const api = new DirectDeepWikiApiWithLocationV2();
  
  // Mock main branch issues
  const mainBranchIssues = [
    {
      title: '`ky` does not handle redirects properly, which can lead to unexpected behaviors in request handling.',
      severity: 'critical',
      category: 'breaking-change',
      location: { file: 'src/index.ts', line: 100 }
    },
    {
      title: 'Potential for XSS attacks due to improper sanitization of response data.',
      severity: 'high',
      category: 'security',
      location: { file: 'src/utils.ts', line: 45 }
    },
    {
      title: 'Missing error handling can lead to unhandled promise rejections, risking application stability.',
      severity: 'medium',
      category: 'error-handling',
      location: { file: 'src/index.ts', line: 75 }
    },
    {
      title: 'Usage of deprecated `Promise` methods can lead to compatibility issues with future JavaScript versions.',
      severity: 'low',
      category: 'deprecation',
      location: { file: 'src/promise-utils.ts', line: 20 }
    },
    {
      title: 'Potential data loss if a request fails and retries are not implemented properly.',
      severity: 'high',
      category: 'reliability',
      location: { file: 'src/retry.ts', line: 55 }
    }
  ];
  
  // Mock DeepWiki response (what we actually get)
  const mockResponse = `UNCHANGED ISSUES (still exist in PR):
1. \`ky\` does not handle redirects properly, which can lead to unexpected behaviors in request handling.
2. Potential for XSS attacks due to improper sanitization of response data.
3. Missing error handling can lead to unhandled promise rejections, risking application stability.
4. Usage of deprecated \`Promise\` methods can lead to compatibility issues with future JavaScript versions.
5. Potential data loss if a request fails and retries are not implemented properly.

FIXED ISSUES (resolved in PR):
None

NEW ISSUES (introduced in PR):
None`;

  // Test the parser directly
  console.log('📝 Testing parser with mock response...\n');
  
  // Access the private method via any type casting
  const apiAny = api as any;
  const parsed = apiAny.parseDeepWikiPRResponse(mockResponse, mainBranchIssues);
  
  console.log('📊 Parsed result:');
  console.log(`  Result type: ${typeof parsed}`);
  console.log(`  Result:`, parsed);
  
  // The parser returns an object with issues array
  const issues = parsed.issues || parsed || [];
  console.log(`  Total issues: ${issues.length}`);
  
  const unchanged = issues.filter((i: any) => i.status === 'unchanged');
  const fixed = issues.filter((i: any) => i.status === 'fixed');
  const newIssues = issues.filter((i: any) => i.status === 'new');
  
  console.log(`  Issues by status:`);
  console.log(`    - Unchanged: ${unchanged.length}`);
  console.log(`    - Fixed: ${fixed.length}`);
  console.log(`    - New: ${newIssues.length}`);
  
  if (unchanged.length > 0) {
    console.log('\n✅ Parser successfully detected unchanged issues!');
    console.log('\nSample unchanged issues:');
    unchanged.slice(0, 3).forEach((issue: any, idx: number) => {
      console.log(`${idx + 1}. ${issue.title}`);
      console.log(`   Location: ${issue.location?.file || issue.file}:${issue.location?.line || issue.line}`);
      console.log(`   Severity: ${issue.severity}`);
    });
  } else {
    console.log('\n❌ Parser failed to detect unchanged issues');
  }
}

testParserFix().catch(console.error);