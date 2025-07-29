#!/usr/bin/env tsx
/**
 * Setup Supabase Tables
 * Creates the necessary tables for vector storage
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function setupTables() {
  console.log('🚀 Setting up Supabase tables...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Read the SQL schema
  const schemaPath = path.join(__dirname, '../db/supabase-schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf-8');
  
  // Split into individual statements
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Found ${statements.length} SQL statements to execute\n`);
  
  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      });
      
      if (error) {
        // Try direct execution via REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ sql: statement })
        });
        
        if (!response.ok) {
          console.warn(`⚠️  Statement ${i + 1} might need manual execution:`, error);
          console.log('Statement:', statement.substring(0, 100) + '...\n');
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully\n`);
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully\n`);
      }
    } catch (err) {
      console.warn(`⚠️  Statement ${i + 1} might need manual execution:`, err);
      console.log('Statement:', statement.substring(0, 100) + '...\n');
    }
  }
  
  // Test the vector_storage table
  console.log('🧪 Testing vector_storage table...');
  
  try {
    // Try to insert a test record
    const { error: insertError } = await supabase
      .from('vector_storage')
      .insert({
        key: 'test-key',
        data: { test: true },
        embedding: Array(1536).fill(0)
      });
    
    if (insertError) {
      console.error('❌ Failed to insert test record:', insertError);
      console.log('\n📋 Please run the following SQL in your Supabase SQL editor:');
      console.log('```sql');
      console.log(schema);
      console.log('```\n');
    } else {
      // Clean up test record
      await supabase
        .from('vector_storage')
        .delete()
        .eq('key', 'test-key');
      
      console.log('✅ Table created and tested successfully!\n');
    }
  } catch (err) {
    console.error('❌ Error testing table:', err);
  }
}

setupTables()
  .then(() => {
    console.log('✨ Setup complete!');
  })
  .catch(err => {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  });