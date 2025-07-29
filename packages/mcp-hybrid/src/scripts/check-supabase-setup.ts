#!/usr/bin/env tsx
/**
 * Check Supabase Setup
 * Verifies if the required tables exist
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function checkSetup() {
  console.log('🔍 Checking Supabase setup...\n');
  
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
  
  // Test the vector_storage table
  console.log('Testing vector_storage table...');
  
  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('vector_storage')
      .select('key')
      .limit(1);
    
    if (error) {
      console.error('❌ Table does not exist or is not accessible:', error.message);
      console.log('\n📋 Please create the table by running this SQL in your Supabase SQL editor:\n');
      console.log('-- First, enable the vector extension');
      console.log('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('');
      console.log('-- Create the vector_storage table');
      console.log(`CREATE TABLE IF NOT EXISTS vector_storage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`);
      console.log('');
      console.log('-- Create indexes');
      console.log('CREATE INDEX idx_vector_storage_key ON vector_storage(key);');
      console.log('');
      console.log('-- You can find the full schema at:');
      console.log('packages/mcp-hybrid/src/db/supabase-schema.sql');
    } else {
      console.log('✅ Table exists and is accessible!');
      console.log(`   Found ${data?.length || 0} records`);
    }
  } catch (err) {
    console.error('❌ Error checking table:', err);
  }
}

checkSetup()
  .then(() => {
    console.log('\n✨ Check complete!');
  })
  .catch(err => {
    console.error('❌ Check failed:', err);
    process.exit(1);
  });