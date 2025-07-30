/**
 * Model Configuration Store
 * 
 * This service manages loading, saving, and updating model configurations
 * for repository analyses. It works with Supabase to store and retrieve
 * configuration data, including calibration results.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  RepositoryModelConfig, 
  RepositorySizeCategory, 
  TestingStatus,
  RepositoryProvider
} from '../../config/models/repository-model-config';
import { CalibrationTestResult } from './RepositoryCalibrationService';
import { Logger } from '../../utils/logger';

/**
 * Interface for the model configuration database table
 */
interface ModelConfigRecord {
  id: string;
  language: string;
  size_category: string;
  provider: string;
  model: string;
  test_results: {
    status: string;
    avgResponseTime: number;
    avgResponseSize: number;
    qualityScore?: number;
    testCount: number;
    lastTested: string;
    pricing?: {
      input: number;
      output: number;
    };
  };
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for calibration results database table
 */
interface _CalibrationResultRecord {
  id: string;
  language: string;
  size_category: string;
  results: Record<string, CalibrationTestResult[]>;
  created_at: string;
}

/**
 * Service for storing and retrieving model configurations
 */
export class ModelConfigStore {
  /**
   * Supabase client
   */
  private supabase: SupabaseClient;
  
  /**
   * Constructor
   * @param logger Logger instance
   * @param supabaseUrl Supabase URL
   * @param supabaseKey Supabase API key
   */
  constructor(
    private logger: Logger,
    private supabaseUrl: string,
    private supabaseKey: string
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger.info('ModelConfigStore initialized');
  }
  
  /**
   * Initialize the store
   * Verifies connection to the database and table existence
   * 
   * @returns Promise that resolves when initialized
   */
  async init(): Promise<void> {
    try {
      // Verify connection by testing a simple query
      const { error } = await this.supabase
        .from('model_configurations')
        .select('id')
        .limit(1);
      
      if (error) {
        this.logger.error('Error initializing ModelConfigStore', { error });
        throw new Error(`Failed to initialize ModelConfigStore: ${error.message}`);
      }
      
      this.logger.info('ModelConfigStore initialized successfully', {
        connectedToDatabase: true,
        tablesAvailable: true
      });
    } catch (error) {
      this.logger.error('Unexpected error initializing ModelConfigStore', { error });
      throw new Error(`Failed to initialize ModelConfigStore: ${error}`);
    }
  }
  
  /**
   * Get model configuration for a language and size category
   * 
   * @param language Repository language
   * @param sizeCategory Repository size category
   * @returns Model configuration or null if not found
   */
  async getModelConfig(
    language: string,
    sizeCategory: RepositorySizeCategory
  ): Promise<RepositoryModelConfig | null> {
    try {
      // Normalize language
      const normalizedLang = language.toLowerCase();
      
      // Query database for configuration
      const { data, error } = await this.supabase
        .from('model_configurations')
        .select('*')
        .eq('language', normalizedLang)
        .eq('size_category', sizeCategory)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (error) {
        this.logger.error('Error getting model configuration', { 
          language: normalizedLang, 
          sizeCategory, 
          error 
        });
        return null;
      }
      
      if (!data || data.length === 0) {
        this.logger.info('No model configuration found', { 
          language: normalizedLang, 
          sizeCategory 
        });
        return null;
      }
      
      // Convert database record to model configuration
      const record = data[0] as ModelConfigRecord;
      
      return {
        id: record.id,
        repository_url: '',
        repository_name: '',
        provider: record.provider as RepositoryProvider,
        primary_language: normalizedLang,
        languages: [normalizedLang],
        size_category: sizeCategory,
        framework_stack: [],
        complexity_score: 0.5,
        model: record.model,
        testResults: {
          status: record.test_results.status as TestingStatus,
          avgResponseTime: record.test_results.avgResponseTime,
          avgResponseSize: record.test_results.avgResponseSize,
          qualityScore: record.test_results.qualityScore,
          testCount: record.test_results.testCount,
          lastTested: record.test_results.lastTested,
          pricing: record.test_results.pricing
        },
        notes: record.notes,
        optimal_models: {},
        testing_status: record.test_results.status as TestingStatus,
        last_calibration: record.test_results.lastTested,
        created_at: record.created_at,
        updated_at: record.updated_at
      };
    } catch (error) {
      this.logger.error('Unexpected error getting model configuration', { 
        language, 
        sizeCategory, 
        error 
      });
      return null;
    }
  }
  
