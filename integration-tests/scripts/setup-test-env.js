require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupTestData() {
  console.log('Setting up test data...');
  
  const TEST_REPO_ID = '550e8400-e29b-41d4-a716-446655440000';
  
  // Check if data already exists
  const { data: existing } = await supabase
    .from('analysis_chunks')
    .select('id')
    .eq('repository_id', TEST_REPO_ID)
    .eq('source_type', 'manual')
    .limit(1);
  
  if (existing && existing.length > 0) {
    console.log('✅ Test data already exists');
    return;
  }
  
  // Create mock DeepWiki report
  const mockReport = {
    repositoryUrl: 'https://github.com/expressjs/express',
    repositoryName: 'express-test-repo',
    analysisDate: new Date().toISOString(),
    summary: {
      overview: 'Express is a minimal and flexible Node.js web application framework...',
      keyTechnologies: ['JavaScript', 'Node.js'],
      architecture: 'Middleware-based architecture...',
      teamSize: 'Medium',
      complexity: 'Medium'
    },
    sections: {
      'Security Analysis': {
        content: 'Security analysis of the Express repository...',
        findings: ['Input validation', 'HTTPS support'],
        score: 8.0
      },
      'Architecture Overview': {
        content: 'Express uses a middleware-based architecture...',
        patterns: ['Middleware Pattern', 'Router Pattern'],
        score: 8.5
      },
      'Executive Summary': {
        content: 'Express.js is a well-maintained web framework...',
        keyPoints: ['Active community', 'Regular updates'],
        score: 9.0
      },
      'Key Findings': {
        content: 'Key findings from the analysis...',
        findings: ['Good test coverage', 'Clear documentation'],
        score: 8.7
      }
    }
  };
  
  const chunks = [];
  
  // Store summary
  chunks.push({
    repository_id: TEST_REPO_ID,
    source_type: 'manual',
    content: JSON.stringify(mockReport.summary),
    metadata: {
      content_type: 'deepwiki_summary',
      repository_name: mockReport.repositoryName,
      analysis_date: mockReport.analysisDate,
      importance_score: 1.0
    },
    storage_type: 'permanent'
  });
  
  // Store sections
  for (const [sectionName, sectionData] of Object.entries(mockReport.sections)) {
    chunks.push({
      repository_id: TEST_REPO_ID,
      source_type: 'manual',
      content: JSON.stringify(sectionData),
      metadata: {
        content_type: 'deepwiki_section',
        section: sectionName,
        score: sectionData.score,
        importance_score: sectionData.score / 10,
        repository_name: mockReport.repositoryName
      },
      storage_type: 'permanent'
    });
  }
  
  console.log(`Inserting ${chunks.length} chunks...`);
  
  const { error } = await supabase
    .from('analysis_chunks')
    .insert(chunks);
  
  if (error) {
    console.error('❌ Error storing test data:', error);
    process.exit(1);
  } else {
    console.log(`✅ Stored ${chunks.length} chunks for test repository`);
  }
}

setupTestData().catch(console.error);
