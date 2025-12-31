#!/usr/bin/env npx ts-node
/**
 * V9 Ruby API Test
 *
 * Tests V9 API service for Ruby repositories using the unified API test runner.
 * Replaces test-v9-ruby-lite-e2e.ts with API-based approach.
 *
 * Usage:
 *   npx ts-node test-v9-ruby-api.ts
 *
 *   # With custom API URL
 *   API_BASE_URL=http://localhost:8080 npx ts-node test-v9-ruby-api.ts
 *
 *   # Test both tiers
 *   TEST_BOTH_TIERS=true npx ts-node test-v9-ruby-api.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { UnifiedAPITestRunner, TestScenario } from '../lib/unified-api-test-runner';

const API_BASE_URL = process.env.API_BASE_URL || 'http://129.212.136.24';
const TEST_BOTH_TIERS = process.env.TEST_BOTH_TIERS === 'true';

// Ruby test scenarios
const RUBY_SCENARIOS: TestScenario[] = [
  {
    name: 'Sinatra',
    repoUrl: 'https://github.com/sinatra/sinatra',
    prNumber: 1900,
    language: 'ruby',
    tier: 'pro',
    expectedToolCount: 3, // rubocop, brakeman, bundler-audit
  },
  {
    name: 'Rails',
    repoUrl: 'https://github.com/rails/rails',
    prNumber: 50000,
    language: 'ruby',
    tier: 'basic',
    expectedToolCount: 3,
  },
];

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     V9 RUBY API TEST                                             ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  API URL: ${API_BASE_URL.padEnd(54)}║`);
  console.log(`║  Tools: rubocop, brakeman, bundler-audit                         ║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const runner = new UnifiedAPITestRunner({
    apiBaseUrl: API_BASE_URL,
    verbose: true,
  });

  let scenarios = RUBY_SCENARIOS;

  if (TEST_BOTH_TIERS) {
    const basicScenarios = RUBY_SCENARIOS.map(s => ({ ...s, tier: 'basic' as const, name: `${s.name} (BASIC)` }));
    const proScenarios = RUBY_SCENARIOS.map(s => ({ ...s, tier: 'pro' as const, name: `${s.name} (PRO)` }));
    scenarios = [...basicScenarios, ...proScenarios];
  }

  const result = await runner.runBatch(scenarios);

  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
