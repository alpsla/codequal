/**
 * Model Configuration Seed Data
 * 
 * This file provides initial seed data for the model configurations table
 * based on our testing results. This should be executed after the migrations.
 */

import { RepositoryModelConfig, RepositorySizeCategory, TestingStatus } from '../repository-model-config';

/**
 * Seed data for model configurations
 */
export const MODEL_CONFIG_SEED_DATA: {
  language: string;
  sizeCategory: RepositorySizeCategory;
  config: RepositoryModelConfig;
}[] = [
  // Python configurations
  {
    language: 'python',
    sizeCategory: 'small',
    config: {
      provider: 'openai',
      model: 'gpt-4o',
      testResults: {
        status: TestingStatus.TESTED,
        avgResponseTime: 2.0,
        avgResponseSize: 1066,
        qualityScore: 7.5,
        testCount: 5,
        lastTested: '2025-05-13'
      },
      notes: 'Fastest for small repositories with good quality'
    }
  },
  {
    language: 'python',
    sizeCategory: 'medium',
    config: {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      testResults: {
        status: TestingStatus.TESTED,
        avgResponseTime: 3.0,
        avgResponseSize: 1883,
        qualityScore: 9.0,
        testCount: 5,
        lastTested: '2025-05-13'
      },
      notes: 'Most detailed responses for Python with excellent context understanding'
    }
  },
  {
    language: 'python',
    sizeCategory: 'large',
    config: {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      testResults: {
        status: TestingStatus.TESTED,
        avgResponseTime: 3.5,
        avgResponseSize: 2032,
        qualityScore: 9.0,
        testCount: 3,
        lastTested: '2025-05-13'
      },
      notes: 'Most comprehensive analysis for large Python codebases'
    }
  },
  
  // JavaScript configurations
  {
    language: 'javascript',
    sizeCategory: 'small',
    config: {
      provider: 'openai',
      model: 'gpt-4o',
      testResults: {
        status: TestingStatus.TESTED,
        avgResponseTime: 2.1,
        avgResponseSize: 1234,
        qualityScore: 7.8,
        testCount: 5,
        lastTested: '2025-05-13'
      },
      notes: 'Good balance of speed and quality for JS'
    }
  },
  {
    language: 'javascript',
    sizeCategory: 'medium',
    config: {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      testResults: {
        status: TestingStatus.TESTED,
        avgResponseTime: 4.0,
        avgResponseSize: 3051,
        qualityScore: 9.2,
        testCount: 5,
        lastTested: '2025-05-13'
      },
      notes: 'Excels at JavaScript analysis with significantly more detailed responses'
    }
  },
  {
    language: 'javascript',
    sizeCategory: 'large',
    config: {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      testResults: {
        status: TestingStatus.TESTED,
        avgResponseTime: 4.5,
        avgResponseSize: 2950,
        qualityScore: 9.0,
        testCount: 3,
        lastTested: '2025-05-13'
      },
      notes: 'Best understanding of complex JavaScript architectures'
    }
  },
  
  // TypeScript configurations
  {
    language: 'typescript',
    sizeCategory: 'small',
    config: {
      provider: 'openai',
      model: 'gpt-4o',
      testResults: {
        status: TestingStatus.TESTED,
        avgResponseTime: 2.0,
        avgResponseSize: 1078,
        qualityScore: 8.0,
        testCount: 5,
        lastTested: '2025-05-13'
      },
      notes: 'Fast analysis with good type awareness'
    }
  },
  {
    language: 'typescript',
    sizeCategory: 'medium',
    config: {
      provider: 'google',
      model: 'gemini-2.5-pro-preview-05-06',
      testResults: {
        status: TestingStatus.TESTED,
        avgResponseTime: 2.0,
        avgResponseSize: 1214,
        qualityScore: 8.5,
        testCount: 5,
        lastTested: '2025-05-13'
      },
      notes: 'Strong TypeScript understanding with balanced detail level'
    }
  },
  {
    language: 'typescript',
    sizeCategory: 'large',
    config: {
      provider: 'google',
      model: 'gemini-2.5-pro-preview-05-06',
      testResults: {
        status: TestingStatus.TESTED,
        avgResponseTime: 2.0,
        avgResponseSize: 1350,
        qualityScore: 8.8,
        testCount: 3,
        lastTested: '2025-05-13'
      },
      notes: 'Excellent for large TypeScript repositories, especially with complex type systems'
    }
  },
  
  // Default configurations
  {
    language: 'default',
    sizeCategory: 'small',
    config: {
      provider: 'openai',
      model: 'gpt-4o',
      testResults: {
        status: TestingStatus.TESTED,
        avgResponseTime: 2.3,
        avgResponseSize: 1298,
        qualityScore: 7.5,
        testCount: 15,
        lastTested: '2025-05-13'
      },
      notes: 'Best overall for small repositories regardless of language'
    }
  },
  {
    language: 'default',
    sizeCategory: 'medium',
    config: {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      testResults: {
        status: TestingStatus.TESTED,
        avgResponseTime: 3.3,
        avgResponseSize: 2032,
        qualityScore: 8.8,
        testCount: 15,
        lastTested: '2025-05-13'
      },
      notes: 'Most detailed overall for medium repositories'
    }
  },
  {
    language: 'default',
    sizeCategory: 'large',
    config: {
      provider: 'google',
      model: 'gemini-2.5-pro-preview-05-06',
      testResults: {
        status: TestingStatus.TESTED,
        avgResponseTime: 2.7,
        avgResponseSize: 1768,
        qualityScore: 8.2,
        testCount: 10,
        lastTested: '2025-05-13'
      },
      notes: 'Good balance of speed and detail for large repositories'
    }
  }
];

/**
 * Helper function to get a seed data runner
 * @param supabase Supabase client
 * @returns Seed data runner function
 */
export function getModelConfigSeedRunner(supabase: any) {
  return async function runSeed() {
    try {
      // Prepare seed data records
      const records = MODEL_CONFIG_SEED_DATA.map(({ language, sizeCategory, config }) => ({
        language,
        size_category: sizeCategory,
        provider: config.provider,
        model: config.model,
        test_results: config.testResults,
        notes: config.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      // Insert seed data
      const { error } = await supabase
        .from('model_configurations')
        .upsert(records, { onConflict: 'language,size_category' });
      
      if (error) {
        console.error('Seed data error:', error);
        return { success: false, error };
      }
      
      return { success: true, count: records.length };
    } catch (error) {
      console.error('Unexpected seed data error:', error);
      return { success: false, error };
    }
  };
}
