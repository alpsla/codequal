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