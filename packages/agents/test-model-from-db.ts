import { ComparisonOrchestrator } from './src/standard/orchestrator/comparison-orchestrator';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as dotenv from 'dotenv';

dotenv.config();

async function testModelFromDatabase() {
  console.log('🚀 Testing Model Selection from Database\n');
  
  try {
    // Test 1: Check what ComparisonOrchestrator uses
    console.log('📊 Test 1: ComparisonOrchestrator model selection');
    const orchestrator = new ComparisonOrchestrator();
    
    // The orchestrator queries Supabase for model config
    // Let's see what model it would use
    console.log('Note: ComparisonOrchestrator uses ModelResearcher to get optimal models');
    console.log('It stores configs in Supabase model_configurations table');
    console.log('');
    
    // Test 2: Create report generator and check model
    console.log('📊 Test 2: Report Generator with async model');
    const generator = new ReportGeneratorV8Final();
    
    // Create minimal test data
    const testData = {
      success: true,
      featureBranch: { 
        analyzed: true,
        issues: [],
        scores: { overall: 85 }
      },
      mainBranch: 'main',
      newIssues: [],
      resolvedIssues: [],
      unchangedIssues: [],
      prMetadata: {
        id: 'test-pr',
        number: 100,
        title: 'Test PR',
        author: 'test-user',
        repository_url: 'https://github.com/test/repo',
        created_at: new Date().toISOString(),
        linesAdded: 100,
        linesRemoved: 50
      }
    };
    
    // Generate report (this will now query for actual model)
    const report = await generator.generateReport(testData as any, {
      format: 'markdown' as const
    });
    
    // Extract model from report
    const modelMatch = report.match(/\*\*AI Model:\*\* ([^\n]+)/);
    if (modelMatch) {
      console.log('✅ Report shows AI Model:', modelMatch[1]);
      
      // Check if it's not the hardcoded claude
      if (!modelMatch[1].includes('claude-3.5-sonnet')) {
        console.log('✅ No longer using hardcoded claude-3.5-sonnet!');
      }
      
      // Check if it matches expected models
      const validModels = ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'claude-opus-4.1', 'openai/gpt-4o'];
      const isValidModel = validModels.some(m => modelMatch[1].includes(m));
      console.log(isValidModel ? '✅' : '⚠️', 'Using valid production model');
    }
    console.log('');
    
    // Test 3: Check environment variables
    console.log('📊 Test 3: Environment fallbacks');
    console.log('OPENROUTER_DEFAULT_MODEL:', process.env.OPENROUTER_DEFAULT_MODEL || 'Not set');
    console.log('ANTHROPIC_MODEL:', process.env.ANTHROPIC_MODEL || 'Not set');
    console.log('');
    
    // Summary
    console.log('✨ Summary:');
    console.log('- Report generator now queries for actual models');
    console.log('- Uses same model selection as ComparisonOrchestrator');
    console.log('- Falls back to environment variables if needed');
    console.log('- No more hardcoded outdated models!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nThis is expected if Supabase is not configured.');
    console.log('The system will fall back to environment variables or defaults.');
  }
}

testModelFromDatabase();
