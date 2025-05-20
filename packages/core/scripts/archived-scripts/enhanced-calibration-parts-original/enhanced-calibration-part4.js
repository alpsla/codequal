            for (const model of models) {
              const modelKey = `${provider}/${model}`;
              console.log(`\nTesting ${modelKey}...`);
              
              // Skip if already tested
              if (results[testLanguage][testSize][repo][modelKey] && 
                  results[testLanguage][testSize][repo][modelKey].categories && 
                  Object.keys(results[testLanguage][testSize][repo][modelKey].categories).length === CATEGORIES.length &&
                  !process.argv.includes('--force')) {
                console.log(`Already tested ${modelKey}, skipping. Use --force to retest.`);
                continue;
              }
              
              // Initialize or load existing results
              if (!results[testLanguage][testSize][repo][modelKey]) {
                results[testLanguage][testSize][repo][modelKey] = { categories: {} };
              }
              
              if (!results[testLanguage][testSize][repo][modelKey].categories) {
                results[testLanguage][testSize][repo][modelKey].categories = {};
              }
              
              // Tracking metrics for this model
              let totalQuality = 0;
              let totalResponseTime = 0;
              let categoryCount = 0;
              let hasError = false;
              
              // Test each category
              for (const category of CATEGORIES) {
                // Skip if already tested
                if (results[testLanguage][testSize][repo][modelKey].categories[category] && 
                    !results[testLanguage][testSize][repo][modelKey].categories[category].error &&
                    !process.argv.includes('--force')) {
                  console.log(`Category ${category} already tested, skipping.`);
                  
                  // Add to totals for score calculation
                  if (results[testLanguage][testSize][repo][modelKey].categories[category].qualityScore) {
                    totalQuality += results[testLanguage][testSize][repo][modelKey].categories[category].qualityScore;
                    totalResponseTime += results[testLanguage][testSize][repo][modelKey].categories[category].responseTime;
                    categoryCount++;
                  }
                  
                  continue;
                }
                
                console.log(`Testing ${modelKey} with ${category}...`);
                
                try {
                  // Generate prompts
                  const prompts = createPrompts(category, repoContext);
                  
                  // Call API with support for manual keys
                  const result = await callModelApiWithManualKey(provider, model, prompts.systemPrompt, prompts.userPrompt);
                  
                  // Calculate quality score
                  const qualityScore = evaluateQuality(result.content, category);
                  
                  // Save result
                  results[testLanguage][testSize][repo][modelKey].categories[category] = {
                    qualityScore,
                    responseTime: result.responseTime,
                    contentSize: result.contentSize,
                    timestamp: new Date().toISOString()
                  };
                  
                  console.log(`Quality score: ${qualityScore.toFixed(2)}/10`);
                  console.log(`Response time: ${result.responseTime.toFixed(2)}s`);
                  
                  // Update totals
                  totalQuality += qualityScore;
                  totalResponseTime += result.responseTime;
                  categoryCount++;
                  
                  // Save after each category
                  saveResults(results);
                } catch (error) {
                  logError(`Error testing ${modelKey} with ${category}`, error);
                  hasError = true;
                  
                  results[testLanguage][testSize][repo][modelKey].categories[category] = {
                    error: error.message,
                    timestamp: new Date().toISOString()
                  };
                  
                  // Save error result
                  saveResults(results);
                  
                  // Prompt for manual API key if this might be an API key issue
                  if (error.message.includes('authentication') || 
                      error.message.includes('unauthorized') || 
                      error.message.includes('api key') ||
                      error.message.includes('API key') ||
                      error.message.includes('400')) {
                    try {
                      const provided = await promptForApiKey(provider, model);
                      
                      // If user provided a manual key, retry this category
                      if (provided) {
                        console.log(`Retrying ${category} with manual API key...`);
                        try {
                          const prompts = createPrompts(category, repoContext);
                          const result = await callModelApiWithManualKey(provider, model, prompts.systemPrompt, prompts.userPrompt);
                          const qualityScore = evaluateQuality(result.content, category);
                          
                          // Update result
                          results[testLanguage][testSize][repo][modelKey].categories[category] = {
                            qualityScore,
                            responseTime: result.responseTime,
                            contentSize: result.contentSize,
                            timestamp: new Date().toISOString()
                          };
                          
                          console.log(`Quality score: ${qualityScore.toFixed(2)}/10`);
                          console.log(`Response time: ${result.responseTime.toFixed(2)}s`);
                          
                          // Update totals
                          totalQuality += qualityScore;
                          totalResponseTime += result.responseTime;
                          categoryCount++;
                          
                          // Reset error flag for this retry
                          hasError = false;
                          
                          // Save successful retry
                          saveResults(results);
                        } catch (retryError) {
                          logError(`Retry failed for ${modelKey} with ${category}`, retryError);
                          saveResults(results);
                        }
                      }
                    } catch (promptError) {
                      logError(`Error prompting for API key`, promptError);
                    }
                  }
                }
              }