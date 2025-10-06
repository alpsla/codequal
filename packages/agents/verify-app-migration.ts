#!/usr/bin/env ts-node
/**
 * Verify APP Scoring Migration Status
 *
 * Checks if APP category columns exist in pr_analysis_history
 * Provides clear instructions for next steps
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

async function verifyMigration(): Promise<void> {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  APP Scoring Migration - Status Check                    ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("❌ ERROR: Supabase credentials not found!");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log("✅ Supabase connection established\n");
  console.log("🔍 Checking for APP category columns...\n");

  // Try to insert a test record with APP scores
  const testRecord = {
    repo_name: 'test/migration-check',
    pr_number: 99999,
    decision: 'APPROVED' as const,
    quality_score: 85,
    app_overall_score: 90,
    app_security_score: 95,
    app_performance_score: 92,
    app_architecture_score: 90,
    app_dependency_score: 88,
    app_code_quality_score: 93,
    new_issues_count: 0,
    existing_issues_count: 0,
    resolved_issues_count: 0,
    blocking_issues_count: 0
  };

  const { data, error } = await supabase
    .from('pr_analysis_history')
    .upsert(testRecord, { onConflict: 'repo_name,pr_number' })
    .select();

  if (error) {
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log("❌ MIGRATION REQUIRED\n");
      console.log("   APP category columns do NOT exist yet in pr_analysis_history\n");
      console.log("📋 NEXT STEPS:\n");
      console.log("   1. Open Supabase SQL Editor:");
      console.log(`      ${process.env.SUPABASE_URL}/project/_/sql\n`);
      console.log("   2. Copy and paste the SQL from:");
      console.log("      /tmp/RUN_THIS_IN_SUPABASE.sql\n");
      console.log("   3. Click 'Run' to execute the migration\n");
      console.log("   4. Re-run this script to verify\n");

      // Show the SQL content
      const sqlPath = '/tmp/RUN_THIS_IN_SUPABASE.sql';
      if (fs.existsSync(sqlPath)) {
        console.log("📄 MIGRATION SQL:\n");
        const sql = fs.readFileSync(sqlPath, 'utf-8');
        console.log(sql);
      }
    } else {
      console.log("⚠️  Unexpected error:", error.message);
      console.log("   This might not be a migration issue.\n");
    }
    process.exit(1);
  }

  // Success - clean up test record
  await supabase
    .from('pr_analysis_history')
    .delete()
    .eq('repo_name', 'test/migration-check')
    .eq('pr_number', 99999);

  console.log("✅ MIGRATION COMPLETE!\n");
  console.log("   All 6 APP category columns exist and are working:\n");
  console.log("   ✅ app_overall_score");
  console.log("   ✅ app_security_score");
  console.log("   ✅ app_performance_score");
  console.log("   ✅ app_architecture_score");
  console.log("   ✅ app_dependency_score");
  console.log("   ✅ app_code_quality_score\n");

  console.log("🎉 Ready to test dual scoring!\n");
  console.log("📋 NEXT STEPS:\n");
  console.log("   1. Run dual scoring test:");
  console.log("      npx ts-node test-app-vs-dev-scoring.ts\n");
  console.log("   2. Verify both APP and DEV scores save correctly\n");
  console.log("   3. Integrate into V9 report formatter (Phase 3)\n");

  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  Verification Complete                                    ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");
}

if (require.main === module) {
  verifyMigration()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("❌ Verification failed:", error);
      process.exit(1);
    });
}

export { verifyMigration };
