#!/usr/bin/env npx ts-node
/**
 * V9 Unified All Languages Test
 *
 * Tests V9 API service across all supported languages using the unified API test runner.
 * This replaces the individual language-specific test files with a single, consistent approach.
 *
 * Usage:
 *   # Test all languages (default)
 *   npx ts-node test-v9-unified-all-languages.ts
 *
 *   # Test specific language
 *   LANGUAGE=java npx ts-node test-v9-unified-all-languages.ts
 *
 *   # Test with custom API URL
 *   API_BASE_URL=http://localhost:8080 npx ts-node test-v9-unified-all-languages.ts
 *
 *   # Test both tiers for each scenario
 *   TEST_BOTH_TIERS=true npx ts-node test-v9-unified-all-languages.ts
 *
 *   # Quick mode (1 repo per language)
 *   QUICK_MODE=true npx ts-node test-v9-unified-all-languages.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import {
  UnifiedAPITestRunner,
  TestScenario,
  SupportedLanguage,
  BatchTestResult,
} from './lib/unified-api-test-runner';

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE_URL = process.env.API_BASE_URL || 'http://129.212.136.24';
const TARGET_LANGUAGE = process.env.LANGUAGE as SupportedLanguage | undefined;
const TEST_BOTH_TIERS = process.env.TEST_BOTH_TIERS === 'true';
const QUICK_MODE = process.env.QUICK_MODE === 'true';

// =============================================================================
// TEST SCENARIOS BY LANGUAGE
// =============================================================================

const JAVA_SCENARIOS: TestScenario[] = [
  {
    name: 'Spring PetClinic',
    repoUrl: 'https://github.com/spring-projects/spring-petclinic',
    prNumber: 950,
    language: 'java',
    tier: 'pro',
    expectedToolCount: 3, // pmd, semgrep, dependency-check
  },
  ...(QUICK_MODE ? [] : [
    {
      name: 'Spring Boot',
      repoUrl: 'https://github.com/spring-projects/spring-boot',
      prNumber: 40000,
      language: 'java' as const,
      tier: 'basic' as const,
      expectedToolCount: 3,
    },
  ]),
];

const TYPESCRIPT_SCENARIOS: TestScenario[] = [
  {
    name: 'Express.js',
    repoUrl: 'https://github.com/expressjs/express',
    prNumber: 5678,
    language: 'typescript',
    tier: 'pro',
    expectedToolCount: 3, // eslint, semgrep, npm-audit
  },
  ...(QUICK_MODE ? [] : [
    {
      name: 'NestJS',
      repoUrl: 'https://github.com/nestjs/nest',
      prNumber: 13000,
      language: 'typescript' as const,
      tier: 'basic' as const,
      expectedToolCount: 3,
    },
  ]),
];

const PYTHON_SCENARIOS: TestScenario[] = [
  {
    name: 'Flask',
    repoUrl: 'https://github.com/pallets/flask',
    prNumber: 5432,
    language: 'python',
    tier: 'pro',
    expectedToolCount: 4, // ruff, bandit, pip-audit, semgrep
  },
  ...(QUICK_MODE ? [] : [
    {
      name: 'Django',
      repoUrl: 'https://github.com/django/django',
      prNumber: 18000,
      language: 'python' as const,
      tier: 'basic' as const,
      expectedToolCount: 4,
    },
    {
      name: 'FastAPI',
      repoUrl: 'https://github.com/fastapi/fastapi',
      prNumber: 12000,
      language: 'python' as const,
      tier: 'basic' as const,
      expectedToolCount: 4,
    },
  ]),
];

const GO_SCENARIOS: TestScenario[] = [
  {
    name: 'Gin Web Framework',
    repoUrl: 'https://github.com/gin-gonic/gin',
    prNumber: 3900,
    language: 'go',
    tier: 'pro',
    expectedToolCount: 4, // golangci-lint, gosec, govulncheck, semgrep
  },
  ...(QUICK_MODE ? [] : [
    {
      name: 'Gorilla Mux',
      repoUrl: 'https://github.com/gorilla/mux',
      prNumber: 700,
      language: 'go' as const,
      tier: 'basic' as const,
      expectedToolCount: 4,
    },
  ]),
];

const RUST_SCENARIOS: TestScenario[] = [
  {
    name: 'Tokio',
    repoUrl: 'https://github.com/tokio-rs/tokio',
    prNumber: 6500,
    language: 'rust',
    tier: 'pro',
    expectedToolCount: 2, // clippy, cargo-audit
  },
];

const RUBY_SCENARIOS: TestScenario[] = [
  {
    name: 'Sinatra',
    repoUrl: 'https://github.com/sinatra/sinatra',
    prNumber: 1900,
    language: 'ruby',
    tier: 'pro',
    expectedToolCount: 3, // rubocop, brakeman, bundler-audit
  },
  ...(QUICK_MODE ? [] : [
    {
      name: 'Rails',
      repoUrl: 'https://github.com/rails/rails',
      prNumber: 50000,
      language: 'ruby' as const,
      tier: 'basic' as const,
      expectedToolCount: 3,
    },
  ]),
];

const PHP_SCENARIOS: TestScenario[] = [
  {
    name: 'Laravel Framework',
    repoUrl: 'https://github.com/laravel/framework',
    prNumber: 50000,
    language: 'php',
    tier: 'pro',
    expectedToolCount: 3, // phpstan, semgrep, composer-audit
  },
];

// All scenarios by language
const ALL_SCENARIOS: Record<SupportedLanguage, TestScenario[]> = {
  java: JAVA_SCENARIOS,
  typescript: TYPESCRIPT_SCENARIOS,
  python: PYTHON_SCENARIOS,
  go: GO_SCENARIOS,
  rust: RUST_SCENARIOS,
  ruby: RUBY_SCENARIOS,
  php: PHP_SCENARIOS,
  dotnet: [], // Not yet configured
};

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     V9 UNIFIED ALL LANGUAGES TEST                                ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  API URL: ${API_BASE_URL.padEnd(54)}║`);
  console.log(`║  Mode: ${QUICK_MODE ? 'Quick (1 repo/language)' : 'Full (all repos)'.padEnd(57)}║`);
  console.log(`║  Target: ${(TARGET_LANGUAGE || 'All Languages').padEnd(55)}║`);
  console.log(`║  Both Tiers: ${TEST_BOTH_TIERS ? 'Yes' : 'No'.padEnd(51)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const runner = new UnifiedAPITestRunner({
    apiBaseUrl: API_BASE_URL,
    verbose: true,
  });

  // Determine which scenarios to run
  let scenarios: TestScenario[];

  if (TARGET_LANGUAGE) {
    scenarios = ALL_SCENARIOS[TARGET_LANGUAGE] || [];
    if (scenarios.length === 0) {
      console.error(`No scenarios configured for language: ${TARGET_LANGUAGE}`);
      process.exit(1);
    }
  } else {
    // Run all languages
    scenarios = Object.values(ALL_SCENARIOS).flat();
  }

  // Optionally duplicate scenarios for both tiers
  if (TEST_BOTH_TIERS) {
    const basicScenarios = scenarios.map(s => ({ ...s, tier: 'basic' as const, name: `${s.name} (BASIC)` }));
    const proScenarios = scenarios.map(s => ({ ...s, tier: 'pro' as const, name: `${s.name} (PRO)` }));
    scenarios = [...basicScenarios, ...proScenarios];
  }

  console.log(`\n📋 Running ${scenarios.length} test scenario(s)...\n`);

  // Run all tests
  const result = await runner.runBatch(scenarios);

  // Print language summary
  printLanguageSummary(result);

  // Exit with appropriate code
  process.exit(result.failed > 0 ? 1 : 0);
}

function printLanguageSummary(result: BatchTestResult): void {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('LANGUAGE COVERAGE SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const languages: SupportedLanguage[] = ['java', 'typescript', 'python', 'go', 'rust', 'ruby', 'php'];

  for (const lang of languages) {
    const langResults = result.results.filter(r => r.scenario.language === lang);
    if (langResults.length === 0) {
      console.log(`  ⏭️  ${lang.toUpperCase()}: Not tested`);
      continue;
    }

    const passed = langResults.filter(r => r.success).length;
    const failed = langResults.filter(r => !r.success).length;
    const status = failed === 0 ? '✅' : '❌';

    console.log(`  ${status} ${lang.toUpperCase()}: ${passed}/${langResults.length} passed`);

    // Show details for each test
    for (const r of langResults) {
      const icon = r.success ? '    ✓' : '    ✗';
      const score = r.score ? ` (${r.score.overall}/100)` : '';
      const issues = r.issues ? ` - ${r.issues.total} issues` : '';
      console.log(`${icon} ${r.scenario.name}${score}${issues}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');

  // Tier validation
  console.log('\nTIER FEATURE VALIDATION:');

  const basicResults = result.results.filter(r => r.scenario.tier === 'basic');
  const proResults = result.results.filter(r => r.scenario.tier === 'pro');

  if (basicResults.length > 0) {
    const basicGamification = basicResults.filter(r => r.hasGamification).length;
    const basicHistory = basicResults.filter(r => r.hasHistoricalData).length;
    const basicIDE = basicResults.filter(r => r.hasIDEIntegration).length;

    console.log(`\n  BASIC Tier (${basicResults.length} tests):`);
    console.log(`    Gamification: ${basicGamification}/${basicResults.length} ✅`);
    console.log(`    Historical Data: ${basicHistory}/${basicResults.length} ✅`);
    console.log(`    IDE Integration: ${basicIDE}/${basicResults.length} ✅`);
  }

  if (proResults.length > 0) {
    const proGamification = proResults.filter(r => r.hasGamification).length;
    const proHistory = proResults.filter(r => r.hasHistoricalData).length;
    const proAutoFix = proResults.filter(r => r.hasAutoFix).length;

    console.log(`\n  PRO Tier (${proResults.length} tests):`);
    console.log(`    Gamification: ${proGamification}/${proResults.length} ✅`);
    console.log(`    Historical Data: ${proHistory}/${proResults.length} ✅`);
    console.log(`    Auto-Fix: ${proAutoFix}/${proResults.length} ✅`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════\n');
}

// Run the test
main().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
