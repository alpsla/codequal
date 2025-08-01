export interface AnalysisConfig {
  id?: string;
  userId: string;
  teamId: string;
  repoType: string;
  language: string;
  modelPreferences: ModelPreferences;
  weights: CategoryWeights;
  thresholds: SeverityThresholds;
  features: FeatureFlags;
  createdAt?: Date;
  updatedAt?: Date;
  version: string;
}

export interface ModelPreferences {
  primary: ModelSelection;
  fallback?: ModelSelection;
  researcher?: ModelSelection;
  educator?: ModelSelection;
}

export interface ModelSelection {
  provider: string;
  modelId: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CategoryWeights {
  security: number;
  performance: number;
  codeQuality: number;
  architecture: number;
  dependencies: number;
}

export interface SeverityThresholds {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface FeatureFlags {
  enableEducation: boolean;
  enableSkillTracking: boolean;
  enableDependencyAnalysis: boolean;
  enableArchitectureReview: boolean;
  enablePerformanceProfiling: boolean;
}

export interface ConfigSearchParams {
  repoType: string;
  language: string;
  teamSize?: number;
  complexity?: 'low' | 'medium' | 'high';
}

export interface IConfigProvider {
  /**
   * Retrieve configuration for a specific user and repository type
   */
  getConfig(userId: string, repoType: string): Promise<AnalysisConfig | null>;
  
  /**
   * Save a new configuration
   */
  saveConfig(config: AnalysisConfig): Promise<string>;
  
  /**
   * Update an existing configuration
   */
  updateConfig(id: string, updates: Partial<AnalysisConfig>): Promise<void>;
  
  /**
   * Delete a configuration
   */
  deleteConfig(id: string): Promise<void>;
  
  /**
   * Search for similar configurations
   */
  findSimilarConfigs(params: ConfigSearchParams): Promise<AnalysisConfig[]>;
  
  /**
   * Get default configuration for a repository type
   */
  getDefaultConfig(repoType: string): Promise<AnalysisConfig>;
}