export interface ModelCapabilities {
  maxTokens: number;
  supportsFunctionCalling: boolean;
  supportsStreaming: boolean;
  supportsImages: boolean;
  contextWindow: number;
  languages: string[];
  specializations: string[];
}

export interface ModelPerformance {
  averageLatency: number;
  successRate: number;
  costPer1kTokens: number;
  qualityScore: number;
  lastBenchmark: Date;
}

export interface ModelInfo {
  id: string;
  provider: string;
  name: string;
  version: string;
  capabilities: ModelCapabilities;
  performance: ModelPerformance;
  status: 'active' | 'deprecated' | 'beta' | 'unavailable';
  recommendedFor: string[];
  notRecommendedFor: string[];
  defaultTemperature: number;
  defaultMaxTokens: number;
}

export interface ModelSelectionCriteria {
  taskType: 'security' | 'performance' | 'architecture' | 'general';
  codeComplexity: 'low' | 'medium' | 'high';
  responseTime: 'fast' | 'standard' | 'thorough';
  language: string;
  prSize: 'small' | 'medium' | 'large';
  budgetConstraint?: number;
}

export interface ModelRecommendation {
  primary: ModelInfo;
  fallback?: ModelInfo;
  reasoning: string;
  estimatedCost: number;
  estimatedDuration: number;
  confidence: number;
}

export interface ModelUsageStats {
  modelId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  totalCost: number;
  averageQualityScore: number;
  period: Date;
}

export interface IModelRegistry {
  /**
   * Get all available models
   */
  getAllModels(): Promise<ModelInfo[]>;
  
  /**
   * Get specific model info
   */
  getModel(modelId: string): Promise<ModelInfo | null>;
  
  /**
   * Get models by provider
   */
  getModelsByProvider(provider: string): Promise<ModelInfo[]>;
  
  /**
   * Recommend best model for criteria
   */
  recommendModel(criteria: ModelSelectionCriteria): Promise<ModelRecommendation>;
  
  /**
   * Update model performance metrics
   */
  updateModelPerformance(modelId: string, metrics: Partial<ModelPerformance>): Promise<void>;
  
  /**
   * Register new model
   */
  registerModel(model: ModelInfo): Promise<void>;
  
  /**
   * Update model status
   */
  updateModelStatus(modelId: string, status: ModelInfo['status']): Promise<void>;
  
  /**
   * Get usage statistics
   */
  getUsageStats(modelId: string, startDate: Date, endDate: Date): Promise<ModelUsageStats>;
  
  /**
   * Benchmark models
   */
  benchmarkModels(taskType: string): Promise<Map<string, ModelPerformance>>;
  
  /**
   * Get cost estimates
   */
  estimateCost(modelId: string, estimatedTokens: number): Promise<number>;
}