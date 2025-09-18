/**
 * Model-related types to replace @codequal/core/services/model-selection
 */

export interface ModelVersionInfo {
  id: string;
  provider: string;
  model: string;
  version?: string;
  tier?: ModelTier;
  capabilities?: ModelCapabilities;
  pricing?: ModelPricing;
  contextWindow?: number;
  releaseDate?: string;
}

export enum ModelTier {
  PREMIUM = 'premium',
  STANDARD = 'standard',
  BUDGET = 'budget',
  FREE = 'free'
}

export interface ModelCapabilities {
  supportsFunctionCalling?: boolean;
  supportsVision?: boolean;
  supportsStreaming?: boolean;
  maxTokens?: number;
  languages?: string[];
}

export interface ModelPricing {
  input: number;  // Cost per 1K tokens
  output: number; // Cost per 1K tokens
  currency?: string;
}

export class ModelVersionSync {
  constructor(
    private logger: any,
    private supabaseUrl?: string,
    private supabaseKey?: string
  ) {}
  
  async getModelVersion(provider: string, model: string): Promise<ModelVersionInfo | null> {
    // Stub implementation
    return {
      id: `${provider}/${model}`,
      provider,
      model,
      tier: ModelTier.STANDARD,
      capabilities: {
        supportsFunctionCalling: true,
        supportsStreaming: true,
        maxTokens: 4096
      },
      pricing: {
        input: 0.01,
        output: 0.02
      }
    };
  }
  
  async updateModelVersion(info: ModelVersionInfo): Promise<void> {
    console.log('Model version updated:', info);
  }
  
  getCanonicalVersion(modelId: string): string {
    // Extract canonical version from model ID (e.g., "claude-3.5-sonnet" -> "3.5")
    const versionMatch = modelId.match(/(\d+(?:\.\d+)?)/);
    return versionMatch ? versionMatch[1] : '1.0';
  }
}

export interface ModelProviderPlugin {
  name: string;
  provider: string;
  initialize(): Promise<void>;
  getModels(): Promise<ModelVersionInfo[]>;
}