/* eslint-disable no-console */
import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import { RepositoryModelSelectionService, AnalysisTier } from '../../../../packages/core/src/services/model-selection/RepositoryModelSelectionService';
import { ModelVersionSync, RepositorySizeCategory } from '../../../../packages/core/src/services/model-selection/ModelVersionSync';
import { createLogger } from '../../../../packages/core/src/utils/logger';
import { RepositoryType } from '../../../../packages/core/src/types/repository';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

const logger = createLogger('TrackingTest');

async function main() {
  console.log(chalk.cyan('\n🔍 Testing Model Selection and Tracking\n'));

  // Initialize services
  const modelVersionSync = new ModelVersionSync(logger);
  const modelSelectionService = new RepositoryModelSelectionService(logger);

  // Test different repository contexts
  const testContexts = [
    { language: 'javascript', size: RepositorySizeCategory.SMALL, tier: AnalysisTier.QUICK },
    { language: 'python', size: RepositorySizeCategory.MEDIUM, tier: AnalysisTier.COMPREHENSIVE },
    { language: 'typescript', size: RepositorySizeCategory.LARGE, tier: AnalysisTier.TARGETED },
    { language: 'elixir', size: RepositorySizeCategory.SMALL, tier: AnalysisTier.QUICK },
    { language: 'rust', size: RepositorySizeCategory.LARGE, tier: AnalysisTier.TARGETED }
  ];

  console.log(chalk.yellow('Testing Model Selection:\n'));

  for (const context of testContexts) {
    try {
      const model = modelSelectionService.getModelForRepository(
        {
          owner: 'test',
          repo: 'test-repo',
          repoType: 'github' as RepositoryType,
          language: context.language,
          sizeBytes: context.size === RepositorySizeCategory.SMALL ? 1000000 : 
                     context.size === RepositorySizeCategory.MEDIUM ? 20000000 : 100000000
        },
        context.tier
      );
      
      console.log(chalk.green(`✓ ${context.language}/${context.size}/${context.tier}: ${model.provider}/${model.model}`));
      
      // Check if model has pricing info
      const modelInfo = await modelVersionSync.getCanonicalVersion(model.provider, model.model);
      if (modelInfo?.pricing) {
        console.log(chalk.gray(`  💰 Cost: $${modelInfo.pricing.input}/1M input, $${modelInfo.pricing.output}/1M output`));
      }
      
      // Check calibration need
      const calibration = modelSelectionService.checkCalibrationNeeded({
        owner: 'test',
        repo: 'test-repo',
        repoType: 'github' as RepositoryType,
        language: context.language,
        sizeBytes: context.size === RepositorySizeCategory.SMALL ? 1000000 : 20000000
      });
      
      if (calibration.requiresCalibration) {
        console.log(chalk.yellow(`  ⚠️  Calibration needed: ${calibration.reason}`));
      }
    } catch (error) {
      console.log(chalk.red(`✗ ${context.language}/${context.size}/${context.tier}: ${error.message}`));
    }
  }

  console.log(chalk.cyan('\n✅ Model selection tracking test completed!\n'));
}

main().catch(error => {
  console.error(chalk.red('\n❌ Test failed:'), error);
  process.exit(1);
});