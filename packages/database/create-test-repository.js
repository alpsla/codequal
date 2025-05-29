#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function createTestRepository() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const testRepoId = '550e8400-e29b-41d4-a716-446655440000';

  console.log('🔍 Checking if test repository exists...');

  // Check if repository already exists
  const { data: existingRepos, error: checkError } = await supabase
    .from('repositories')
    .select('id, name')
    .eq('id', testRepoId);

  if (checkError) {
    console.error('Error checking repository:', checkError);
    return;
  }

  if (existingRepos && existingRepos.length > 0) {
    console.log(`✅ Test repository already exists: ${existingRepos[0].name}`);
    return;
  }

  console.log('📝 Creating test repository...');

  // Create test repository
  const { data, error } = await supabase
    .from('repositories')
    .insert({
      id: testRepoId,
      github_id: 123456789,
      owner: 'test-user',
      name: 'express-test-repo',
      description: 'Test repository for vector database pipeline testing',
      is_private: false,
      default_branch: 'main',
      url: 'https://github.com/test-user/express-test-repo',
      platform: 'github',
      language: 'javascript',
      primary_language: 'javascript',
      metadata: {
        test: true,
        purpose: 'vector-database-testing'
      },
      topics: ['test', 'express', 'javascript']
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to create test repository:', error);
  } else {
    console.log(`✅ Created test repository: ${data.name} (${data.id})`);
  }
}

createTestRepository();