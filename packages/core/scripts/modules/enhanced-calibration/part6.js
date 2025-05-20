          
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
  
  // Generate final report
  console.log('\n=== Generating Final Report ===');
  
  // Generate detailed CSV report for manual analysis
  try {
    await generateDetailedReport(results, CSV_REPORT_PATH);
    console.log(`Detailed CSV report generated at: ${CSV_REPORT_PATH}`);
  } catch (reportError) {
    logError('Error generating CSV report', reportError);
    console.error('Failed to generate detailed CSV report');
  }
  
  // Summarize best models for each language/size combination
  console.log('\nDetermining optimal models for each language/size combination...');
  
  if (results.bestModels) {
    for (const language of Object.keys(results.bestModels)) {
      for (const size of Object.keys(results.bestModels[language])) {
        const bestModel = results.bestModels[language][size];
        console.log(`Best model for ${language}/${size}: ${bestModel.model} with average score ${bestModel.score.toFixed(2)}/10`);
      }
    }
  }
  
  // Generate configuration
  try {
    await generateModelConfig(results);
    console.log(`Configuration file generated at: ${CONFIG_OUTPUT_PATH}`);
  } catch (configError) {
    logError('Error generating configuration', configError);
    console.error('Failed to generate configuration file');
  }
  
  console.log('\nCalibration complete!');
  console.log(`Results saved to: ${RESULTS_FILE}`);
  console.log(`\nFor tabular analysis, review the detailed CSV report at: ${CSV_REPORT_PATH}`);
  console.log('\nTo apply the configuration:');
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