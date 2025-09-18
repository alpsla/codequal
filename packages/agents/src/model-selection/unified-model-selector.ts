/**
 * Unified Model Selector stub for backward compatibility
 */

export class UnifiedModelSelector {
  constructor(config?: any) {
    console.log('UnifiedModelSelector: Legacy stub - use DynamicModelSelector instead');
  }
  
  async selectModel(context: any): Promise<any> {
    return {
      provider: 'openai',
      model: 'gpt-4',
      message: 'Use DynamicModelSelector for actual model selection'
    };
  }
}

export function createUnifiedModelSelector(config: any): UnifiedModelSelector {
  return new UnifiedModelSelector(config);
}