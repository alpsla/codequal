/**
 * Research Services Module
 *
 * Unified exports for all research services:
 * 1. ModelResearcherService - Discovers best AI models for code analysis
 * 2. ToolResearcherService - Fetches latest tool versions from registries
 * 3. RuleBasedToolResearcherService - Finds best tools for each rule category
 * 4. AIFixerResearcherService - Tunes AI fixer weight configurations
 *
 * All run quarterly to keep configurations up-to-date.
 *
 * Usage:
 *   # Run all research
 *   npx ts-node src/two-branch/research-services/run-quarterly-research.ts
 *
 *   # Run specific research
 *   npx ts-node run-quarterly-research.ts --tools-only
 *   npx ts-node run-quarterly-research.ts --models-only
 *   npx ts-node run-quarterly-research.ts --ai-fixer-only
 *   npx ts-node run-quarterly-research.ts --rule-tools-only
 */

export { ModelResearcherService } from './model-researcher-service';
export {
  ToolResearcherService,
  runToolResearch,
  type ToolVersion,
  type ToolRegistry,
  type VersionInfo,
} from './tool-researcher-service';
export {
  RuleBasedToolResearcherService,
  runRuleBasedToolResearch,
  type RuleToolMapping,
  type ToolResearchResult,
  type ResearchReport as RuleBasedResearchReport,
} from './rule-based-tool-researcher';
export {
  AIFixerResearcherService,
  runAIFixerResearch,
  type AIFixerWeights,
  type ModelFixerResearchResult,
  type WeightConfigResearch,
  WEIGHT_CONFIGS,
  SUPPORTED_LANGUAGES,
} from './ai-fixer-researcher';
export {
  MonthlyModelRefreshService,
  ANALYSIS_ROLE_WEIGHTS,
  META_ROLE_WEIGHTS,
  AI_FIXER_ROLE_WEIGHTS,
} from './monthly-model-refresh';

/**
 * Run all quarterly research (models + tools + rule tools + AI fixer)
 *
 * @param options.toolsOnly - Only run tool version research
 * @param options.modelsOnly - Only run model research
 * @param options.aiFixerOnly - Only run AI fixer research
 * @param options.ruleToolsOnly - Only run rule-based tool research
 */
export async function runQuarterlyResearch(options?: {
  toolsOnly?: boolean;
  modelsOnly?: boolean;
  aiFixerOnly?: boolean;
  ruleToolsOnly?: boolean;
}): Promise<void> {
  const { ModelResearcherService } = await import('./model-researcher-service');
  const { ToolResearcherService } = await import('./tool-researcher-service');
  const { RuleBasedToolResearcherService } = await import('./rule-based-tool-researcher');

  console.log('🔬 Starting Quarterly Research');
  console.log('='.repeat(80));

  // Run tool version research (existing tools)
  if (!options?.modelsOnly && !options?.aiFixerOnly && !options?.ruleToolsOnly) {
    console.log('\n🔧 Tool Version Research...');
    const toolResearcher = new ToolResearcherService();
    await toolResearcher.conductQuarterlyResearch();
  }

  // Run rule-based tool research (find best tools per rule)
  if (!options?.modelsOnly && !options?.aiFixerOnly && !options?.toolsOnly) {
    console.log('\n🔍 Rule-Based Tool Research...');
    const ruleToolResearcher = new RuleBasedToolResearcherService();
    await ruleToolResearcher.conductResearch();
  }

  // Run model research
  if (!options?.toolsOnly && !options?.aiFixerOnly && !options?.ruleToolsOnly) {
    console.log('\n🤖 AI Model Research...');
    const modelResearcher = new ModelResearcherService();
    await modelResearcher.conductQuarterlyResearch();

    // Update configurations
    await modelResearcher.updateAnalysisRoleConfigurations();
    await modelResearcher.updateMetaRoleConfigurations();
  }

  // AI fixer research (weight tuning)
  if (!options?.toolsOnly && !options?.modelsOnly && !options?.ruleToolsOnly) {
    console.log('\n🔬 AI Fixer Research...');
    // First populate AI fixer model configs
    const modelResearcher = new ModelResearcherService();
    await modelResearcher.updateAIFixerRoleConfigurations();

    // Then run weight research
    const { AIFixerResearcherService } = await import('./ai-fixer-researcher');
    const aiFixerResearcher = new AIFixerResearcherService();
    await aiFixerResearcher.conductResearch();
  }

  console.log('\n✅ Quarterly research complete!');
}
