/* eslint-disable no-console */
import chalk from 'chalk';
import { ModelVersionSync, RepositorySizeCategory } from '../../../../packages/core/src/services/model-selection/ModelVersionSync';
import { RepositoryModelSelectionService, AnalysisTier } from '../../../../packages/core/src/services/model-selection/RepositoryModelSelectionService';
import { createLogger } from '../../../../packages/core/src/utils/logger';
import { RepositoryType } from '../../../../packages/core/src/types/repository';

/**
 * Test scenarios specifically for model selection and researcher agent activation
 */
export class ModelSelectionTestScenarios {
  private modelVersionSync: ModelVersionSync;
  private modelSelectionService: RepositoryModelSelectionService;
  private logger = createLogger('ModelSelectionTest');

  constructor() {
    this.modelVersionSync = new ModelVersionSync(this.logger);
    this.modelSelectionService = new RepositoryModelSelectionService(this.logger);
  }

  /**
   * Test 1: Model selection for various language/size combinations
   */
  async testLanguageSizeCombinations(): Promise<void> {
    console.log(chalk.bold('\n🔍 Test 1: Language/Size Model Selection\n'));

    const languages = [
      'javascript', 'typescript', 'python', 'java', 'go', 'rust',
      'elixir', 'haskell', 'scala', 'kotlin', 'swift', 'ruby'
    ];
    
    const sizes = [
      RepositorySizeCategory.SMALL,
      RepositorySizeCategory.MEDIUM,
      RepositorySizeCategory.LARGE
    ];

    const results: any[] = [];

    for (const language of languages) {
      for (const size of sizes) {
        const context = {
          owner: 'test',
          repo: `${language}-${size}-repo`,
          repoType: 'github' as RepositoryType,
          language,
          sizeBytes: size === RepositorySizeCategory.SMALL ? 1000000 :
                     size === RepositorySizeCategory.MEDIUM ? 25000000 : 100000000
        };

        // Check calibration need
        const calibration = this.modelSelectionService.checkCalibrationNeeded(context);
        
        // Get selected model
        const model = this.modelSelectionService.getModelForRepository(
          context,
          AnalysisTier.COMPREHENSIVE
        );

        results.push({
          language,
          size,
          model: `${model.provider}/${model.model}`,
          calibrationNeeded: calibration.requiresCalibration,
          calibrationReason: calibration.reason
        });

        console.log(`${chalk.cyan(language.padEnd(12))} ${chalk.gray(size.padEnd(12))} → ${chalk.green(model.provider)}/${chalk.yellow(model.model)}`);
        
        if (calibration.requiresCalibration) {
          console.log(chalk.red(`  ⚠️  Calibration needed: ${calibration.reason}`));
        }
      }
    }

    // Summary
    const needsCalibration = results.filter(r => r.calibrationNeeded);
    console.log(chalk.bold(`\nSummary:`));
    console.log(`Total combinations tested: ${results.length}`);
    console.log(`Needs calibration: ${chalk.red(needsCalibration.length.toString())}`);
    console.log(`Languages needing calibration: ${chalk.yellow([...new Set(needsCalibration.map(r => r.language))].join(', '))}`);
  }

  /**
   * Test 2: Researcher agent activation scenarios
   */
  async testResearcherActivation(): Promise<void> {
    console.log(chalk.bold('\n🔬 Test 2: Researcher Agent Activation Scenarios\n'));

    const scenarios = [
      {
        name: 'Unsupported Language',
        context: { 
          language: 'elixir', 
          sizeBytes: 10000000,
          owner: 'test',
          repo: 'elixir-phoenix',
          repoType: 'github' as RepositoryType
        },
        expectedReason: 'No configurations found'
      },
      {
        name: 'Complex Framework',
        context: { 
          language: 'javascript', 
          sizeBytes: 50000000,
          frameworks: ['react-native', 'electron'],
          owner: 'test',
          repo: 'complex-framework-app',
          repoType: 'github' as RepositoryType
        },
        expectedReason: 'complex frameworks'
      },
      {
        name: 'Untested Configuration',
        context: { 
          language: 'scala', 
          sizeBytes: 75000000,
          owner: 'test',
          repo: 'scala-akka-project',
          repoType: 'github' as RepositoryType
        },
        expectedReason: 'not been fully tested'
      }
    ];

    for (const scenario of scenarios) {
      console.log(chalk.blue(`\nScenario: ${scenario.name}`));
      
      const calibration = this.modelSelectionService.checkCalibrationNeeded(scenario.context);
      
      console.log(`Repository: ${scenario.context.owner}/${scenario.context.repo}`);
      console.log(`Language: ${scenario.context.language}`);
      console.log(`Calibration Required: ${calibration.requiresCalibration ? chalk.red('YES') : chalk.green('NO')}`);
      
      if (calibration.requiresCalibration) {
        console.log(`Reason: ${chalk.yellow(calibration.reason || 'Unknown')}`);
        console.log(`Type: ${calibration.calibrationType}`);
        console.log(`Estimated Time: ${calibration.estimatedCalibrationTime} minutes`);
        
        if (calibration.temporaryConfig) {
          console.log(`Temporary Model: ${chalk.cyan(`${calibration.temporaryConfig.provider}/${calibration.temporaryConfig.model}`)}`);
        }
      }
    }
  }

