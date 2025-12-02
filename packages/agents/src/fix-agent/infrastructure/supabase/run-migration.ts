/**
 * Run Supabase Migration
 *
 * Executes the tool database schema and seed data migrations.
 * Run with: npx ts-node run-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function runMigration() {
  console.log('🚀 Starting Supabase Migration for Tool Database');
  console.log('================================================');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log('');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });

  // Read SQL files
  const schemaPath = path.join(__dirname, 'tool-database-schema.sql');
  const seedPath = path.join(__dirname, 'seed-data.sql');

  console.log('📄 Reading SQL files...');

  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found:', schemaPath);
    process.exit(1);
  }

  if (!fs.existsSync(seedPath)) {
    console.error('❌ Seed data file not found:', seedPath);
    process.exit(1);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  const seedSql = fs.readFileSync(seedPath, 'utf-8');

  console.log(`   Schema: ${schemaSql.length} bytes`);
  console.log(`   Seed: ${seedSql.length} bytes`);
  console.log('');

  // Execute schema migration
  console.log('📊 Step 1: Running Schema Migration...');
  try {
    const { error: schemaError } = await supabase.rpc('exec_sql', { sql: schemaSql });
    if (schemaError) {
      // Try alternative approach - direct postgres connection
      console.log('   ⚠️ RPC exec_sql not available, trying alternative...');
      throw schemaError;
    }
    console.log('   ✅ Schema migration completed');
  } catch (error) {
    console.log('   ℹ️ Note: Schema may need to be run directly in Supabase SQL Editor');
    console.log('   Error:', (error as Error).message);
    console.log('');
    console.log('📋 Instructions for manual migration:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/ftjhmbbcuqjqmmbaymqb/sql/new');
    console.log('   2. Copy contents of: tool-database-schema.sql');
    console.log('   3. Run the SQL');
    console.log('   4. Then run: seed-data.sql');
    console.log('');

    // Try to at least verify connection
    console.log('🔍 Verifying Supabase connection...');
    const { data, error: testError } = await supabase.from('tools').select('count').limit(1);

    if (testError) {
      if (testError.message.includes('does not exist')) {
        console.log('   ⚠️ Table "tools" does not exist yet - migration needed');
        console.log('');
        console.log('📝 SQL files ready for migration:');
        console.log(`   Schema: ${schemaPath}`);
        console.log(`   Seed: ${seedPath}`);
      } else {
        console.log('   ❌ Connection error:', testError.message);
      }
    } else {
      console.log('   ✅ Connection successful! Table "tools" exists.');
      console.log('   Data count:', data);
    }

    return;
  }

  // Execute seed data
  console.log('🌱 Step 2: Running Seed Data Migration...');
  try {
    const { error: seedError } = await supabase.rpc('exec_sql', { sql: seedSql });
    if (seedError) throw seedError;
    console.log('   ✅ Seed data migration completed');
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
    return;
  }

  // Verify migration
  console.log('');
  console.log('🔍 Step 3: Verifying Migration...');

  const { data: toolsCount, error: countError } = await supabase
    .from('tools')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.log('   ❌ Verification error:', countError.message);
  } else {
    console.log('   ✅ Tools table accessible');
  }

  // Get statistics
  const { data: stats } = await supabase
    .rpc('get_tool_statistics');

  if (stats) {
    console.log('');
    console.log('📊 Migration Statistics:');
    console.log(`   Total tools: ${stats.total_tools}`);
    console.log(`   Analyzers: ${stats.analyzers}`);
    console.log(`   Fixers: ${stats.fixers}`);
    console.log(`   Hybrid: ${stats.hybrid_tools}`);
    console.log(`   With native fix: ${stats.tools_with_native_fix}`);
    console.log(`   Languages covered: ${stats.languages_covered}`);
    console.log(`   Categories covered: ${stats.categories_covered}`);
  }

  console.log('');
  console.log('✅ Migration Complete!');
}

runMigration().catch(console.error);
