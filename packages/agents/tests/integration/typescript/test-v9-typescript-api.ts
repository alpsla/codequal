#!/usr/bin/env npx ts-node
/**
 * V9 TypeScript API Test
 *
 * Tests V9 API service for TypeScript/JavaScript repositories using the unified API test runner.
 * Replaces test-v9-typescript-lite-e2e.ts with API-based approach.
 *
 * Usage:
 *   npx ts-node test-v9-typescript-api.ts
 *
 *   # With custom API URL
 *   API_BASE_URL=http://localhost:8080 npx ts-node test-v9-typescript-api.ts
 *
 *   # Test both tiers
 *   TEST_BOTH_TIERS=true npx ts-node test-v9-typescript-api.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { UnifiedAPITestRunner, TestScenario } from '../lib/unified-api-test-runner';

const API_BASE_URL = process.env.API_BASE_URL || 'http://129.212.136.24';
const TEST_BOTH_TIERS = process.env.TEST_BOTH_TIERS === 'true';

// TypeScript test scenarios
const TYPESCRIPT_SCENARIOS: TestScenario[] = [
  {
    name: 'Express.js',
    repoUrl: 'https://github.com/expressjs/express',
    prNumber: 5678,
    language: 'typescript',
    tier: 'pro',
    expectedToolCount: 3, // eslint, semgrep, npm-audit
  },
  {
    name: 'NestJS',
    repoUrl: 'https://github.com/nestjs/nest',
    prNumber: 13000,
    language: 'typescript',
    tier: 'basic',
    expectedToolCount: 3,
  },
  {
    name: 'Next.js',
    repoUrl: 'https://github.com/vercel/next.js',
    prNumber: 60000,
    language: 'typescript',
    tier: 'pro',
    expectedToolCount: 3,
  },
];

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     V9 TYPESCRIPT API TEST                                       ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  API URL: ${API_BASE_URL.padEnd(54)}║`);
  console.log(`║  Tools: eslint, semgrep, npm-audit                               ║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const runner = new UnifiedAPITestRunner({
    apiBaseUrl: API_BASE_URL,
    verbose: true,
  });

  let scenarios = TYPESCRIPT_SCENARIOS;

  if (TEST_BOTH_TIERS) {
    const basicScenarios = TYPESCRIPT_SCENARIOS.map(s => ({ ...s, tier: 'basic' as const, name: `${s.name} (BASIC)` }));
    const proScenarios = TYPESCRIPT_SCENARIOS.map(s => ({ ...s, tier: 'pro' as const, name: `${s.name} (PRO)` }));
    scenarios = [...basicScenarios, ...proScenarios];
  }

  const result = await runner.runBatch(scenarios);

  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
