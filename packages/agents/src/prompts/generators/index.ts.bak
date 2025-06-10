/**
 * Prompt Generators - Modular architecture for generating AI research prompts
 * 
 * This module provides a flexible, updateable system for generating researcher prompts
 * that can be easily modified during calibration and future improvements.
 */

import { 
  ResearcherPromptGenerator as ResearcherPromptGeneratorClass,
  type ResearchContext,
  type PromptGeneratorConfig,
  type GeneratedPrompt
} from './researcher-prompt-generator';

import {
  LoopPromptGenerator as LoopPromptGeneratorClass,
  type LoopContext,
  type LoopBatch
} from './loop-prompt-generator';

export {
  ResearcherPromptGeneratorClass as ResearcherPromptGenerator,
  type ResearchContext,
  type PromptGeneratorConfig,
  type GeneratedPrompt
};

export {
  LoopPromptGeneratorClass as LoopPromptGenerator,
  type LoopContext,
  type LoopBatch
};

/**
 * Factory function to create prompt generators with common configuration
 */
export function createPromptGenerators(logger: any, config: any = {}) {
  const researcherGenerator = new ResearcherPromptGeneratorClass(logger, config);
  const loopGenerator = new LoopPromptGeneratorClass(logger, config);
  
  return {
    researcher: researcherGenerator,
    loop: loopGenerator
  };
}