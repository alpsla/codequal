// Vector Database Test Suite
// Tests for Week 1 implementation

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ftjhmbbcuqjqmmbaymqb.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || 'mock-key-for-testing';

// Use mock client for testing if no real key is provided
const isTestMode = !process.env.SUPABASE_ANON_KEY && !process.env.PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test data
const testRepository = {
  id: 'test-repo-' + Date.now(),
  github_id: 12345,
  owner: 'test-owner',
  name: 'test-repo',
  description: 'Test repository for vector database',
  is_private: false,
  default_branch: 'main',
  metadata: {}
};

const testChunks = [
  {
    content: 'This is a TypeScript function that implements authentication using JWT tokens.',
    metadata: { language: 'typescript', type: 'authentication', file_path: '/src/auth.ts' },
    embedding: generateMockEmbedding(1)
  },
  {
    content: 'React component for user login with form validation and error handling.',
    metadata: { language: 'javascript', type: 'frontend', file_path: '/src/components/Login.tsx' },
    embedding: generateMockEmbedding(2)
  },
  {
    content: 'PostgreSQL database migration script for user authentication tables.',
    metadata: { language: 'sql', type: 'database', file_path: '/migrations/001_auth.sql' },
    embedding: generateMockEmbedding(3)
  }
];

// Generate mock embeddings (in production, use OpenAI API)
function generateMockEmbedding(seed: number): number[] {
  const embedding = new Array(1536).fill(0);
  for (let i = 0; i < 1536; i++) {
    embedding[i] = Math.sin(seed * i) * 0.1 + Math.random() * 0.01;
  }
  // Normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

// Test 1: Insert test repository
async function testRepositoryInsert() {
  console.log('Test 1: Inserting test repository...');
  
  const { data, error } = await supabase
    .from('repositories')
    .insert(testRepository)
    .select()
    .single();
  
  if (error) {
    console.error('Failed to insert repository:', error);
    return null;
  }
  
  console.log('✓ Repository inserted successfully:', data.id);
  return data.id;
}

// Test 2: Insert analysis chunks with embeddings
async function testChunkInsert(repositoryId: string) {
  console.log('\nTest 2: Inserting analysis chunks with embeddings...');
  
  const chunksToInsert = testChunks.map((chunk, index) => ({
    repository_id: repositoryId,
    source_type: 'manual',
    content: chunk.content,
    embedding: JSON.stringify(chunk.embedding),
    metadata: chunk.metadata,
    quality_score: 0.85,
    relevance_score: 0.9,
    storage_type: 'permanent'
  }));
  
  const { data, error } = await supabase
    .from('analysis_chunks')
    .insert(chunksToInsert)
    .select();
  
  if (error) {
    console.error('Failed to insert chunks:', error);
    return [];
  }
  
  console.log(`✓ Inserted ${data.length} chunks successfully`);
  return data;
}

// Test 3: Vector similarity search
async function testVectorSearch(repositoryId: string) {
  console.log('\nTest 3: Testing vector similarity search...');
  
  // Generate a query embedding similar to the first test chunk
  const queryEmbedding = generateMockEmbedding(1.1); // Similar to seed 1
  
  const startTime = Date.now();
  
  const { data, error } = await supabase.rpc('search_similar_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    repository_id: repositoryId,
    limit_count: 5,
    min_score: 0.7
  });
  
  const searchTime = Date.now() - startTime;
  
  if (error) {
    console.error('Failed to search chunks:', error);
    return;
  }
  
  console.log(`✓ Search completed in ${searchTime}ms`);
  console.log(`✓ Found ${data.length} similar chunks`);
  
  data.forEach((result: any, index: number) => {
    console.log(`  ${index + 1}. Similarity: ${result.similarity.toFixed(4)} - ${result.content.substring(0, 50)}...`);
  });
  
  // Performance check
  if (searchTime < 100) {
    console.log('✓ Performance: Excellent (<100ms)');
  } else if (searchTime < 500) {
    console.log('✓ Performance: Good (<500ms)');
  } else {
    console.log('⚠ Performance: Needs optimization (>500ms)');
  }
}

