/**
 * V9 E2E Test with Timeout Protection
 * Same as test-v9-e2e-complete.ts but adds timeout to report generation
 */

import * as dotenv from 'dotenv';
import * as pathModule from "path";
import * as path from "path";

// Load environment variables from local .env
dotenv.config({ path: pathModule.join(__dirname, '.env') });

// Add timeout utility
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${operation} exceeded ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// Import original test
const originalTest = require('./test-v9-e2e-complete');

// Run with main execution wrapped to add timeout at Step 7
async function main() {
  console.log("🔧 Running V9 E2E Test with Timeout Protection\n");
  console.log("⏱️  Report generation timeout: 60 seconds\n");
  
  try {
    // The original test doesn't export a main function, so we need a different approach
    // Let's just re-import and patch the formatter
    console.log("❌ ERROR: This approach won't work. Need to modify the original test file.\n");
    console.log("🔧 SOLUTION: Kill the current test process and use fallback mode instead.\n");
    process.exit(1);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main();



