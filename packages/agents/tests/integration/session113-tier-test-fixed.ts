#!/usr/bin/env ts-node
/**
 * Session 113 Tier Test - Spring Petclinic with BASIC vs PRO
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.join(__dirname, "../../.env") });

import { V9AnalysisService } from "../../src/two-branch/api/v9-analysis-service";

const TEST_REPO = "https://github.com/spring-projects/spring-petclinic.git";
const TEST_PR = 950;
const OUTPUT_DIR = path.join(__dirname, "test-outputs");

async function runTest(tier: 'basic' | 'pro'): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Running ${tier.toUpperCase()} tier analysis...`);
  console.log('='.repeat(80) + '\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const service = new V9AnalysisService();
  const startTime = Date.now();

  try {
    const result = await service.analyzePR({
      repositoryUrl: TEST_REPO,
      prNumber: TEST_PR,
      analysisMode: "complete",
      includeEducation: true,
      maxAIAnalysis: 30,
      userTier: tier
    });

    const duration = (Date.now() - startTime) / 1000;

    console.log("\nDecision:", result.decision);
    console.log("Total Issues:", result.issues.total);
    console.log("Duration:", duration.toFixed(1) + "s");

    // Use the correct property - result.report?.markdown is the path
    if (result.report?.markdown && fs.existsSync(result.report.markdown)) {
      const reportContent = fs.readFileSync(result.report.markdown, "utf-8");
      const outputPath = path.join(OUTPUT_DIR, `session113-petclinic-${tier.toUpperCase()}.md`);
      fs.writeFileSync(outputPath, reportContent);
      console.log(`\n✅ ${tier.toUpperCase()} report saved to: ${outputPath}`);
      console.log(`   Size: ${(reportContent.length / 1024).toFixed(1)} KB`);
    }

  } catch (error) {
    console.error(`\n❌ ${tier.toUpperCase()} test failed:`, error);
    throw error;
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║  Session 113 Tier Test - Spring Petclinic PR #950              ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  const tierArg = process.argv[2]?.toLowerCase() as 'basic' | 'pro' | undefined;
  
  if (tierArg && (tierArg === 'basic' || tierArg === 'pro')) {
    await runTest(tierArg);
  } else {
    // Run both tiers
    await runTest('basic');
    await runTest('pro');
  }

  console.log("\n🎉 All tests completed!");
}

main().catch(console.error);
