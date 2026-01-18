/**
 * Tool Validation Test - Session 92
 *
 * Tests all tools to ensure they produce at least 1 finding.
 * Uses specific repos chosen to trigger each tool.
 */

import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { JavaToolOrchestrator } from '../../src/two-branch/tools/java/java-tool-orchestrator';

// Test scenarios for tool validation
interface ToolValidationScenario {
  name: string;
  repoUrl: string;
  prNumber?: number;
  language: 'java' | 'typescript' | 'python';
  expectedTools: string[];  // Tools expected to find issues
  reason: string;  // Why this repo triggers these tools
}

const TOOL_VALIDATION_SCENARIOS: ToolValidationScenario[] = [
  // Swagger Petstore - Has openapi.yaml for Spectral
  {
    name: 'Swagger Petstore (OpenAPI for Spectral)',
    repoUrl: 'https://github.com/swagger-api/swagger-petstore',
    prNumber: 218,
    language: 'java',
    expectedTools: ['spectral'],
    reason: 'Has src/main/resources/openapi.yaml'
  },
  // Netflix DGS Examples - Has GraphQL schemas for graphql-cop
  {
    name: 'Netflix DGS Examples (GraphQL for graphql-cop)',
    repoUrl: 'https://github.com/Netflix/dgs-examples-java',
    prNumber: 196,
    language: 'java',
    expectedTools: ['graphql-cop'],
    reason: 'Has .graphqls schema files'
  }
];

/**
 * Clone a repository
 */
function cloneRepository(repoUrl: string, targetPath: string): void {
  console.log(`   🔄 Cloning ${repoUrl}...`);

  if (fs.existsSync(targetPath)) {
    execSync(`rm -rf ${targetPath}`);
  }

  execSync(`git clone --depth 1 ${repoUrl} ${targetPath}`, {
    stdio: 'pipe',
    encoding: 'utf-8'
  });

  console.log(`   ✅ Repository cloned to ${targetPath}`);
}

/**
 * Check out a specific PR
 */
function checkoutPR(repoPath: string, prNumber: number): void {
  console.log(`   🔀 Checking out PR #${prNumber}...`);

  try {
    execSync(`git -C ${repoPath} fetch origin pull/${prNumber}/head:pr-${prNumber}`, { stdio: 'pipe' });
    execSync(`git -C ${repoPath} checkout pr-${prNumber}`, { stdio: 'pipe' });
    console.log(`   ✅ Checked out PR branch`);
  } catch (error) {
    console.log(`   ⚠️ Could not checkout PR, using default branch`);
  }
}

/**
 * Run tool validation for a scenario
 */