  /**
   * Update model configuration for a language and size category
   * 
   * @param language Repository language
   * @param sizeCategory Repository size category
   * @param config Model configuration
   * @returns Whether the update was successful
   */
  async updateModelConfig(
    language: string,
    sizeCategory: RepositorySizeCategory,
    config: RepositoryModelConfig
  ): Promise<boolean> {
    try {
      // Normalize language
      const normalizedLang = language.toLowerCase();
      
      // Check if configuration exists
      const { data: existingData } = await this.supabase
        .from('model_configurations')
        .select('id')
        .eq('language', normalizedLang)
        .eq('size_category', sizeCategory)
        .limit(1);
      
      const configRecord = {
        language: normalizedLang,
        size_category: sizeCategory,
        provider: config.provider,
        model: config.model,
        test_results: config.testResults,
        notes: config.notes,
        updated_at: new Date().toISOString()
      };
      
      let result;
      
      if (existingData && existingData.length > 0) {
        // Update existing record
        result = await this.supabase
          .from('model_configurations')
          .update(configRecord)
          .eq('id', existingData[0].id);
      } else {
        // Insert new record
        result = await this.supabase
          .from('model_configurations')
          .insert({
            ...configRecord,
            created_at: new Date().toISOString()
          });
      }
      
      if (result.error) {
        this.logger.error('Error updating model configuration', { 
          language: normalizedLang, 
          sizeCategory, 
          error: result.error 
        });
        return false;
      }
      
      this.logger.info('Updated model configuration', { 
        language: normalizedLang, 
        sizeCategory,
        provider: config.provider,
        model: config.model
      });
      
      return true;
    } catch (error) {
      this.logger.error('Unexpected error updating model configuration', { 
        language, 
        sizeCategory, 
        error 
      });
      return false;
    }
  }
  
