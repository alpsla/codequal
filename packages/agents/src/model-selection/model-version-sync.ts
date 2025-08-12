import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ILogger {
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

export interface ModelVersion {
  id: string;
  provider: string;
  model: string;
  model_id?: string;
  version: string;
  versionId?: string;
  capabilities: any; // Can be string[] or object depending on usage
  contextWindow: number;
  costPerMillion: number;
  performanceScore: number;
  isActive: boolean;
  deprecated?: boolean;
  pricing?: {
    input: number;
    output: number;
  };
  metadata?: {
    status?: 'stable' | 'preview' | 'beta' | 'deprecated';
  };
}

/**
 * Synchronizes model versions and configurations
 * This is a simplified implementation for the AI Location Finder
 */
export class ModelVersionSync {
  private models: Map<string, ModelVersion> = new Map();
  
  constructor(
    private logger?: ILogger,
    private supabaseUrl?: string,
    private supabaseKey?: string
  ) {
    // Initialize with default models first
    this.initializeDefaultModels();
    
    // Then load from Supabase if credentials are available
    if (this.supabaseUrl && this.supabaseKey) {
      this.loadModelsFromSupabase().catch(error => {
        this.logger?.error('Failed to load models from Supabase, using defaults', { error });
      });
    } else {
      this.logger?.warn('Supabase credentials not provided, using default models only');
    }
  }
  
  private initializeDefaultModels() {
    // These are fallback models only used when Supabase is unavailable
    // In production, all models are selected dynamically through the unified model selector
    const defaultModels: ModelVersion[] = [
      {
        id: 'dynamic-quality',
        provider: 'dynamic',
        model: 'dynamic-quality',
        model_id: 'dynamic-quality',
        version: 'latest',
        versionId: 'latest',
        capabilities: {
          codeQuality: 9.5,
          speed: 8.5,
          contextWindow: 128000,
          reasoning: 9.0,
          multimodal: true,
          function_calling: true
        },
        pricing: {
          input: 0.0025,
          output: 0.010
        },
        contextWindow: 128000,
        costPerMillion: 2.5,
        performanceScore: 95,
        isActive: true,
        deprecated: false
      },
      {
        id: 'dynamic-balanced',
        provider: 'dynamic',
        model: 'dynamic-balanced',
        model_id: 'dynamic-balanced',
        version: 'latest',
        versionId: 'latest',
        capabilities: {
          codeQuality: 8.0,
          speed: 9.0,
          contextWindow: 128000,
          reasoning: 7.5,
          multimodal: true,
          function_calling: true
        },
        pricing: {
          input: 0.00015,
          output: 0.0006
        },
        contextWindow: 128000,
        costPerMillion: 0.15,
        performanceScore: 85,
        isActive: true,
        deprecated: false
      },
      {
        id: 'dynamic-premium',
        provider: 'dynamic',
        model: 'dynamic-premium',
        model_id: 'dynamic-premium',
        version: 'latest',
        versionId: 'latest',
        capabilities: {
          codeQuality: 9.8,
          speed: 8.0,
          contextWindow: 200000,
          reasoning: 9.5,
          multimodal: true,
          function_calling: true
        },
        pricing: {
          input: 0.003,
          output: 0.015
        },
        contextWindow: 200000,
        costPerMillion: 3.0,
        performanceScore: 98,
        isActive: true,
        deprecated: false
      }
    ];
    
    // Store models in the map
    defaultModels.forEach(model => {
      this.models.set(model.id, model);
    });
    
    this.logger?.info('Initialized default models', { count: defaultModels.length });
  }

  /**
   * Load model configurations from Supabase database
   * Reads from the model_configurations table which stores optimal models by language and size
   */
  private async loadModelsFromSupabase(): Promise<void> {
    try {
      const supabase = createClient(this.supabaseUrl!, this.supabaseKey!);
      
      // Fetch all model configurations from the database
      const { data: configurations, error } = await supabase
        .from('model_configurations')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) {
        this.logger?.error('Error fetching model configurations from Supabase', { error });
        return;
      }
      
      if (!configurations || configurations.length === 0) {
        this.logger?.info('No model configurations found in Supabase, using defaults');
        return;
      }
      
      // Process configurations and add/update models
      this.logger?.info(`Loading ${configurations.length} model configurations from Supabase`);
      
      for (const config of configurations) {
        try {
          // Create a model ID based on provider and model name
          const modelId = `${config.provider}/${config.model}`.toLowerCase().replace(/\s+/g, '-');
          
          // Parse test results if they contain performance data
          const testResults = config.test_results || {};
          const performanceScore = testResults.performance_score || 
                                   testResults.accuracy || 
                                   85; // Default score
          
          // Create or update the model version
          const modelVersion: ModelVersion = {
            id: modelId,
            provider: config.provider,
            model: config.model,
            model_id: config.model,
            version: testResults.version || 'latest',
            versionId: testResults.version || 'latest',
            capabilities: {
              language: config.language,
              size_category: config.size_category,
              ...testResults.capabilities
            },
            contextWindow: testResults.context_window || 128000,
            costPerMillion: testResults.cost_per_million || 1.0,
            performanceScore: performanceScore,
            isActive: true,
            deprecated: false,
            pricing: testResults.pricing || {
              input: testResults.cost_per_million || 1.0,
              output: (testResults.cost_per_million || 1.0) * 4
            }
          };
          
          // Store or update the model
          this.models.set(modelId, modelVersion);
          this.logger?.debug(`Loaded model configuration: ${modelId} for ${config.language}/${config.size_category}`);
        } catch (parseError) {
          this.logger?.warn(`Failed to parse configuration for ${config.language}/${config.size_category}`, { parseError });
        }
      }
      
      this.logger?.info(`Successfully loaded ${this.models.size} models from Supabase`);
      
    } catch (error) {
      this.logger?.error('Failed to connect to Supabase', { error });
      throw error;
    }
  }
  
  /**
   * Get optimal model for a specific language and size category
   * This matches the Supabase model_configurations table structure
   */
  async getModelForLanguage(language: string, sizeCategory = 'medium'): Promise<ModelVersion | undefined> {
    // First try to find a model specifically configured for this language/size
    const languageSpecificModels = Array.from(this.models.values()).filter(m => {
      const caps = m.capabilities;
      return caps && caps.language === language && caps.size_category === sizeCategory;
    });
    
    if (languageSpecificModels.length > 0) {
      // Return the best performing model for this language
      return languageSpecificModels.sort((a, b) => b.performanceScore - a.performanceScore)[0];
    }
    
    // Fallback to dynamic models based on size category
    const sizeToModel: Record<string, string> = {
      'small': 'dynamic-balanced',
      'medium': 'dynamic-quality',
      'large': 'dynamic-premium'
    };
    
    const fallbackModelId = sizeToModel[sizeCategory] || 'dynamic-quality';
    this.logger?.debug(`No specific model for ${language}/${sizeCategory}, using fallback: ${fallbackModelId}`);
    
    return this.models.get(fallbackModelId);
  }
  
  async getModel(modelId: string): Promise<ModelVersion | undefined> {
    return this.models.get(modelId);
  }
  
  async getActiveModels(): Promise<ModelVersion[]> {
    return Array.from(this.models.values()).filter(m => m.isActive);
  }
  
  async getOptimalModel(requirements: {
    contextWindow?: number;
    maxCost?: number;
    capabilities?: string[];
  }): Promise<ModelVersion | undefined> {
    const models = await this.getActiveModels();
    
    // Filter by requirements
    let candidates = models;
    
    if (requirements.contextWindow) {
      candidates = candidates.filter(m => m.contextWindow >= requirements.contextWindow!);
    }
    
    if (requirements.maxCost) {
      candidates = candidates.filter(m => m.costPerMillion <= requirements.maxCost!);
    }
    
    if (requirements.capabilities) {
      candidates = candidates.filter(m => 
        requirements.capabilities!.every(cap => m.capabilities.includes(cap))
      );
    }
    
    // Sort by performance score
    candidates.sort((a, b) => b.performanceScore - a.performanceScore);
    
    return candidates[0];
  }
  
  async updateModel(modelId: string, updates: Partial<ModelVersion>): Promise<void> {
    const model = this.models.get(modelId);
    if (model) {
      Object.assign(model, updates);
      this.logger?.info(`Updated model ${modelId}`);
    }
  }
  
  async getModelsForProvider(provider: string): Promise<ModelVersion[]> {
    const models = await this.getActiveModels();
    return models.filter(m => m.provider === provider);
  }
  
  async getAllModels(): Promise<ModelVersion[]> {
    return Array.from(this.models.values());
  }
}