      
      // Calculate best model across all repositories for this language/size
      try {
        if (results[testLanguage][testSize]) {
          const repos = Object.keys(results[testLanguage][testSize]).filter(key => key !== 'bestModel');
          const modelScores = {};
          
          // Calculate average scores for each model across repositories
          for (const repo of repos) {
            const repoResults = results[testLanguage][testSize][repo];
            for (const modelKey of Object.keys(repoResults)) {
              // Skip the bestModel entry
              if (modelKey === 'bestModel') continue;
              
              const modelData = repoResults[modelKey];
              if (!modelData.scores || !modelData.scores.combined) continue;
              
              // Add to model scores
              if (!modelScores[modelKey]) {
                modelScores[modelKey] = {
                  totalScore: 0,
                  repoCount: 0
                };
              }
              
              modelScores[modelKey].totalScore += modelData.scores.combined;
              modelScores[modelKey].repoCount++;
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
            
            console.log(`\nBest model for ${testLanguage}/${testSize} (all repos): ${bestModelKey} with average score ${bestAvgScore.toFixed(2)}/10`);
            
            // Save results
            saveResults(results);
          }
        }
      } catch (error) {
        logError(`Error determining best model for ${testLanguage}/${testSize}`, error);
      }
    }
  }