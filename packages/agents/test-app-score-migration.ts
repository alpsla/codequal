#!/usr/bin/env ts-node
/**
 * APP Score Migration Runner
 *
 * Adds APP category score columns to pr_analysis_history table
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import { createClient } from '@supabase/supabase-js';

async function runMigration(): Promise<void> {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  APP Score Migration - Add Category Columns              ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("❌ ERROR: Supabase credentials not found!");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Check if columns already exist
  console.log("🔍 Checking if APP category columns exist...\n");

  const { data: existingColumns, error: checkError } = await supabase
    .from('pr_analysis_history')
    .select('*')
    .limit(1);

  if (checkError && !checkError.message.includes('does not exist')) {
    console.log("⚠️  Table check:", checkError.message);
  }

  // Add columns via raw SQL
  console.log("📝 Adding APP category score columns...\n");

  const alterTableSQL = `
    ALTER TABLE pr_analysis_history
      ADD COLUMN IF NOT EXISTS app_overall_score INTEGER CHECK (app_overall_score >= 0 AND app_overall_score <= 100),
      ADD COLUMN IF NOT EXISTS app_security_score INTEGER CHECK (app_security_score >= 0 AND app_security_score <= 100),
      ADD COLUMN IF NOT EXISTS app_performance_score INTEGER CHECK (app_performance_score >= 0 AND app_performance_score <= 100),
      ADD COLUMN IF NOT EXISTS app_architecture_score INTEGER CHECK (app_architecture_score >= 0 AND app_architecture_score <= 100),
      ADD COLUMN IF NOT EXISTS app_dependency_score INTEGER CHECK (app_dependency_score >= 0 AND app_dependency_score <= 100),
      ADD COLUMN IF NOT EXISTS app_code_quality_score INTEGER CHECK (app_code_quality_score >= 0 AND app_code_quality_score <= 100);
  `;

  try {
    // Note: Supabase client doesn't support raw SQL directly
    // This needs to be run via Supabase SQL editor or psql
    console.log("⚠️  Migration SQL prepared but needs to be run manually:");
    console.log("\nRun this in Supabase SQL Editor or psql:\n");
    console.log(alterTableSQL);
    console.log("\nOR use this command:");
    console.log(`psql "${process.env.SUPABASE_DATABASE_URL}" -c "${alterTableSQL.replace(/\n/g, ' ')}"`);

    // Try to verify by inserting a test record
    console.log("\n🧪 Testing APP score insert...\n");

    const testRecord = {
      repo_name: 'test/app-score-migration',
      pr_number: 99999,
      decision: 'APPROVED' as const,
      quality_score: 85,
      app_overall_score: 90,
      app_security_score: 95,
      app_performance_score: 92,
      app_architecture_score: 90,
      app_dependency_score: 88,
      app_code_quality_score: 93,
      new_issues_count: 2,
      existing_issues_count: 5,
      resolved_issues_count: 3,
      blocking_issues_count: 0
    };

    const { data: inserted, error: insertError } = await supabase
      .from('pr_analysis_history')
      .upsert(testRecord, { onConflict: 'repo_name,pr_number' })
      .select();

    if (insertError) {
      if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
        console.log("❌ Migration needed! Columns don't exist yet.");
        console.log("\nPlease run the migration SQL above in Supabase SQL Editor.\n");
      } else {
        console.log("⚠️  Insert error:", insertError.message);
      }
    } else {
      console.log("✅ Migration successful! APP score columns working.");
      console.log("   Test record inserted:", inserted);

      // Clean up test record
      const { error: deleteError } = await supabase
        .from('pr_analysis_history')
        .delete()
        .eq('repo_name', 'test/app-score-migration')
        .eq('pr_number', 99999);

      if (!deleteError) {
        console.log("   Test record cleaned up.\n");
      }
    }

  } catch (error) {
    console.error("❌ Migration error:", error);
  }

  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  Migration Check Complete                                ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    });
}

export { runMigration };