async function runToolValidation(scenario: ToolValidationScenario): Promise<{
  success: boolean;
  toolResults: Record<string, number>;
}> {
  const timestamp = Date.now();
  const repoPath = `/tmp/tool-validation-${timestamp}`;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing: ${scenario.name}`);
  console.log(`📋 Reason: ${scenario.reason}`);
  console.log(`🎯 Expected tools: ${scenario.expectedTools.join(', ')}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Clone repository
    cloneRepository(scenario.repoUrl, repoPath);

    // Checkout PR if specified
    if (scenario.prNumber) {
      checkoutPR(repoPath, scenario.prNumber);
    }

    // List files to verify content
    console.log(`\n📁 Checking for relevant files...`);

    // Check for OpenAPI files
    const openApiFiles = execSync(
      `find ${repoPath} -name "*.yaml" -o -name "*.yml" -o -name "*.json" 2>/dev/null | xargs grep -l "openapi\\|swagger" 2>/dev/null | head -5 || true`,
      { encoding: 'utf-8' }
    ).trim();
    if (openApiFiles) {
      console.log(`   📋 OpenAPI files found:\n${openApiFiles.split('\n').map(f => `      - ${f}`).join('\n')}`);
    }

    // Check for GraphQL files
    const graphqlFiles = execSync(
      `find ${repoPath} -name "*.graphql" -o -name "*.graphqls" 2>/dev/null | head -5 || true`,
      { encoding: 'utf-8' }
    ).trim();
    if (graphqlFiles) {
      console.log(`   🔮 GraphQL files found:\n${graphqlFiles.split('\n').map(f => `      - ${f}`).join('\n')}`);
    }

    // Check for pom.xml (dependency-check)
    const pomFiles = execSync(
      `find ${repoPath} -name "pom.xml" 2>/dev/null | head -5 || true`,
      { encoding: 'utf-8' }
    ).trim();
    if (pomFiles) {
      console.log(`   📦 Maven POM files found:\n${pomFiles.split('\n').map(f => `      - ${f}`).join('\n')}`);
    }

    // Run the orchestrator
    console.log(`\n🚀 Running Java Tool Orchestrator...`);
    const orchestrator = new JavaToolOrchestrator();

    const result = await orchestrator.orchestrate({
      repositoryPath: repoPath,
      branch: scenario.prNumber ? `pr-${scenario.prNumber}` : 'main',
      mode: 'complete',  // Use complete mode to run all tools
      tier: 'basic'
    });

    // Collect tool results
    const toolResults: Record<string, number> = {};

    for (const toolResult of result.results) {
      toolResults[toolResult.tool] = toolResult.issues.length;
    }

    console.log(`\n📊 Tool Results:`);
    console.log(`${'─'.repeat(50)}`);
    for (const [tool, count] of Object.entries(toolResults).sort((a, b) => b[1] - a[1])) {
      const status = count > 0 ? '✅' : '❌';
      const isExpected = scenario.expectedTools.includes(tool);
      const highlight = isExpected ? (count > 0 ? ' ⭐ EXPECTED!' : ' ⚠️ MISSING!') : '';
      console.log(`   ${status} ${tool}: ${count} issues${highlight}`);
    }

    // Check if expected tools found issues
    const expectedSuccess = scenario.expectedTools.every(tool => (toolResults[tool] || 0) > 0);

    console.log(`\n${expectedSuccess ? '✅' : '❌'} Expected tools ${expectedSuccess ? 'ALL FOUND ISSUES' : 'SOME MISSING'}`);

    // Cleanup
    execSync(`rm -rf ${repoPath}`);

    return {
      success: expectedSuccess,
      toolResults
    };

  } catch (error) {
    console.error(`\n❌ Error: ${error}`);
    execSync(`rm -rf ${repoPath} 2>/dev/null || true`);
    return {
      success: false,
      toolResults: {}
    };
  }
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                     TOOL VALIDATION TEST - SESSION 92                      ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Purpose: Ensure all tools can produce at least 1 finding                 ║
║  Tools being validated: SpotBugs, JDepend, dependency-check,              ║
║                         spectral, graphql-cop                             ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  const results: Array<{
    scenario: string;
    success: boolean;
    toolResults: Record<string, number>;
  }> = [];

  for (const scenario of TOOL_VALIDATION_SCENARIOS) {
    const result = await runToolValidation(scenario);
    results.push({
      scenario: scenario.name,
      ...result
    });
  }

  // Final summary
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`                         FINAL VALIDATION SUMMARY`);
  console.log(`${'═'.repeat(80)}\n`);

  // Aggregate all tool findings
  const allToolResults: Record<string, number> = {};
  for (const result of results) {
    for (const [tool, count] of Object.entries(result.toolResults)) {
      allToolResults[tool] = (allToolResults[tool] || 0) + count;
    }
  }

  console.log(`📊 Aggregate Tool Findings:`);
  console.log(`${'─'.repeat(50)}`);

  const toolsToValidate = ['spotbugs', 'jdepend', 'dependency-check', 'spectral', 'graphql-cop'];
  let allValidated = true;

  for (const tool of toolsToValidate) {
    const count = allToolResults[tool] || 0;
    const status = count > 0 ? '✅' : '❌';
    console.log(`   ${status} ${tool}: ${count} total issues`);
    if (count === 0) allValidated = false;
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`${allValidated ? '✅ ALL TOOLS VALIDATED' : '⚠️ SOME TOOLS NEED ATTENTION'}`);
  console.log(`${'═'.repeat(80)}\n`);

  process.exit(allValidated ? 0 : 1);
}

main().catch(console.error);
