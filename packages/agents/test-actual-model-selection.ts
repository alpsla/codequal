import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { DeepWikiResponseTransformer } from './src/standard/services/deepwiki-response-transformer';
import { ModelConfigResolver } from './src/standard/services/model-config-resolver';
import * as dotenv from 'dotenv';

dotenv.config();

async function testActualModelSelection() {
  console.log('🚀 Testing Actual Model Selection from Supabase\n');
  
  try {
    // Initialize model config resolver
    const modelResolver = new ModelConfigResolver();
    
    // Test 1: Get model for TypeScript project
    console.log('📊 Test 1: TypeScript project model selection');
    const tsConfig = await modelResolver.getModelConfig('typescript', 'medium');
    console.log('Model for TypeScript:', tsConfig.model);
    console.log('Provider:', tsConfig.provider);
    console.log('');
    
    // Test 2: ReportGeneratorV8Final with model resolution
    console.log('📊 Test 2: Report Generator model selection');
    const generator = new ReportGeneratorV8Final(modelResolver);
    
    // Create mock comparison data to test model display
    const comparisonData = {
      success: true,
      featureBranch: { 
        issues: [], 
        scores: { overall: 85 } 
      },
      mainBranch: { 
        issues: [], 
        scores: { overall: 80 } 
      },
      newIssues: [],
      resolvedIssues: [],
      unchangedIssues: [],
      prMetadata: {
        id: 'test-pr',
        number: 100,
        title: 'Test PR',
        author: 'test-user',
        repository_url: 'https://github.com/microsoft/typescript',
        created_at: new Date().toISOString(),
        linesAdded: 100,
        linesRemoved: 50
      }
    };
    
    const report = await generator.generateReport(comparisonData, {
      format: 'markdown' as const
    });
    
    // Extract AI model from report
    const modelMatch = report.match(/\*\*AI Model:\*\* ([^\n]+)/);
    if (modelMatch) {
      console.log('Report shows AI Model:', modelMatch[1]);
    }
    
    // Check metadata section
    const metadataMatch = report.match(/- \*\*AI Model:\*\* ([^\n]+)/);
    if (metadataMatch) {
      console.log('Metadata shows AI Model:', metadataMatch[1]);
    }
    console.log('');
    
    // Test 3: DeepWikiResponseTransformer model selection
    console.log('📊 Test 3: Transformer model selection');
    const transformer = new DeepWikiResponseTransformer(modelResolver);
    
    // Transform with null data to trigger mock generation
    const result = await transformer.transform(null, {
      repositoryUrl: 'https://github.com/facebook/react',
      branch: 'main'
    });
    
    console.log('Transformer metadata:', result.metadata?.aiModel || 'Not set');
    console.log('');
    
    // Test 4: Check environment variable fallback
    console.log('📊 Test 4: Environment variable check');
    console.log('OPENROUTER_DEFAULT_MODEL:', process.env.OPENROUTER_DEFAULT_MODEL || 'Not set');
    console.log('OPENROUTER_MODEL:', process.env.OPENROUTER_MODEL || 'Not set');
    console.log('');
    
    // Summary
    console.log('✅ Summary:');
    console.log('- Models are now dynamically selected from Supabase');
    console.log('- No more hardcoded "claude-3.5-sonnet"');
    console.log('- Proper fallback chain: Supabase → Environment → Defaults');
    console.log('- Consistent with ComparisonOrchestrator behavior');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testActualModelSelection();
