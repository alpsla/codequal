#!/usr/bin/env npx ts-node
/**
 * V9 PHP API Test
 *
 * Tests V9 API service for PHP repositories using the unified API test runner.
 * Replaces test-v9-php-lite-e2e.ts with API-based approach.
 *
 * Usage:
 *   npx ts-node test-v9-php-api.ts
 *
 *   # With custom API URL
 *   API_BASE_URL=http://localhost:8080 npx ts-node test-v9-php-api.ts
 *
 *   # Test both tiers
 *   TEST_BOTH_TIERS=true npx ts-node test-v9-php-api.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { UnifiedAPITestRunner, TestScenario } from '../lib/unified-api-test-runner';

const API_BASE_URL = process.env.API_BASE_URL || 'http://129.212.136.24';
const TEST_BOTH_TIERS = process.env.TEST_BOTH_TIERS === 'true';

// PHP test scenarios
const PHP_SCENARIOS: TestScenario[] = [
  {
    name: 'Laravel Framework',
    repoUrl: 'https://github.com/laravel/framework',
    prNumber: 50000,
    language: 'php',
    tier: 'pro',
    expectedToolCount: 3, // phpstan, semgrep, composer-audit
  },
  {
    name: 'Symfony',
    repoUrl: 'https://github.com/symfony/symfony',
    prNumber: 55000,
    language: 'php',
    tier: 'basic',
    expectedToolCount: 3,
  },
];

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     V9 PHP API TEST                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  API URL: ${API_BASE_URL.padEnd(54)}║`);
  console.log(`║  Tools: phpstan, semgrep, composer-audit                         ║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const runner = new UnifiedAPITestRunner({
    apiBaseUrl: API_BASE_URL,
    verbose: true,
  });

  let scenarios = PHP_SCENARIOS;

  if (TEST_BOTH_TIERS) {
    const basicScenarios = PHP_SCENARIOS.map(s => ({ ...s, tier: 'basic' as const, name: `${s.name} (BASIC)` }));
    const proScenarios = PHP_SCENARIOS.map(s => ({ ...s, tier: 'pro' as const, name: `${s.name} (PRO)` }));
    scenarios = [...basicScenarios, ...proScenarios];
  }

  const result = await runner.runBatch(scenarios);

  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
