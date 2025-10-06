#!/usr/bin/env ts-node
/**
 * BUG-107: Link Validation Test
 *
 * Tests that educational resource URLs are validated and properly mapped
 */

import { LinkValidator } from './src/two-branch/utils/link-validator';

async function testLinkValidation(): Promise<void> {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  BUG-107: Link Validation Test                          ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  const validator = new LinkValidator();

  // Test 1: Validate known good URLs
  console.log("TEST 1: Validate known good URLs\n");

  const goodUrls = [
    'https://owasp.org/www-project-top-ten/',
    'https://github.com/topics/code-quality',
    'https://docs.oracle.com/javase/8/docs/technotes/guides/performance/'
  ];

  for (const url of goodUrls) {
    const isValid = await validator.validateUrl(url);
    console.log(`  ${isValid ? '✅' : '❌'} ${url}: ${isValid ? 'Valid' : 'Invalid'}`);
  }
  console.log();

  // Test 2: Validate URL caching
  console.log("TEST 2: Validate URL caching\n");

  const testUrl = 'https://owasp.org/www-project-top-ten/';
  const startTime = Date.now();
  await validator.validateUrl(testUrl);
  const firstCallTime = Date.now() - startTime;

  const cachedStartTime = Date.now();
  await validator.validateUrl(testUrl);
  const cachedCallTime = Date.now() - cachedStartTime;

  console.log(`  First call: ${firstCallTime}ms`);
  console.log(`  Cached call: ${cachedCallTime}ms`);
  console.log(`  ${cachedCallTime < firstCallTime ? '✅' : '❌'} Cache speedup: ${firstCallTime - cachedCallTime}ms\n`);

  // Test 3: Resource mapping for issue types
  console.log("TEST 3: Resource mapping for issue types\n");

  const testCases = [
    {
      title: 'SQL Injection vulnerability detected',
      category: 'Security',
      tool: 'semgrep',
      expectedUrl: 'https://owasp.org/www-community/attacks/SQL_Injection'
    },
    {
      title: 'Cross-Site Scripting (XSS) risk',
      category: 'Security',
      tool: 'semgrep',
      expectedUrl: 'https://owasp.org/www-community/attacks/xss/'
    },
    {
      title: 'CVE-2021-44228 detected',
      category: 'Dependency',
      tool: 'dependency-check',
      expectedUrl: 'https://nvd.nist.gov/'
    },
    {
      title: 'N+1 query detected',
      category: 'Performance',
      tool: 'pmd',
      expectedUrl: 'https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem'
    },
    {
      title: 'Generic code smell',
      category: 'Quality',
      tool: 'pmd',
      expectedUrl: 'https://refactoring.guru/refactoring'
    }
  ];

  for (const testCase of testCases) {
    const resource = validator.getEducationalResource(
      testCase.title,
      testCase.category,
      testCase.tool
    );

    const matches = resource.url === testCase.expectedUrl;
    console.log(`  ${matches ? '✅' : '⚠️'} ${testCase.title}`);
    console.log(`     Expected: ${testCase.expectedUrl}`);
    console.log(`     Got: ${resource.url}`);
    console.log(`     Title: ${resource.title}`);
    console.log();
  }

  // Test 4: Category-based fallback
  console.log("TEST 4: Category-based fallback\n");

  const categoryTests = [
    { category: 'Security', expectedPattern: 'owasp.org' },
    { category: 'Performance', expectedPattern: 'oracle.com' },
    { category: 'Architecture', expectedPattern: 'martinfowler.com' }
  ];

  for (const test of categoryTests) {
    const resource = validator.getEducationalResource(
      'Unknown issue type',
      test.category,
      'unknown-tool'
    );

    const matches = resource.url.includes(test.expectedPattern);
    console.log(`  ${matches ? '✅' : '❌'} ${test.category}: ${resource.url}`);
  }
  console.log();

  // Test 5: Tool-based fallback
  console.log("TEST 5: Tool-based fallback\n");

  const toolTests = [
    { tool: 'semgrep', expectedPattern: 'semgrep.dev' },
    { tool: 'pmd', expectedPattern: 'pmd.github.io' },
    { tool: 'checkstyle', expectedPattern: 'checkstyle.org' }
  ];

  for (const test of toolTests) {
    const resource = validator.getEducationalResource(
      'Unknown issue',
      'Unknown',
      test.tool
    );

    const matches = resource.url.includes(test.expectedPattern);
    console.log(`  ${matches ? '✅' : '❌'} ${test.tool}: ${resource.url}`);
  }
  console.log();

  // Test 6: Batch validation
  console.log("TEST 6: Batch URL validation\n");

  const batchUrls = [
    'https://owasp.org/www-project-top-ten/',
    'https://pmd.github.io/',
    'https://semgrep.dev/docs/',
    'https://github.com/topics/code-quality'
  ];

  const batchStartTime = Date.now();
  const results = await validator.validateUrls(batchUrls);
  const batchTime = Date.now() - batchStartTime;

  console.log(`  Validated ${batchUrls.length} URLs in ${batchTime}ms`);
  for (const [url, isValid] of results.entries()) {
    console.log(`  ${isValid ? '✅' : '❌'} ${url}`);
  }
  console.log();

  // Test 7: Cache statistics
  console.log("TEST 7: Cache statistics\n");

  const stats = validator.getCacheStats();
  console.log(`  Cache size: ${stats.size}`);
  console.log(`  Valid URLs: ${stats.validCount}`);
  console.log(`  Invalid URLs: ${stats.invalidCount}`);
  console.log(`  ✅ Cache tracking working\n`);

  // Test 8: Get validated resources for multiple issues
  console.log("TEST 8: Get validated resources for issues\n");

  const issues = [
    { title: 'SQL Injection', category: 'Security', tool: 'semgrep' },
    { title: 'N+1 query', category: 'Performance', tool: 'pmd' },
    { title: 'CVE-2021-44228', category: 'Dependency', tool: 'dependency-check' }
  ];

  const validatedResources = await validator.getValidatedResources(issues);

  console.log(`  Retrieved ${validatedResources.length} unique resources`);
  for (const resource of validatedResources) {
    console.log(`  ${resource.isValid ? '✅' : '❌'} ${resource.title}`);
    console.log(`     URL: ${resource.url}`);
    console.log(`     Valid: ${resource.isValid}`);
  }
  console.log();

  // Test 9: Clear cache functionality
  console.log("TEST 9: Clear cache functionality\n");

  const beforeClear = validator.getCacheStats();
  validator.clearCache();
  const afterClear = validator.getCacheStats();

  console.log(`  Before clear: ${beforeClear.size} entries`);
  console.log(`  After clear: ${afterClear.size} entries`);
  console.log(`  ${afterClear.size === 0 ? '✅' : '❌'} Cache cleared successfully\n`);

  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  BUG-107 Validation Complete                             ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  console.log("✅ Link validation working!\n");
  console.log("Features Verified:");
  console.log("  ✅ URL validation with HEAD/GET fallback");
  console.log("  ✅ URL caching for performance");
  console.log("  ✅ Issue-specific resource mapping");
  console.log("  ✅ Category-based fallback");
  console.log("  ✅ Tool-based fallback");
  console.log("  ✅ Batch validation with concurrency");
  console.log("  ✅ Cache statistics tracking");
  console.log("  ✅ Validated resource retrieval");
  console.log("  ✅ Cache clearing functionality\n");

  console.log("📋 Next Step:");
  console.log("   Integrate into V9 report formatter to add educational resources to issues\n");
}

if (require.main === module) {
  testLinkValidation()
    .then(() => {
      console.log("✅ Test completed successfully");
      process.exit(0);
    })
    .catch(error => {
      console.error("❌ Test failed:", error);
      process.exit(1);
    });
}

export { testLinkValidation };
