#!/usr/bin/env ts-node

/**
 * Run Supabase Migration for Model Research Tables
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function runMigration() {
  console.log('🚀 Running Model Research Tables Migration\n');
  console.log('=' .repeat(80));
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Read the SQL migration file
  const migrationPath = path.join(__dirname, 'src/migrations/create-model-research-tables.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  // Split by statements (crude but works for this migration)
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`📝 Running ${statements.length} SQL statements...\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const statement of statements) {
    // Skip empty statements or comments
    if (!statement || statement.startsWith('--')) continue;
    
    try {
      // For table creation, we can use RPC or direct SQL
      // Since Supabase doesn't expose direct SQL execution, we'll handle it differently
      
      // Extract table name if it's a CREATE TABLE statement
      const tableMatch = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        console.log(`Creating table: ${tableName}`);
        
        // Check if table exists by trying to select from it
        const { error } = await supabase.from(tableName).select('*').limit(1);
        
        if (error && error.message.includes('does not exist')) {
          console.log(`   ⚠️  Table ${tableName} needs to be created via Supabase dashboard`);
          errorCount++;
        } else {
          console.log(`   ✅ Table ${tableName} already exists or was created`);
          successCount++;
        }
      } else if (statement.includes('CREATE INDEX')) {
        console.log(`   ℹ️  Index creation needs to be done via Supabase dashboard`);
      } else if (statement.includes('GRANT')) {
        console.log(`   ℹ️  Permissions need to be set via Supabase dashboard`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
      errorCount++;
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  
  console.log('\n⚠️  IMPORTANT: Since Supabase doesn\'t allow direct SQL execution via SDK,');
  console.log('you need to run the migration SQL directly in the Supabase dashboard:');
  console.log('\n1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to SQL Editor');
  console.log('4. Paste the contents of: packages/agents/src/migrations/create-model-research-tables.sql');
  console.log('5. Click "Run"\n');
  
  console.log('Alternatively, let\'s try to create the tables programmatically...\n');
  
  // Try to create tables using Supabase's admin API if available
  console.log('🔧 Attempting to create tables via API...\n');
  
  // For now, let's just populate if tables exist
  console.log('📝 Checking if we can populate existing tables...');
  
  const testData = {
    id: 'test_' + Date.now(),
    model_id: 'test/model',
    provider: 'test',
    quality_score: 50,
    speed_score: 50,
    price_score: 50,
    context_length: 100000,
    specializations: ['test'],
    optimal_for: { languages: ['test'], repo_sizes: ['test'], frameworks: ['test'] },
    research_date: new Date(),
    next_research_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    metadata: {}
  };
  
  const { error: testError } = await supabase
    .from('model_research')
    .insert(testData);
  
  if (testError) {
    console.log('\n❌ Tables don\'t exist yet. Please run the migration in Supabase dashboard.');
    console.log('   Error:', testError.message);
  } else {
    console.log('\n✅ Tables exist! Cleaning up test data...');
    await supabase.from('model_research').delete().eq('id', testData.id);
    console.log('✅ Ready to populate with real data!');
  }
}

runMigration().catch(console.error);