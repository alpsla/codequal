import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function setupResearcherTestData() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('Setting up RESEARCHER test data...');
  
  // Check if data already exists
  const { data: existing } = await supabase
    .from('analysis_chunks')
    .select('id')
    .eq('repository_id', '00000000-0000-0000-0000-000000000001')
    .eq('metadata->content_type', 'researcher_model_configurations')
    .single();
    
  if (existing) {
    console.log('RESEARCHER test data already exists');
    return;
  }
  
  // Create test RESEARCHER configurations
  const researcherConfig = {
    repository_id: '00000000-0000-0000-0000-000000000001',
    source_type: 'researcher_agent',
    content: JSON.stringify({
      last_research_date: new Date().toISOString(),
      configurations: {
        'typescript-react-large-security': {
          provider: 'anthropic',
          model: 'claude-3-opus-20240229',
          openrouterPath: 'anthropic/claude-3-opus',
          temperature: 0.1,
          maxTokens: 8000,
          reasoning: 'Best for complex security analysis in large TypeScript React apps',
          fallback: {
            provider: 'openai',
            model: 'gpt-4-turbo-2024-04-09',
            openrouterPath: 'openai/gpt-4-turbo'
          }
        },
        'javascript-express-small-codeQuality': {
          provider: 'openai',
          model: 'gpt-4-0125-preview',
          openrouterPath: 'openai/gpt-4',
          temperature: 0.3,
          maxTokens: 4000,
          reasoning: 'Cost-effective for small JavaScript projects',
          fallback: {
            provider: 'anthropic',
            model: 'claude-3-sonnet-20240229',
            openrouterPath: 'anthropic/claude-3-sonnet'
          }
        },
        'python-django-medium-security': {
          provider: 'anthropic',
          model: 'claude-3-sonnet-20240229',
          openrouterPath: 'anthropic/claude-3-sonnet',
          temperature: 0.1,
          maxTokens: 6000,
          reasoning: 'Good balance for Python security analysis',
          fallback: {
            provider: 'openai',
            model: 'gpt-4-0125-preview',
            openrouterPath: 'openai/gpt-4'
          }
        }
      }
    }),
    metadata: {
      content_type: 'researcher_model_configurations',
      version: '1.0',
      test_data: true
    },
    storage_type: 'permanent',
    embedding: null
  };
  
  const { error } = await supabase
    .from('analysis_chunks')
    .insert(researcherConfig);
    
  if (error) {
    console.error('Error creating test data:', error);
  } else {
    console.log('✅ RESEARCHER test data created successfully');
  }
}

// Run if called directly
if (require.main === module) {
  setupResearcherTestData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export { setupResearcherTestData };
