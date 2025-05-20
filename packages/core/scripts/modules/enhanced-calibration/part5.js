              
              // Calculate combined score using improved weighting
              if (categoryCount > 0) {
                const avgQuality = totalQuality / categoryCount;
                const avgResponseTime = totalResponseTime / categoryCount;
                
                // Speed score (15% impact - reduced from 30%)
                const speedScore = Math.max(0, 10 - (avgResponseTime / 3));
                
                // Price score (35% impact - just slightly less than quality)
                const priceScore = calculatePriceScore(provider, model);
                
                // Calculate combined score with new weighting
                // Quality: 50%, Speed: 15%, Price: 35%
                const combinedScore = (avgQuality * 0.50) + (speedScore * 0.15) + (priceScore * 0.35);
                
                console.log(`\nScores for ${modelKey}:`);
                console.log(`- Quality: ${avgQuality.toFixed(2)}/10 (50% weight)`);
                console.log(`- Speed: ${speedScore.toFixed(2)}/10 (15% weight)`);
                console.log(`- Price: ${priceScore.toFixed(2)}/10 (35% weight)`);
                console.log(`Combined score: ${combinedScore.toFixed(2)}/10`);
                
                try {
                  // Save scores to results
                  results[testLanguage][testSize][repo][modelKey].scores = {
                    quality: avgQuality,
                    speed: speedScore,
                    price: priceScore,
                    combined: combinedScore,
                    timestamp: new Date().toISOString()
                  };
                  
                  // Update best model if no errors and better score
                  if (!hasError && combinedScore > bestScore) {
                    bestModel = modelKey;
                    bestScore = combinedScore;
                    console.log(`New best model for ${repo}: ${bestModel} with score ${bestScore.toFixed(2)}/10`);
                  }
                  
                  // Save after score calculation
                  saveResults(results);
                } catch (saveError) {
                  logError(`Error saving scores for ${modelKey}`, saveError);
                }
              } else if (hasError) {
                console.warn(`No valid results for ${modelKey} due to errors`);
              }
            }
          }
          
          // Save best model for this repo
          if (bestModel) {
            try {
              results[testLanguage][testSize][repo].bestModel = {
                model: bestModel,
                score: bestScore,
                timestamp: new Date().toISOString()
              };
              
              console.log(`\nBest model for ${repo}: ${bestModel} with score ${bestScore.toFixed(2)}/10`);
              
              // Save results
              saveResults(results);
            } catch (saveError) {
              logError(`Error saving best model for ${repo}`, saveError);
            }
          }
        } catch (error) {
          logError(`Error processing repository ${repo}`, error);
        }
      }
      
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