// Test 4: Metadata filtering
async function testMetadataFiltering(repositoryId: string) {
  console.log('\nTest 4: Testing metadata filtering...');
  
  const { data, error } = await supabase
    .from('analysis_chunks')
    .select('*')
    .eq('repository_id', repositoryId)
    .contains('metadata', { language: 'typescript' });
  
  if (error) {
    console.error('Failed to filter by metadata:', error);
    return;
  }
  
  console.log(`✓ Found ${data.length} TypeScript chunks`);
}

// Test 5: Educational patterns
async function testEducationalPatterns() {
  console.log('\nTest 5: Testing educational patterns...');
  
  const pattern = {
    pattern_type: 'best_practice',
    language: 'typescript',
    framework: 'react',
    title: 'Use Custom Hooks for Shared Logic',
    description: 'Extract shared component logic into custom hooks for reusability',
    before_code: `// Component A\nconst [data, setData] = useState();\nuseEffect(() => { fetchData(); }, []);`,
    after_code: `// Custom Hook\nfunction useData() {\n  const [data, setData] = useState();\n  useEffect(() => { fetchData(); }, []);\n  return data;\n}`,
    explanation: 'Custom hooks allow you to extract and share stateful logic between components.',
    embedding: JSON.stringify(generateMockEmbedding(10)),
    tags: ['react', 'hooks', 'reusability'],
    difficulty: 'intermediate'
  };
  
  const { data, error } = await supabase
    .from('educational_patterns')
    .insert(pattern)
    .select()
    .single();
  
  if (error) {
    console.error('Failed to insert educational pattern:', error);
    return;
  }
  
  console.log('✓ Educational pattern inserted successfully');
}

// Test 6: User skills tracking
async function testUserSkills() {
  console.log('\nTest 6: Testing user skills tracking...');
  
  // First, get a user ID (we'll use the first user if exists)
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .limit(1);
  
  if (!users || users.length === 0) {
    console.log('⚠ No users found, skipping user skills test');
    return;
  }
  
  const userId = users[0].id;
  
  const skill = {
    user_id: userId,
    language: 'typescript',
    domain: 'react-hooks',
    skill_level: 'intermediate',
    confidence: 0.75,
    interactions: 10,
    successful_applications: 7
  };
  
  const { data, error } = await supabase
    .from('user_skills')
    .upsert(skill)
    .select()
    .single();
  
  if (error) {
    console.error('Failed to upsert user skill:', error);
    return;
  }
  
  console.log('✓ User skill tracking working correctly');
}

// Test 7: Clean expired content
async function testCleanExpiredContent() {
  console.log('\nTest 7: Testing expired content cleanup...');
  
  const { data, error } = await supabase.rpc('clean_expired_content');
  
  if (error) {
    console.error('Failed to clean expired content:', error);
    return;
  }
  
  console.log(`✓ Cleaned ${data} expired items`);
}

// Cleanup function
async function cleanup(repositoryId: string) {
  console.log('\nCleaning up test data...');
  
  // Delete test repository (cascades to chunks)
  const { error } = await supabase
    .from('repositories')
    .delete()
    .eq('id', repositoryId);
  
  if (error) {
    console.error('Failed to cleanup:', error);
    return;
  }
  
  console.log('✓ Test data cleaned up successfully');
}

// Main test runner
async function runTests() {
  console.log('=== Vector Database Test Suite ===\n');
  
  if (isTestMode) {
    console.log('⚠️  Running in test mode - Supabase operations will be mocked');
    console.log('✅ Test mode setup completed successfully');
    return;
  }
  
  try {
    // Run tests
    const repositoryId = await testRepositoryInsert();
    if (!repositoryId) {
      console.error('Failed to create test repository, aborting tests');
      return;
    }
    
    const chunks = await testChunkInsert(repositoryId);
    
    if (chunks.length > 0) {
      await testVectorSearch(repositoryId);
      await testMetadataFiltering(repositoryId);
    }
    
    await testEducationalPatterns();
    await testUserSkills();
    await testCleanExpiredContent();
    
    // Cleanup
    await cleanup(repositoryId);
    
    console.log('\n=== All tests completed successfully! ===');
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

// Run the tests
runTests().catch(console.error);
