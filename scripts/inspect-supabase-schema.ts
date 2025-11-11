#!/usr/bin/env ts-node
/**
 * Supabase Schema Inspector
 *
 * Inspects the actual Supabase database schema to determine:
 * - Which tables exist
 * - What columns each table has
 * - Current indexes
 * - RLS status
 *
 * Use this to generate a safe, schema-specific migration
 *
 * Run: npx ts-node scripts/inspect-supabase-schema.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TableInfo {
  tableName: string;
  columns: string[];
  hasRLS: boolean;
  existingIndexes: string[];
  rowCount?: number;
}

const targetTables = [
  'model_configurations',
  'pr_analysis_history',
  'developer_metrics',
  'skill_scores',
  'user_skills',
  'analysis_history',
  'deepwiki_cleanups',
  'repositories',
  'pr_reviews',
  'analysis_chunks',
  'repository_scores',
  'issue_tracking'
];

async function inspectSchema(): Promise<Map<string, TableInfo>> {
  console.log('🔍 Inspecting Supabase Schema...\n');

  const schemaMap = new Map<string, TableInfo>();

  for (const tableName of targetTables) {
    try {
      console.log(`Checking table: ${tableName}...`);

      // Check if table exists by trying to query it
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`  ⏭️  Table not found: ${tableName}`);
        continue;
      }

      // Get column information
      const { data: sampleRow } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      const columns = sampleRow && sampleRow.length > 0
        ? Object.keys(sampleRow[0])
        : [];

      // Try to get existing indexes (may not work due to RLS)
      let existingIndexes: string[] = [];
      try {
        const { data: indexData } = await supabase
          .from('pg_indexes')
          .select('indexname')
          .eq('schemaname', 'public')
          .eq('tablename', tableName);

        existingIndexes = indexData?.map(i => i.indexname) || [];
      } catch {
        // Can't query pg_indexes, skip
      }

      schemaMap.set(tableName, {
        tableName,
        columns,
        hasRLS: !!error && error.code === 'PGRST301', // RLS error
        existingIndexes,
        rowCount: count || 0
      });

      console.log(`  ✅ Found: ${columns.length} columns, ${count || 0} rows`);
      console.log(`     Columns: ${columns.slice(0, 5).join(', ')}${columns.length > 5 ? '...' : ''}`);

    } catch (error) {
      console.log(`  ⏭️  Error checking ${tableName}:`, error);
    }
  }

  return schemaMap;
}

function generateSafeMigration(schemaMap: Map<string, TableInfo>): string {
  let migration = `-- ============================================================================
-- AUTO-GENERATED SAFE MIGRATION
-- Generated: ${new Date().toISOString()}
-- Based on actual database schema inspection
-- ============================================================================

`;

  // Priority mappings for different tables
  const indexConfigs: Record<string, { columns: string[], composites?: string[][] }> = {
    model_configurations: {
      columns: ['role', 'language', 'size_category'],
      composites: [
        ['role', 'language', 'size_category'],
        ['role', 'language']
      ]
    },
    pr_analysis_history: {
      columns: ['repository_id', 'created_at', 'status']
    },
    repositories: {
      columns: ['owner', 'name', 'created_at', 'is_public']
    },
    pr_reviews: {
      columns: ['repository_id', 'pr_number', 'status', 'created_at']
    },
    user_skills: {
      columns: ['user_id', 'skill_category', 'current_level']
    },
    analysis_chunks: {
      columns: ['repository_id', 'created_at']
    }
  };

  for (const [tableName, info] of schemaMap.entries()) {
    migration += `\n-- ============================================================================\n`;
    migration += `-- TABLE: ${tableName}\n`;
    migration += `-- Columns: ${info.columns.join(', ')}\n`;
    migration += `-- Rows: ${info.rowCount}\n`;
    migration += `-- ============================================================================\n\n`;

    const config = indexConfigs[tableName];
    if (!config) {
      migration += `-- No index configuration defined for ${tableName}\n`;
      continue;
    }

    migration += `DO $$\nBEGIN\n`;
    migration += `  RAISE NOTICE 'Processing ${tableName}...';\n\n`;

    // Single column indexes
    for (const column of config.columns) {
      if (info.columns.includes(column)) {
        const indexName = `idx_${tableName}_${column}`;
        const orderBy = column === 'created_at' ? ' DESC' : '';
        migration += `  CREATE INDEX IF NOT EXISTS ${indexName}\n`;
        migration += `  ON ${tableName}(${column}${orderBy});\n\n`;
      }
    }

    // Composite indexes
    if (config.composites) {
      for (const composite of config.composites) {
        if (composite.every(col => info.columns.includes(col))) {
          const indexName = `idx_${tableName}_${composite.join('_')}`;
          migration += `  CREATE INDEX IF NOT EXISTS ${indexName}\n`;
          migration += `  ON ${tableName}(${composite.join(', ')});\n\n`;
        }
      }
    }

    // RLS
    migration += `  -- Enable RLS\n`;
    migration += `  ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;\n\n`;

    // Service role policy
    migration += `  -- Drop existing policies\n`;
    migration += `  DROP POLICY IF EXISTS "Service role full access ${tableName}" ON ${tableName};\n\n`;
    migration += `  -- Create service role policy\n`;
    migration += `  CREATE POLICY "Service role full access ${tableName}"\n`;
    migration += `  ON ${tableName}\n`;
    migration += `  FOR ALL\n`;
    migration += `  TO service_role\n`;
    migration += `  USING (true)\n`;
    migration += `  WITH CHECK (true);\n\n`;

    // ANALYZE
    migration += `  ANALYZE ${tableName};\n`;
    migration += `  RAISE NOTICE '${tableName}: Indexes and RLS configured';\n`;

    migration += `EXCEPTION\n`;
    migration += `  WHEN OTHERS THEN\n`;
    migration += `    RAISE WARNING '${tableName}: Error - %', SQLERRM;\n`;
    migration += `END $$;\n\n`;
  }

  // Materialized view
  migration += `\n-- ============================================================================\n`;
  migration += `-- MATERIALIZED VIEW: Timezone Names\n`;
  migration += `-- Reduces 131 queries to 1 per dashboard load\n`;
  migration += `-- ============================================================================\n\n`;
  migration += `CREATE MATERIALIZED VIEW IF NOT EXISTS mv_timezone_names AS\n`;
  migration += `SELECT name FROM pg_timezone_names;\n\n`;
  migration += `CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_timezone_names_name\n`;
  migration += `ON mv_timezone_names(name);\n\n`;
  migration += `REFRESH MATERIALIZED VIEW mv_timezone_names;\n\n`;
  migration += `GRANT SELECT ON mv_timezone_names TO authenticated;\n`;
  migration += `GRANT SELECT ON mv_timezone_names TO service_role;\n\n`;

  // Summary
  migration += `-- ============================================================================\n`;
  migration += `-- SUMMARY\n`;
  migration += `-- ============================================================================\n\n`;
  migration += `DO $$\nBEGIN\n`;
  migration += `  RAISE NOTICE '=========================================';\n`;
  migration += `  RAISE NOTICE 'MIGRATION COMPLETED';\n`;
  migration += `  RAISE NOTICE 'Tables processed: ${schemaMap.size}';\n`;
  migration += `  RAISE NOTICE '=========================================';\n`;
  migration += `END $$;\n`;

  return migration;
}

function generateSchemaReport(schemaMap: Map<string, TableInfo>): string {
  let report = `# Supabase Schema Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `## Tables Found\n\n`;

  for (const [tableName, info] of schemaMap.entries()) {
    report += `### ${tableName}\n\n`;
    report += `- **Rows:** ${info.rowCount}\n`;
    report += `- **Columns:** ${info.columns.length}\n`;
    report += `- **RLS Enabled:** ${info.hasRLS ? 'Yes' : 'Unknown'}\n`;
    report += `- **Existing Indexes:** ${info.existingIndexes.length}\n\n`;

    report += `**Columns:**\n`;
    for (const col of info.columns) {
      report += `- \`${col}\`\n`;
    }
    report += `\n`;
  }

  report += `## Missing Tables\n\n`;
  const foundTables = Array.from(schemaMap.keys());
  const missingTables = targetTables.filter(t => !foundTables.includes(t));

  if (missingTables.length === 0) {
    report += `All target tables found! ✅\n\n`;
  } else {
    for (const table of missingTables) {
      report += `- ⏭️ \`${table}\`\n`;
    }
    report += `\n`;
  }

  return report;
}

async function main() {
  console.log('🔍 Supabase Schema Inspector');
  console.log('========================================');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  try {
    const schemaMap = await inspectSchema();

    console.log('\n========================================');
    console.log(`📊 Found ${schemaMap.size} tables`);
    console.log('========================================\n');

    // Generate migration
    const migration = generateSafeMigration(schemaMap);
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/20251111_fix_supabase_alerts_AUTO.sql');
    fs.writeFileSync(migrationPath, migration);
    console.log(`✅ Generated migration: ${migrationPath}\n`);

    // Generate report
    const report = generateSchemaReport(schemaMap);
    const reportPath = path.resolve(__dirname, '../SUPABASE_SCHEMA_REPORT.md');
    fs.writeFileSync(reportPath, report);
    console.log(`✅ Generated report: ${reportPath}\n`);

    console.log('========================================');
    console.log('✅ Schema inspection complete!');
    console.log('========================================');
    console.log('\nNext steps:');
    console.log('1. Review: SUPABASE_SCHEMA_REPORT.md');
    console.log('2. Deploy: supabase/migrations/20251111_fix_supabase_alerts_AUTO.sql');
    console.log('3. Verify: npx ts-node scripts/verify-supabase-fixes.ts');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Fatal error during inspection:', error);
    process.exit(1);
  }
}

// Run inspection
main().catch(console.error);
