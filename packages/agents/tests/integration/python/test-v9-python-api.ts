#!/usr/bin/env npx ts-node
/**
 * V9 Python API Test
 *
 * Tests V9 API service for Python repositories using the unified API test runner.
 * Replaces test-v9-python-lite-e2e.ts with API-based approach.
 *
 * Usage:
 *   npx ts-node test-v9-python-api.ts
 *
 *   # With custom API URL
 *   API_BASE_URL=http://localhost:8080 npx ts-node test-v9-python-api.ts
 *
 *   # Test both tiers
 *   TEST_BOTH_TIERS=true npx ts-node test-v9-python-api.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { UnifiedAPITestRunner, TestScenario } from '../lib/unified-api-test-runner';

const API_BASE_URL = process.env.API_BASE_URL || 'http://129.212.136.24';
const TEST_BOTH_TIERS = process.env.TEST_BOTH_TIERS === 'true';

// Python test scenarios
const PYTHON_SCENARIOS: TestScenario[] = [
  {
    name: 'Flask',
    repoUrl: 'https://github.com/pallets/flask',
    prNumber: 5432,
    language: 'python',
    tier: 'pro',
    expectedToolCount: 4, // ruff, bandit, pip-audit, semgrep
  },
  {
    name: 'Django',
    repoUrl: 'https://github.com/django/django',
    prNumber: 18000,
    language: 'python',
    tier: 'basic',
    expectedToolCount: 4,
  },
  {
    name: 'FastAPI',
    repoUrl: 'https://github.com/fastapi/fastapi',
    prNumber: 12000,
    language: 'python',
    tier: 'pro',
    expectedToolCount: 4,
  },
];

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     V9 PYTHON API TEST                                           ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  API URL: ${API_BASE_URL.padEnd(54)}║`);
  console.log(`║  Tools: ruff, bandit, pip-audit, semgrep                         ║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const runner = new UnifiedAPITestRunner({
    apiBaseUrl: API_BASE_URL,
    verbose: true,
  });

  let scenarios = PYTHON_SCENARIOS;

  if (TEST_BOTH_TIERS) {
    const basicScenarios = PYTHON_SCENARIOS.map(s => ({ ...s, tier: 'basic' as const, name: `${s.name} (BASIC)` }));
    const proScenarios = PYTHON_SCENARIOS.map(s => ({ ...s, tier: 'pro' as const, name: `${s.name} (PRO)` }));
    scenarios = [...basicScenarios, ...proScenarios];
  }

  const result = await runner.runBatch(scenarios);

  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
