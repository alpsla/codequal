#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function deployRAG() {
  console.log(`${colors.blue}🚀 RAG Production Deployment${colors.reset}`);
  console.log('==========================================\n');

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(`${colors.red}❌ Missing required environment variables${colors.reset}`);
    console.error('Please ensure .env file contains:');
    console.error('  SUPABASE_URL=...');
    console.error('  SUPABASE_SERVICE_ROLE_KEY=...');
    console.error('  OPENAI_API_KEY=...');
    process.exit(1);
  }

  console.log(`${colors.green}✅ Environment variables loaded${colors.reset}`);
  console.log(`  - Supabase URL: ${supabaseUrl.substring(0, 30)}...`);
  console.log(`  - OpenAI API Key: ${openaiKey ? 'present' : 'missing'}\n`);

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check if RAG tables already exist
  console.log(`${colors.blue}Checking existing RAG components...${colors.reset}`);
  
  const { data: existingContent, error: checkError } = await supabase
    .from('rag_educational_content')
    .select('count')
    .limit(1);

  if (!checkError) {
    console.log(`${colors.yellow}⚠️  RAG tables already exist${colors.reset}`);
    console.log('RAG framework appears to be already deployed.\n');
    
    const { count } = await supabase
      .from('rag_educational_content')
      .select('*', { count: 'exact', head: true });
      
    console.log(`Educational content entries: ${count || 0}`);
    return;
  }

  // Read migration file
  console.log(`\n${colors.blue}Deploying RAG schema...${colors.reset}`);
  
  const migrationPath = path.join(__dirname, '..', 'packages', 'database', 'migrations', '20250530_rag_schema_integration.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`${colors.red}❌ Migration file not found: ${migrationPath}${colors.reset}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  // Split migration into statements (simple split by semicolon)
  const statements = migrationSQL
    .split(/;(?=\s*\n)/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute`);

  // Execute statements one by one
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    
    // Skip if it's just comments
    if (statement.trim().startsWith('--')) continue;
    
    // Get first line for logging
    const firstLine = statement.split('\n')[0].substring(0, 50);
    process.stdout.write(`  [${i + 1}/${statements.length}] ${firstLine}... `);

    try {
      // For Supabase, we need to use the SQL Editor API endpoint
      // Since Supabase JS client doesn't support raw SQL execution
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: statement })
      });

      if (response.ok) {
        console.log(`${colors.green}✓${colors.reset}`);
        successCount++;
      } else {
        // Try alternate approach - direct execution
        console.log(`${colors.yellow}⚠️${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗${colors.reset}`);
      errorCount++;
    }
  }

  console.log(`\n${colors.blue}Deployment Summary:${colors.reset}`);
  console.log(`  - Successful: ${successCount}`);
  console.log(`  - Warnings/Errors: ${errorCount}`);

  // Verify deployment
  console.log(`\n${colors.blue}Verifying deployment...${colors.reset}`);

  // Check tables
  const { data: tables } = await supabase.rpc('get_tables', {
    schema_name: 'public',
    table_pattern: 'rag_%'
  }).select();

  // Check educational content
  const { data: content, error: contentError } = await supabase
    .from('rag_educational_content')
    .select('*');

  if (!contentError && content) {
    console.log(`${colors.green}✅ Educational content table accessible (${content.length} entries)${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  Could not verify educational content${colors.reset}`);
  }

  // Manual deployment instructions
  console.log(`\n${colors.yellow}📝 Manual Deployment Required${colors.reset}`);
  console.log('====================================');
  console.log('Supabase JS client does not support direct SQL execution.');
  console.log('Please complete deployment manually:\n');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste the migration file:');
  console.log(`   ${migrationPath}`);
  console.log('4. Execute the migration\n');
  console.log('5. Verify tables created:');
  console.log('   - rag_educational_content');
  console.log('   - rag_query_patterns');
  console.log('   - Views and functions\n');

  console.log(`${colors.blue}After manual deployment, run:${colors.reset}`);
  console.log('  npm test -- --testPathPattern="rag"');
  console.log('  npx ts-node scripts/test-rag-integration.ts');
}

// Run deployment
deployRAG().catch(error => {
  console.error(`${colors.red}❌ Deployment failed:${colors.reset}`, error);
  process.exit(1);
});