  /**
   * Test 3: Model cost tracking
   */
  async testModelCostTracking(): Promise<void> {
    console.log(chalk.bold('\n💰 Test 3: Model Cost Tracking\n'));

    const testUsage = [
      { provider: 'openai', model: 'gpt-4o', inputTokens: 10000, outputTokens: 2000 },
      { provider: 'anthropic', model: 'claude-3-7-sonnet', inputTokens: 15000, outputTokens: 3000 },
      { provider: 'google', model: 'gemini-2.5-pro-preview-05-06', inputTokens: 12000, outputTokens: 2500 },
      { provider: 'deepseek', model: 'deepseek-coder', inputTokens: 20000, outputTokens: 4000 },
      { provider: 'openrouter', model: 'anthropic/claude-3.7-sonnet', inputTokens: 8000, outputTokens: 1500 }
    ];

    let totalCost = 0;
    const costByProvider: Record<string, number> = {};

    for (const usage of testUsage) {
      const modelInfo = usage.provider === 'openrouter' 
        ? await this.modelVersionSync.getCanonicalVersion('openrouter', usage.model)
        : await this.modelVersionSync.getCanonicalVersion(usage.provider, usage.model);
      
      if (!modelInfo?.pricing) {
        console.log(chalk.red(`No pricing info for ${usage.provider}/${usage.model}`));
        continue;
      }

      const inputCost = (usage.inputTokens / 1000000) * modelInfo.pricing.input;
      const outputCost = (usage.outputTokens / 1000000) * modelInfo.pricing.output;
      const cost = inputCost + outputCost;

      totalCost += cost;
      costByProvider[usage.provider] = (costByProvider[usage.provider] || 0) + cost;

      console.log(`${chalk.cyan(usage.provider.padEnd(12))} ${chalk.yellow(usage.model.padEnd(30))} ` +
                  `Input: ${usage.inputTokens.toLocaleString().padStart(7)} @ $${modelInfo.pricing?.input || 0}/M ` +
                  `Output: ${usage.outputTokens.toLocaleString().padStart(7)} @ $${modelInfo.pricing?.output || 0}/M ` +
                  `Cost: ${chalk.green('$' + cost.toFixed(4))}`);
    }

    console.log(chalk.bold('\nCost Summary:'));
    Object.entries(costByProvider).forEach(([provider, cost]) => {
      console.log(`  ${provider}: ${chalk.green('$' + cost.toFixed(4))}`);
    });
    console.log(chalk.bold(`Total Cost: ${chalk.green('$' + totalCost.toFixed(4))}`));
  }

  /**
   * Test 4: Dynamic model selection with fallbacks
   */
  async testDynamicModelFallbacks(): Promise<void> {
    console.log(chalk.bold('\n🔄 Test 4: Dynamic Model Selection with Fallbacks\n'));

    // Simulate model blacklist scenarios
    const blacklistScenarios = [
      {
        name: 'Primary model blacklisted',
        language: 'python',
        size: RepositorySizeCategory.LARGE,
        blacklistedModels: ['anthropic/claude-3-7-sonnet']
      },
      {
        name: 'Multiple models blacklisted',
        language: 'typescript',
        size: RepositorySizeCategory.MEDIUM,
        blacklistedModels: ['openai/gpt-4o', 'google/gemini-2.5-pro-preview-05-06']
      }
    ];

    for (const scenario of blacklistScenarios) {
      console.log(chalk.blue(`\nScenario: ${scenario.name}`));
      console.log(`Language: ${scenario.language}, Size: ${scenario.size}`);
      console.log(`Blacklisted: ${chalk.red(scenario.blacklistedModels.join(', '))}`);

      // Get primary selection
      const primaryModel = this.modelSelectionService.getModelForRepository(
        {
          owner: 'test',
          repo: 'test-repo',
          repoType: 'github' as RepositoryType,
          language: scenario.language,
          sizeBytes: scenario.size === RepositorySizeCategory.SMALL ? 1000000 : 50000000
        },
        AnalysisTier.COMPREHENSIVE
      );

      console.log(`Primary Selection: ${chalk.green(`${primaryModel.provider}/${primaryModel.model}`)}`);

      // Simulate fallback selection
      if (scenario.blacklistedModels.includes(`${primaryModel.provider}/${primaryModel.model}`)) {
        console.log(chalk.yellow('  ⚠️  Primary model is blacklisted, selecting fallback...'));
        
        // In real scenario, the system would select next best model
        const allModels = this.modelVersionSync.getModelsForProvider(primaryModel.provider as string);
        const fallbackModel = allModels.find(m => 
          !scenario.blacklistedModels.includes(`${m.provider}/${m.model}`)
        );

        if (fallbackModel) {
          console.log(`  Fallback Selection: ${chalk.cyan(`${fallbackModel.provider}/${fallbackModel.model}`)}`);
        } else {
          console.log(chalk.red('  ❌ No fallback available from same provider'));
        }
      }
    }
  }

  /**
   * Run all tests
   */
  async runAll(): Promise<void> {
    console.log(chalk.bold.magenta('\n🚀 Running Model Selection Test Scenarios\n'));
    
    await this.testLanguageSizeCombinations();
    await this.testResearcherActivation();
    await this.testModelCostTracking();
    await this.testDynamicModelFallbacks();
    
    console.log(chalk.bold.green('\n✅ All model selection tests completed!\n'));
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new ModelSelectionTestScenarios();
  tester.runAll().catch(error => {
    console.error(chalk.red('Test execution failed:'), error);
    process.exit(1);
  });
}