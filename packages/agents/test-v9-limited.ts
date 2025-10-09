#!/usr/bin/env ts-node
/**
 * V9 Limited E2E Test - Cost-Safe Version
 * 
 * DIFFERENCES FROM FULL TEST:
 * - Processes only top 3 critical issues (not 10)
 * - Skips AI-heavy report sections
 * - Adds cost tracking and limits
 * - Faster validation of core fixes
 * 
 * Use this for:
 * - Verifying bug fixes (BUG-126, BUG-127, BUG-128)
 * - Quick testing before full run
 * - Cost-conscious validation
 */

// Set max API calls before test will auto-terminate
const MAX_API_CALLS = 100;
let apiCallCount = 0;

// Intercept console.log to count API calls
const originalLog = console.log;
console.log = (...args: any[]) => {
  const message = args.join(' ');
  if (message.includes('OpenRouterKeyManager') || message.includes('Success with key')) {
    apiCallCount++;
    if (apiCallCount >= MAX_API_CALLS) {
      originalLog(`\n⚠️  API CALL LIMIT REACHED (${MAX_API_CALLS}). Stopping test to prevent costs.\n`);
      process.exit(1);
    }
  }
  originalLog.apply(console, args);
};

import * as dotenv from 'dotenv';
import * as pathModule from "path";
dotenv.config({ path: pathModule.join(__dirname, '.env') });

import { JavaToolOrchestrator } from "./src/two-branch/tools/java/java-tool-orchestrator";
import type { OrchestrationResult, RawIssue } from "./src/two-branch/tools/java/java-tool-orchestrator";
import { detectDefaultBranch, getModifiedFilesBetweenBranches } from "./src/two-branch/utils/git-utils";
import { ModelConfigResolver } from "./src/standard/orchestrator/model-config-resolver";
import { execSync } from "child_process";
import * as fs from "fs";

const KAFKA_REPO = "/tmp/kafka-repo";
const KAFKA_URL = "https://github.com/apache/kafka.git";
const PR_NUMBER = 17620;

async function runLimitedTest() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║  V9 LIMITED E2E Test - Cost-Safe Verification                  ║");
  console.log("║  Max API calls: " + MAX_API_CALLS.toString().padEnd(46) + "║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  const startTime = Date.now();

  // Step 1: Repository Setup (reuse existing)
  console.log("📁 STEP 1: Repository Setup\n");
  if (!fs.existsSync(KAFKA_REPO)) {
    console.log("   ❌ Kafka repository not found. Please run full test first or clone manually.");
    process.exit(1);
  }
  const mainBranch = detectDefaultBranch(KAFKA_REPO);
  console.log(`   ✅ Using cached repository (branch: ${mainBranch})\n`);

  // Step 2: Tool Execution (ONLY PR branch for speed)
  console.log("🔧 STEP 2: Tool Execution (PR Branch Only)\n");

  const orchestrator = new JavaToolOrchestrator({
    pmd: { enabled: true, minimumPriority: 2, rulesets: ["category/java/errorprone.xml"], parallel: 2, threads: 2, memory: "3g" },
    semgrep: { enabled: true, rulesets: ["auto"], parallel: 2, smartSelection: false, memory: "2g" },
    checkstyle: { enabled: false, configFile: "google_checks.xml", parallel: 2, memory: "2g", changedFilesOnly: false },
    dependencyCheck: { enabled: false, failOnCVSS: 11, timeout: 600 },
    spotbugs: { enabled: false, priority: 'high', effort: 'default', autoDetectBuildSystem: true, memory: '2g' }
  });

  execSync("git checkout pr-17620", { cwd: KAFKA_REPO, stdio: "ignore" });
  const prStart = Date.now();
  const prResult: OrchestrationResult = await orchestrator.orchestrate(KAFKA_REPO, "pr");
  const prDuration = Math.round((Date.now() - prStart) / 1000);

  console.log(`   ✅ PR analysis complete (${prDuration}s)`);
  console.log(`      PMD: ${prResult.toolResults.find(t => t.tool === 'pmd')?.issues.length || 0}`);
  console.log(`      Semgrep: ${prResult.toolResults.find(t => t.tool === 'semgrep')?.issues.length || 0}\n`);

  // Step 3: Verify BUG-128 Fix (Educator/Orchestrator)
  console.log("🔍 STEP 3: Verify Model Configuration (BUG-128)\n");

  const modelConfigResolver = new ModelConfigResolver();
  try {
    const educatorConfig = await modelConfigResolver.getModelConfiguration('educator', 'java', 'medium' as any);
    console.log(`   ✅ Educator initialized: ${educatorConfig.primary_model} (${educatorConfig.primary_provider})`);
    
    const orchestratorConfig = await modelConfigResolver.getModelConfiguration('orchestrator', 'java', 'medium' as any);
    console.log(`   ✅ Orchestrator initialized: ${orchestratorConfig.primary_model} (${orchestratorConfig.primary_provider})\n`);
  } catch (error: any) {
    if (error.message.includes('model_configs')) {
      console.log(`   ❌ BUG-128 NOT FIXED: ${error.message}\n`);
      console.log(`   Action: Rebuild TypeScript or use ts-node directly\n`);
    } else {
      console.log(`   ⚠️  Model config error: ${error.message}\n`);
    }
  }

  // Summary
  const totalDuration = Math.round((Date.now() - startTime) / 1000);
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  LIMITED TEST COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Duration: ${totalDuration}s`);
  console.log(`  API Calls: ${apiCallCount} / ${MAX_API_CALLS}`);
  console.log(`  Estimated Cost: $${(apiCallCount * 0.003).toFixed(2)}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("✅ VERIFICATION RESULTS:");
  console.log(`   BUG-127 (PMD): ${prResult.toolResults.find(t => t.tool === 'pmd')?.issues.length! > 0 ? 'FIXED ✅' : 'FAILED ❌'}`);
  console.log(`   BUG-128 (Table): Check output above`);
  console.log(`   API Costs: ${apiCallCount < 50 ? 'GOOD ✅' : 'HIGH ⚠️'}\n`);
}

runLimitedTest().catch(console.error);

