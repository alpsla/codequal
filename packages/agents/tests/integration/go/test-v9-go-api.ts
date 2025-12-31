#!/usr/bin/env npx ts-node
/**
 * V9 Go API Test
 *
 * Tests V9 API service for Go repositories using the unified API test runner.
 * Replaces test-v9-go-lite-e2e.ts with API-based approach.
 *
 * Usage:
 *   npx ts-node test-v9-go-api.ts
 *
 *   # With custom API URL
 *   API_BASE_URL=http://localhost:8080 npx ts-node test-v9-go-api.ts
 *
 *   # Test both tiers
 *   TEST_BOTH_TIERS=true npx ts-node test-v9-go-api.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { UnifiedAPITestRunner, TestScenario } from '../lib/unified-api-test-runner';

const API_BASE_URL = process.env.API_BASE_URL || 'http://129.212.136.24';
const TEST_BOTH_TIERS = process.env.TEST_BOTH_TIERS === 'true';

// Go test scenarios
const GO_SCENARIOS: TestScenario[] = [
  {
    name: 'Gin Web Framework',
    repoUrl: 'https://github.com/gin-gonic/gin',
    prNumber: 3900,
    language: 'go',
    tier: 'pro',
    expectedToolCount: 4, // golangci-lint, gosec, govulncheck, semgrep
  },
  {
    name: 'Gorilla Mux',
    repoUrl: 'https://github.com/gorilla/mux',
    prNumber: 700,
    language: 'go',
    tier: 'basic',
    expectedToolCount: 4,
  },
];

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     V9 GO API TEST                                               ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  API URL: ${API_BASE_URL.padEnd(54)}║`);
  console.log(`║  Tools: golangci-lint, gosec, govulncheck, semgrep               ║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const runner = new UnifiedAPITestRunner({
    apiBaseUrl: API_BASE_URL,
    verbose: true,
  });

  let scenarios = GO_SCENARIOS;

  if (TEST_BOTH_TIERS) {
    const basicScenarios = GO_SCENARIOS.map(s => ({ ...s, tier: 'basic' as const, name: `${s.name} (BASIC)` }));
    const proScenarios = GO_SCENARIOS.map(s => ({ ...s, tier: 'pro' as const, name: `${s.name} (PRO)` }));
    scenarios = [...basicScenarios, ...proScenarios];
  }

  const result = await runner.runBatch(scenarios);

  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