  /**
   * Store calibration results for a language and size category
   * 
   * @param language Repository language
   * @param sizeCategory Repository size category
   * @param results Calibration results
   * @returns Whether the storage was successful
   */
  async storeCalibrationResults(
    language: string,
    sizeCategory: RepositorySizeCategory,
    results: Record<string, CalibrationTestResult[]>
  ): Promise<boolean> {
    try {
      // Normalize language
      const normalizedLang = language.toLowerCase();
      
      this.logger.info('Storing calibration results in database', { 
        language: normalizedLang, 
        sizeCategory,
        resultCount: Object.keys(results).length
      });
      
      // Check if an entry already exists for this language and size
      const { data: existingData } = await this.supabase
        .from('calibration_results')
        .select('id')
        .eq('language', normalizedLang)
        .eq('size_category', sizeCategory)
        .limit(1);
        
      let result;
      
      if (existingData && existingData.length > 0) {
        // Update existing calibration result
        result = await this.supabase
          .from('calibration_results')
          .update({
            results,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData[0].id);
      } else {
        // Insert new calibration result
        result = await this.supabase
          .from('calibration_results')
          .insert({
            language: normalizedLang,
            size_category: sizeCategory,
            results,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
      
      if (result.error) {
        this.logger.error('Error storing calibration results', { 
          language: normalizedLang, 
          sizeCategory, 
          error: result.error 
        });
        return false;
      }
      
      this.logger.info('Successfully stored calibration results', {
        language: normalizedLang,
        sizeCategory,
        resultCount: Object.keys(results).length
      });
      
      return true;
    } catch (error) {
      this.logger.error('Unexpected error storing calibration results', { 
        language, 
        sizeCategory, 
        error 
      });
      return false;
    }
  }
  
  /**
   * Get the most recent calibration results for a language and size category
   * 
   * @param language Repository language
   * @param sizeCategory Repository size category
   * @returns Calibration results or null if not found
   */
  async getCalibrationResults(
    language: string,
    sizeCategory: RepositorySizeCategory
  ): Promise<Record<string, CalibrationTestResult[]> | null> {
    try {
      // Normalize language
      const normalizedLang = language.toLowerCase();
      
      // Query database for calibration results
      const { data, error } = await this.supabase
        .from('calibration_results')
        .select('results')
        .eq('language', normalizedLang)
        .eq('size_category', sizeCategory)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        this.logger.error('Error getting calibration results', { 
          language: normalizedLang, 
          sizeCategory, 
          error 
        });
        return null;
      }
      
      if (!data || data.length === 0) {
        this.logger.info('No calibration results found', { 
          language: normalizedLang, 
          sizeCategory 
        });
        return null;
      }
      
      return data[0].results;
    } catch (error) {
      this.logger.error('Unexpected error getting calibration results', { 
        language, 
        sizeCategory, 
        error 
      });
      return null;
    }
  }
  
  /**
   * Get all stored model configurations
   * 
   * @returns Record of language/size to model configurations
   */
  async getAllModelConfigs(): Promise<Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>>> {
    try {
      // Query database for all configurations
      const { data, error } = await this.supabase
        .from('model_configurations')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) {
        this.logger.error('Error getting all model configurations', { error });
        return {};
      }
      
      if (!data || data.length === 0) {
        this.logger.info('No model configurations found');
        return {};
      }
      
      // Organize configurations by language and size
      const configs: Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>> = {};
      
      for (const record of data as ModelConfigRecord[]) {
        const language = record.language;
        const sizeCategory = record.size_category as RepositorySizeCategory;
        
        // Initialize language entry if it doesn't exist
        if (!configs[language]) {
          configs[language] = {} as Record<RepositorySizeCategory, RepositoryModelConfig>;
        }
        
        // Add configuration
        configs[language][sizeCategory] = {
          id: record.id,
          repository_url: '',
          repository_name: '',
          provider: record.provider as RepositoryProvider,
          primary_language: language,
          languages: [language],
          size_category: sizeCategory,
          framework_stack: [],
          complexity_score: 0.5,
          model: record.model,
          testResults: {
            status: record.test_results.status as TestingStatus,
            avgResponseTime: record.test_results.avgResponseTime,
            avgResponseSize: record.test_results.avgResponseSize,
            qualityScore: record.test_results.qualityScore,
            testCount: record.test_results.testCount,
            lastTested: record.test_results.lastTested,
            pricing: record.test_results.pricing
          },
          notes: record.notes,
          optimal_models: {},
          testing_status: record.test_results.status as TestingStatus,
          last_calibration: record.test_results.lastTested,
          created_at: record.created_at,
          updated_at: record.updated_at
        };
      }
      
      return configs;
    } catch (error) {
      this.logger.error('Unexpected error getting all model configurations', { error });
      return {};
    }
  }
  
  /**
   * Store a validated model directly in the database
   * This is used by the Researcher agent after validating model names with OpenRouter
   * 
   * @param provider Model provider  
   * @param model Model name (validated)
   * @param language Repository language
   * @param sizeCategory Repository size category
   * @param notes Optional notes about the model
   * @returns Whether the storage was successful
   */
  async storeValidatedModel(
    provider: string,
    model: string,
    language: string,
    sizeCategory: RepositorySizeCategory,
    notes?: string
  ): Promise<boolean> {
    try {
      const normalizedLang = language.toLowerCase();
      
      // Check if configuration already exists
      const { data: existingData } = await this.supabase
        .from('model_configurations')
        .select('id')
        .eq('language', normalizedLang)
        .eq('size_category', sizeCategory)
        .limit(1);
      
      const configRecord = {
        language: normalizedLang,
        size_category: sizeCategory,
        provider: provider,
        model: model,
        test_results: {
          status: 'not_tested',
          avgResponseTime: 0,
          avgResponseSize: 0,
          testCount: 0,
          lastTested: new Date().toISOString()
        },
        notes: notes || `Model validated and stored by Researcher agent`,
        updated_at: new Date().toISOString()
      };
      
      let result;
      
      if (existingData && existingData.length > 0) {
        // Update existing record
        result = await this.supabase
          .from('model_configurations')
          .update(configRecord)
          .eq('id', existingData[0].id);
      } else {
        // Insert new record
        result = await this.supabase
          .from('model_configurations')
          .insert({
            ...configRecord,
            created_at: new Date().toISOString()
          });
      }
      
      if (result.error) {
        this.logger.error('Error storing validated model', { 
          provider,
          model,
          language: normalizedLang, 
          sizeCategory, 
          error: result.error 
        });
        return false;
      }
      
      this.logger.info('Stored validated model', { 
        provider,
        model,
        language: normalizedLang, 
        sizeCategory
      });
      
      return true;
    } catch (error) {
      this.logger.error('Unexpected error storing validated model', { 
        provider,
        model,
        language, 
        sizeCategory, 
        error 
      });
      return false;
    }
  }
  
  /**
   * Sync database configurations with in-memory configurations
   * 
   * @param configMap In-memory configuration map to update
   * @returns Updated configuration map
   */
  async syncConfigurations(
    configMap: Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>>
  ): Promise<Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>>> {
    try {
      // Get all configurations from database
      const dbConfigs = await this.getAllModelConfigs();
      
      // Merge database configurations with in-memory configurations
      // Database configurations take precedence
      const mergedConfigs = { ...configMap };
      
      for (const [language, sizeConfigs] of Object.entries(dbConfigs)) {
        if (!mergedConfigs[language]) {
          mergedConfigs[language] = {} as Record<RepositorySizeCategory, RepositoryModelConfig>;
        }
        
        for (const [sizeCategory, config] of Object.entries(sizeConfigs)) {
          mergedConfigs[language][sizeCategory as RepositorySizeCategory] = config;
        }
      }
      
      this.logger.info('Synced configurations', { 
        languageCount: Object.keys(mergedConfigs).length 
      });
      
      return mergedConfigs;
    } catch (error) {
      this.logger.error('Error syncing configurations', { error });
      return configMap;
    }
  }
}
