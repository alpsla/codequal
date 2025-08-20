console.log('🚀 Testing Model Display in V8 Reports\n');

// Run the existing validation test and check model output
import('./test-v8-bug-fixes-validation').then(async () => {
  const fs = require('fs');
  const path = require('path');
  
  // Find the latest generated report
  const reportDir = path.join(__dirname, 'v8-validation');
  const files = fs.readdirSync(reportDir);
  const latestReport = files
    .filter(f => f.startsWith('bug-fix-validation') && f.endsWith('.html'))
    .sort()
    .pop();
    
  if (latestReport) {
    const reportPath = path.join(reportDir, latestReport);
    const content = fs.readFileSync(reportPath, 'utf8');
    
    // Extract AI model from report
    const modelMatch = content.match(/\*\*AI Model:\*\* ([^\\n]+)/);
    
    console.log('\n📊 Model Check Results:');
    if (modelMatch) {
      const model = modelMatch[1].replace(/\\/g, '');
      console.log('✅ AI Model in report:', model);
      
      // Check if it's a valid current model
      const validModels = [
        'gpt-4o', 
        'gpt-4-turbo', 
        'gpt-4', 
        'claude-opus',
        'openai/gpt-4',
        'anthropic/claude'
      ];
      
      const isValid = validModels.some(m => model.includes(m));
      
      if (model.includes('claude-3.5-sonnet')) {
        console.log('⚠️  Still using hardcoded claude-3.5-sonnet');
        console.log('   This should be updated to use actual configured models');
      } else if (isValid) {
        console.log('✅ Using valid production model!');
      } else {
        console.log('ℹ️  Model:', model);
      }
    } else {
      console.log('❌ Could not find AI Model in report');
    }
    
    // Also check metadata section
    const metadataMatch = content.match(/- \*\*AI Model:\*\* ([^\\n]+)/);
    if (metadataMatch) {
      const metaModel = metadataMatch[1].replace(/\\/g, '');
      console.log('📋 Metadata AI Model:', metaModel);
    }
  }
  
  console.log('\n💡 Note: The model should come from:');
  console.log('   1. Supabase model_configurations table');
  console.log('   2. ModelResearcher recommendations');
  console.log('   3. Environment variables');
  console.log('   4. Default: gpt-4o or gpt-4-turbo');
  
}).catch(error => {
  console.error('Test failed:', error);
});
