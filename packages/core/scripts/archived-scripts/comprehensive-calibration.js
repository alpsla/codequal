            console.log(`Testing ${modelKey} with ${category}...`);
            
            try {
              // Generate prompts
              const prompts = createPrompts(category, repoContext);
              
              // Call API
              const result = await callModelApi(provider, model, prompts.systemPrompt, prompts.userPrompt);
              
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
            } catch (error) {
              console.error(`Error testing ${category}:`, error.message);
              
              results[testLanguage][testSize][repo][modelKey].categories[category] = {
                error: error.message,
                timestamp: new Date().toISOString()
              };
            }
            
            // Save after each test
            fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
          }
          
          // Calculate combined score
          if (categoryCount > 0) {
            const avgQuality = totalQuality / categoryCount;
            const avgResponseTime = totalResponseTime / categoryCount;
            const speedScore = Math.max(0, 10 - (avgResponseTime / 3));
            const combinedScore = (avgQuality * 0.7) + (speedScore * 0.3);
            
            console.log(`Combined score for ${modelKey}: ${combinedScore.toFixed(2)}/10`);
            console.log(`Quality: ${avgQuality.toFixed(2)}, Speed: ${speedScore.toFixed(2)}`);
            
            // Update best model
            if (combinedScore > bestScore) {
              bestModel = modelKey;
              bestScore = combinedScore;
              console.log(`New best model for ${testLanguage}/${testSize}: ${bestModel}`);
            }
          }
        }
        
        // Save best model
        if (bestModel) {
          if (!results.bestModels) results.bestModels = {};
          if (!results.bestModels[testLanguage]) results.bestModels[testLanguage] = {};
          
          results.bestModels[testLanguage][testSize] = {
            model: bestModel,
            score: bestScore,
            timestamp: new Date().toISOString()
          };
          
          console.log(`\nBest model for ${testLanguage}/${testSize}/${repo}: ${bestModel} with score ${bestScore.toFixed(2)}`);
        }
        
        // Save results
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
      }
      
      // Calculate best model across all repositories for this language/size
      if (results[testLanguage][testSize]) {
        const repos = Object.keys(results[testLanguage][testSize]);
        const modelScores = {};
        
        // Calculate average scores for each model across repositories
        for (const repo of repos) {
          for (const modelKey of Object.keys(results[testLanguage][testSize][repo])) {
            if (modelKey === 'bestModel') continue;
            
            const modelData = results[testLanguage][testSize][repo][modelKey];
            if (!modelData.categories) continue;
            
            // Calculate combined score for this model in this repo
            let totalQuality = 0;
            let totalResponseTime = 0;
            let categoryCount = 0;
            
            for (const category of Object.keys(modelData.categories)) {
              const categoryData = modelData.categories[category];
              if (!categoryData.error) {
                totalQuality += categoryData.qualityScore || 0;
                totalResponseTime += categoryData.responseTime || 0;
                categoryCount++;
              }
            }
            
            if (categoryCount > 0) {
              const avgQuality = totalQuality / categoryCount;
              const avgResponseTime = totalResponseTime / categoryCount;
              const speedScore = Math.max(0, 10 - (avgResponseTime / 3));
              const combinedScore = (avgQuality * 0.7) + (speedScore * 0.3);
              
              // Add to model scores
              if (!modelScores[modelKey]) {
                modelScores[modelKey] = {
                  totalScore: 0,
                  repoCount: 0
                };
              }
              
              modelScores[modelKey].totalScore += combinedScore;
              modelScores[modelKey].repoCount++;
            }
          }
        }
        
        // Find the best model across all repositories
        let bestModelKey = null;
        let bestAvgScore = 0;
        
        for (const modelKey of Object.keys(modelScores)) {
          const { totalScore, repoCount } = modelScores[modelKey];
          if (repoCount > 0) {
            const avgScore = totalScore / repoCount;
            
            if (avgScore > bestAvgScore) {
              bestAvgScore = avgScore;
              bestModelKey = modelKey;
            }
          }
        }
        
        // Save best model for this language/size
        if (bestModelKey) {
          if (!results.bestModels) results.bestModels = {};
          if (!results.bestModels[testLanguage]) results.bestModels[testLanguage] = {};
          
          results.bestModels[testLanguage][testSize] = {
            model: bestModelKey,
            score: bestAvgScore,
            timestamp: new Date().toISOString()
          };
          
          console.log(`\nBest model for ${testLanguage}/${testSize} (all repos): ${bestModelKey} with average score ${bestAvgScore.toFixed(2)}`);
          
          // Save results
          fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
        }
      }
    }
  }
  
  // Generate configuration
  await generateModelConfig(results);
  
  console.log('\nCalibration complete!');
  console.log('To apply the configuration:');
  console.log(`cp ${CONFIG_OUTPUT_PATH} ../src/config/models/repository-model-config.ts`);
  console.log(`npm run build:core`);
  
  // Close readline interface
  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  rl.close();
  process.exit(1);
});
