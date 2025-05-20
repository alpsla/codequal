/**
 * Main function to run calibration process
 * @return {Promise<void>}
 */
async function main() {
  console.log('=== Enhanced Model Calibration ===');
  
  // Get command line args
  const specificLanguage = getCommandLineArg('language');
  const specificSize = getCommandLineArg('size');
  const specificModel = getCommandLineArg('model');
  const specificProvider = getCommandLineArg('provider');
  const onlyGenerateConfig = process.argv.includes('--generate-config');
  const onlyGenerateReport = process.argv.includes('--generate-report');
  const skipApiValidation = process.argv.includes('--skip-api-validation');
  
  // Load existing results
  const results = loadExistingResults();
  
  // Just generate config if that's all we need
  if (onlyGenerateConfig) {
    console.log('Generating configuration from existing results...');
    try {
      await generateModelConfig(results);
      console.log(`Configuration file generated at: ${CONFIG_OUTPUT_PATH}`);
    } catch (error) {
      logError('Error generating configuration', error);
    }
    rl.close();
    return;
  }
  
  // Just generate CSV report if that's all we need
  if (onlyGenerateReport) {
    console.log('Generating detailed CSV report from existing results...');
    try {
      await generateDetailedReport(results, CSV_REPORT_PATH);
      console.log(`Detailed report generated at: ${CSV_REPORT_PATH}`);
    } catch (error) {
      logError('Error generating report', error);
    }
    rl.close();
    return;
  }
  
  // Load API keys for all providers
  const apiKeys = loadApiKeys();
  
  // Validate API keys unless skipped
  if (!skipApiValidation) {
    console.log('Validating API keys...');
    try {
      await validateAllApiKeys(apiKeys);
    } catch (error) {
      logError('API key validation error', error);
      console.warn('Continuing despite API key validation errors...');
    }
  } else {
    console.log('Skipping API key validation...');
  }
  
  // Filter repositories if needed
  let testLanguages = TEST_LANGUAGES;
  if (specificLanguage) {
    testLanguages = [specificLanguage];
  }
  
  let testSizes = TEST_SIZES;
  if (specificSize) {
    testSizes = [specificSize];
  }
  
  // Main testing loop
  for (const testLanguage of testLanguages) {
    if (!results[testLanguage]) {
      results[testLanguage] = {};
    }
    
    for (const testSize of testSizes) {
      if (!results[testLanguage][testSize]) {
        results[testLanguage][testSize] = {};
      }
      
      // Get repositories for this language/size
      let repos = [];
      if (TEST_REPOSITORIES[testLanguage] && TEST_REPOSITORIES[testLanguage][testSize]) {
        repos = TEST_REPOSITORIES[testLanguage][testSize];
      } else {
        console.warn(`No repositories defined for ${testLanguage}/${testSize}, skipping.`);
        continue;
      }
      
      console.log(`\nTesting ${testLanguage}/${testSize} repositories:`);
      
      for (const repo of repos) {
        console.log(`\nRepository: ${repo}`);
        
        if (!results[testLanguage][testSize][repo]) {
          results[testLanguage][testSize][repo] = {};
        }
        
        // Get repository context
        console.log('Fetching repository context...');
        try {
          const repoContext = await getRepositoryContext(repo);
          
          // Test each model
          console.log('Testing models...');
          
          // Track best model for this repo
          let bestModel = null;
          let bestScore = 0;
          
          // Test with providers and models
          const providers = specificProvider ? [specificProvider] : Object.keys(apiKeys);
          
          for (const provider of providers) {
            // Skip providers with no API key unless using manual keys
            if (!apiKeys[provider] && !skipApiValidation) {
              console.log(`Skipping provider ${provider} - no API key available`);
              continue;
            }
            
            // Get available models for this provider
            let models = [];
            if (provider === 'anthropic') {
              // Only keeping Claude 3.5 Sonnet and Claude 3.7 Sonnet
              // Removed: claude-3-opus-20240229, claude-3-sonnet-20240229, claude-3-haiku-20240307
              models = ['claude-3.5-sonnet-20240620', 'claude-3.7-sonnet'];
            } else if (provider === 'openai') {
              models = ['gpt-3.5-turbo', 'gpt-4o', 'gpt-4-turbo'];
            } else if (provider === 'deepseek') {
              // Adding all Deepseek models
              models = [
                'deepseek-coder', 
                'deepseek-coder-v2',
                'deepseek-chat-v2'
              ];
            } else if (provider === 'google') {
              // Only using Gemini 2.5 models
              models = ['gemini-2.5-pro', 'gemini-2.5-pro-preview-05-06', 'gemini-2.5-flash'];
            } else if (provider === 'openrouter') {
              models = ['anthropic/claude-3.7-sonnet', 'nousresearch/deephermes-3-mistral-24b-preview:free'];
            }
            
            // Filter models if specific model requested
            if (specificModel) {
              models = models.filter(model => model.includes(specificModel));
            }
            
            // Skip provider if no models
            if (models.length === 0) continue;