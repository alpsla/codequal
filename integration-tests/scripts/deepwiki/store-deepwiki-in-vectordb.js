const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function storeDeepWikiReport(repositoryId, report) {
  const chunks = [];
  
  // Store summary
  chunks.push({
    repository_id: repositoryId,
    source_type: 'manual',
    content: JSON.stringify(report.summary),
    metadata: {
      content_type: 'deepwiki_summary',
      repository_name: report.repositoryName,
      analysis_date: report.analysisDate,
      importance_score: 1.0
    },
    storage_type: 'permanent'
  });
  
  // Store sections
  for (const [sectionName, sectionData] of Object.entries(report.sections)) {
    chunks.push({
      repository_id: repositoryId,
      source_type: 'manual',
      content: JSON.stringify(sectionData),
      metadata: {
        content_type: 'deepwiki_section',
        section: sectionName,
        score: sectionData.score,
        importance_score: sectionData.score / 10,
        repository_name: report.repositoryName
      },
      storage_type: 'permanent'
    });
  }
  
  const { data, error } = await supabase
    .from('analysis_chunks')
    .insert(chunks);
  
  if (error) {
    console.error('Error storing DeepWiki report:', error);
  } else {
    console.log(`Stored ${chunks.length} chunks for repository ${repositoryId}`);
  }
}

// Example usage
const mockReport = require('./mock-deepwiki-report.json');
storeDeepWikiReport('550e8400-e29b-41d4-a716-446655440000', mockReport);
