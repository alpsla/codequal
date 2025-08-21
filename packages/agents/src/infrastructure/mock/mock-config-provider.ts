/**
 * Mock implementation of IConfigProvider for testing
 */

import { 
  IConfigProvider, 
  AnalysisConfig, 
  ModelSelection 
} from '../../standard/orchestrator/interfaces/config-provider.interface';

export class MockConfigProvider implements IConfigProvider {
  private configs: Map<string, AnalysisConfig> = new Map();
  
  async getConfig(userId: string, repoType?: string): Promise<AnalysisConfig | null> {
    const key = `${userId}-${repoType || 'default'}`;
    const config = this.configs.get(key);
    if (config) return config;
    
    const defaultConfig = await this.getDefaultConfig(repoType || 'default');
    defaultConfig.userId = userId;
    return defaultConfig;
  }
  
  async saveConfig(config: AnalysisConfig): Promise<string> {
    const key = `${config.userId}-${config.repoType}`;
    this.configs.set(key, config);
    return config.id || `config-${Date.now()}`;
  }
  
  async updateWeights(
    userId: string, 
    teamId: string, 
    weights: any
  ): Promise<void> {
    const config = await this.getConfig(userId);
    if (config) {
      config.weights = weights;
      await this.saveConfig(config);
    }
  }
  
  async findSimilarConfigs(criteria: {
    repoType?: string;
    language?: string;
    complexity?: string;
  }): Promise<AnalysisConfig[]> {
    const results: AnalysisConfig[] = [];
    
    // Return a default config for testing
    if (criteria.language === 'typescript') {
      const config = await this.getDefaultConfig(criteria.repoType || 'default');
      config.userId = 'similar-user';
      results.push(config);
    }
    
    return results;
  }
  
  async getModelSelection(
    taskType: string,
    constraints?: any
  ): Promise<ModelSelection> {
    // Return dynamic model based on task type
    // In real tests, this should connect to ModelConfigResolver
    return {
      provider: 'dynamic',
      modelId: 'mock-dynamic-model',
      temperature: 0.3,
      maxTokens: 4000
    };
  }
  
  async updateConfig(configId: string, updates: Partial<AnalysisConfig>): Promise<void> {
    const configs = Array.from(this.configs.values());
    const config = configs.find(c => c.id === configId);
    if (config) {
      Object.assign(config, updates);
      await this.saveConfig(config);
    }
  }
  
  async deleteConfig(configId: string): Promise<void> {
    const configs = Array.from(this.configs.entries());
    const entry = configs.find(([_, c]) => c.id === configId);
    if (entry) {
      this.configs.delete(entry[0]);
    }
  }
  
  async getDefaultConfig(repoType: string): Promise<AnalysisConfig> {
    return {
      id: `config-${Date.now()}`,
      userId: 'default-user',
      teamId: 'test-team',
      repoType: 'node-fullstack',
      language: 'typescript',
      modelPreferences: {
        primary: {
          provider: 'dynamic',
          modelId: 'mock-primary-model',
          temperature: 0.3,
          maxTokens: 4000
        },
        fallback: {
          provider: 'dynamic',
          modelId: 'mock-fallback-model',
          temperature: 0.3,
          maxTokens: 4000
        }
      },
      weights: {
        security: 0.25,
        performance: 0.20,
        codeQuality: 0.25,
        architecture: 0.20,
        dependencies: 0.10
      },
      thresholds: {
        critical: 90,
        high: 70,
        medium: 50,
        low: 30
      },
      features: {
        enableEducation: false,
        enableSkillTracking: true,
        enableDependencyAnalysis: true,
        enableArchitectureReview: true,
        enablePerformanceProfiling: true
      },
      version: '1.0',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}