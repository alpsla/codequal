#!/usr/bin/env npx ts-node
/**
 * V9 Rust API Test
 *
 * Tests V9 API service for Rust repositories using the unified API test runner.
 * Replaces test-v9-rust-lite-e2e.ts with API-based approach.
 *
 * Usage:
 *   npx ts-node test-v9-rust-api.ts
 *
 *   # With custom API URL
 *   API_BASE_URL=http://localhost:8080 npx ts-node test-v9-rust-api.ts
 *
 *   # Test both tiers
 *   TEST_BOTH_TIERS=true npx ts-node test-v9-rust-api.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { UnifiedAPITestRunner, TestScenario } from '../lib/unified-api-test-runner';

const API_BASE_URL = process.env.API_BASE_URL || 'http://129.212.136.24';
const TEST_BOTH_TIERS = process.env.TEST_BOTH_TIERS === 'true';

// Rust test scenarios
const RUST_SCENARIOS: TestScenario[] = [
  {
    name: 'Tokio',
    repoUrl: 'https://github.com/tokio-rs/tokio',
    prNumber: 6500,
    language: 'rust',
    tier: 'pro',
    expectedToolCount: 2, // clippy, cargo-audit
  },
  {
    name: 'Actix Web',
    repoUrl: 'https://github.com/actix/actix-web',
    prNumber: 3200,
    language: 'rust',
    tier: 'basic',
    expectedToolCount: 2,
  },
];

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     V9 RUST API TEST                                             ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  API URL: ${API_BASE_URL.padEnd(54)}║`);
  console.log(`║  Tools: clippy, cargo-audit                                      ║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const runner = new UnifiedAPITestRunner({
    apiBaseUrl: API_BASE_URL,
    verbose: true,
  });

  let scenarios = RUST_SCENARIOS;

  if (TEST_BOTH_TIERS) {
    const basicScenarios = RUST_SCENARIOS.map(s => ({ ...s, tier: 'basic' as const, name: `${s.name} (BASIC)` }));
    const proScenarios = RUST_SCENARIOS.map(s => ({ ...s, tier: 'pro' as const, name: `${s.name} (PRO)` }));
    scenarios = [...basicScenarios, ...proScenarios];
  }

  const result = await runner.runBatch(scenarios);

  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
