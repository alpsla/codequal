#!/usr/bin/env npx ts-node
/**
 * V9 Java API Test
 *
 * Tests V9 API service for Java repositories using the unified API test runner.
 * Replaces test-v9-lite-e2e.ts (Java scenarios) with API-based approach.
 *
 * Usage:
 *   npx ts-node test-v9-java-api.ts
 *
 *   # With custom API URL
 *   API_BASE_URL=http://localhost:8080 npx ts-node test-v9-java-api.ts
 *
 *   # Test both tiers
 *   TEST_BOTH_TIERS=true npx ts-node test-v9-java-api.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { UnifiedAPITestRunner, TestScenario } from '../lib/unified-api-test-runner';

const API_BASE_URL = process.env.API_BASE_URL || 'http://129.212.136.24';
const TEST_BOTH_TIERS = process.env.TEST_BOTH_TIERS === 'true';

// Java test scenarios
const JAVA_SCENARIOS: TestScenario[] = [
  {
    name: 'Spring PetClinic',
    repoUrl: 'https://github.com/spring-projects/spring-petclinic',
    prNumber: 950,
    language: 'java',
    tier: 'pro',
    expectedToolCount: 3, // pmd, semgrep, dependency-check
  },
  {
    name: 'Spring Boot',
    repoUrl: 'https://github.com/spring-projects/spring-boot',
    prNumber: 40000,
    language: 'java',
    tier: 'basic',
    expectedToolCount: 3,
  },
];

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     V9 JAVA API TEST                                             ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  API URL: ${API_BASE_URL.padEnd(54)}║`);
  console.log(`║  Tools: pmd, semgrep, dependency-check                           ║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const runner = new UnifiedAPITestRunner({
    apiBaseUrl: API_BASE_URL,
    verbose: true,
  });

  let scenarios = JAVA_SCENARIOS;

  if (TEST_BOTH_TIERS) {
    const basicScenarios = JAVA_SCENARIOS.map(s => ({ ...s, tier: 'basic' as const, name: `${s.name} (BASIC)` }));
    const proScenarios = JAVA_SCENARIOS.map(s => ({ ...s, tier: 'pro' as const, name: `${s.name} (PRO)` }));
    scenarios = [...basicScenarios, ...proScenarios];
  }

  const result = await runner.runBatch(scenarios);

  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
