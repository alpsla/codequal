/**
 * Repository Model Configuration
 * 
 * This file defines the optimal model configurations for different repository languages
 * and sizes based on comprehensive testing results. It provides a mapping of repository
 * contexts to the most effective models for detailed analysis while maintaining good
 * performance.
 * 
 * This configuration is used by both DeepWiki integration and other components that
 * need to select optimal models for specific repository contexts.
 */

import { ModelConfig } from '../../deepwiki/DeepWikiClient';

/**
 * Repository size categories
 */
export type RepositorySizeCategory = 'small' | 'medium' | 'large';

/**
 * Provider types available for repository analysis
 */
export type RepositoryProvider = 
  | 'openai' 
  | 'google' 
  | 'anthropic' 
  | 'deepseek' 
  | 'openrouter';

/**
 * Configuration for testing status of language-model combinations
 */
export enum TestingStatus {
  TESTED = 'tested',       // Fully tested with comprehensive metrics
  PARTIAL = 'partial',     // Limited testing completed
  UNTESTED = 'untested',   // No testing completed
  PLANNED = 'planned'      // Testing planned in upcoming test runs
}

/**
 * Model test results for a specific language and size
 */
export interface ModelTestResults {
  avgResponseTime: number; // Average response time in seconds
  avgResponseSize: number; // Average response size in bytes
  qualityScore?: number;   // Optional subjective quality score (1-10)
  testCount: number;       // Number of tests conducted
  lastTested: string;      // ISO date string of last test
  status: TestingStatus;   // Current testing status
}

/**
 * Full model configuration for a repository context
 */
export interface RepositoryModelConfig<T extends RepositoryProvider = RepositoryProvider> 
  extends ModelConfig<T> {
  testResults?: ModelTestResults;
  notes?: string;
}

/**
 * Complete model configuration mapping for all supported languages and sizes
 */
export const REPOSITORY_MODEL_CONFIGS: Record<
  string, 
  Record<RepositorySizeCategory, RepositoryModelConfig>
> = {
  // Based on comprehensive testing results from May 13, 2025
  'python': {
    'small': {
      provider: 'openai',
      model: 'gpt-4o',
      testResults: {
        avgResponseTime: 2.0,
        avgResponseSize: 1066,
        qualityScore: 7.5,
        testCount: 5,
        lastTested: '2025-05-13',
        status: TestingStatus.TESTED
      },
      notes: 'Fastest for small repositories with good quality'
    },
    'medium': {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      testResults: {
        avgResponseTime: 3.0,
        avgResponseSize: 1883,
        qualityScore: 9.0,
        testCount: 5,
        lastTested: '2025-05-13',
        status: TestingStatus.TESTED
      },
      notes: 'Most detailed responses for Python with excellent context understanding'
    },
    'large': {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      testResults: {
        avgResponseTime: 3.5,
        avgResponseSize: 2032,
        qualityScore: 9.0,
        testCount: 3,
        lastTested: '2025-05-13',
        status: TestingStatus.TESTED
      },
      notes: 'Most comprehensive analysis for large Python codebases'
    }
  },
  'javascript': {
    'small': {
      provider: 'openai',
      model: 'gpt-4o',
      testResults: {
        avgResponseTime: 2.1,
        avgResponseSize: 1234,
        qualityScore: 7.8,
        testCount: 5,
        lastTested: '2025-05-13',
        status: TestingStatus.TESTED
      },
      notes: 'Good balance of speed and quality for JS'
    },
    'medium': {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      testResults: {
        avgResponseTime: 4.0,
        avgResponseSize: 3051,
        qualityScore: 9.2,
        testCount: 5,
        lastTested: '2025-05-13',
        status: TestingStatus.TESTED
      },
      notes: 'Excels at JavaScript analysis with significantly more detailed responses'
    },
    'large': {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      testResults: {
        avgResponseTime: 4.5,
        avgResponseSize: 2950,
        qualityScore: 9.0,
        testCount: 3,
        lastTested: '2025-05-13',
        status: TestingStatus.TESTED
      },
      notes: 'Best understanding of complex JavaScript architectures'
    }
  },
  'typescript': {
    'small': {
      provider: 'openai',
      model: 'gpt-4o',
      testResults: {
        avgResponseTime: 2.0,
        avgResponseSize: 1078,
        qualityScore: 8.0,
        testCount: 5,
        lastTested: '2025-05-13',
        status: TestingStatus.TESTED
      },
      notes: 'Fast analysis with good type awareness'
    },
    'medium': {
      provider: 'google',
      model: 'gemini-2.5-pro-preview-05-06',
      testResults: {
        avgResponseTime: 2.0,
        avgResponseSize: 1214,
        qualityScore: 8.5,
        testCount: 5,
        lastTested: '2025-05-13',
        status: TestingStatus.TESTED
      },
      notes: 'Strong TypeScript understanding with balanced detail level'
    },
    'large': {
      provider: 'google',
      model: 'gemini-2.5-pro-preview-05-06',
      testResults: {
        avgResponseTime: 2.0,
        avgResponseSize: 1350,
        qualityScore: 8.8,
        testCount: 3,
        lastTested: '2025-05-13',
        status: TestingStatus.TESTED
      },
      notes: 'Excellent for large TypeScript repositories, especially with complex type systems'
    }
  },
  // Additional languages that need more testing but have initial configurations
  'java': {
    'small': {
      provider: 'openai',
      model: 'gpt-4o',
      testResults: {
        status: TestingStatus.PLANNED,
        avgResponseTime: 0,
        avgResponseSize: 0,
        testCount: 0,
        lastTested: '2025-05-10',
      },
      notes: 'Testing planned with spring-boot and small Java projects'
    },
    'medium': {
      provider: 'deepseek',
      model: 'deepseek-coder-plus',
      testResults: {
        status: TestingStatus.PLANNED,
        avgResponseTime: 0,
        avgResponseSize: 0,
        testCount: 0,
        lastTested: '2025-05-10',
      },
      notes: 'DeepSeek has shown promising early results with Java in agent tests'
    },
    'large': {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      testResults: {
        status: TestingStatus.PLANNED,
        avgResponseTime: 0,
        avgResponseSize: 0,
        testCount: 0,
        lastTested: '2025-05-10',
      },
      notes: 'Initial testing suggests good handling of large Java repositories'
    }
  },
  'csharp': {
    'small': {
      provider: 'openai',
      model: 'gpt-4o',
      testResults: {
        status: TestingStatus.PLANNED,
        avgResponseTime: 0,
        avgResponseSize: 0,
        testCount: 0,
        lastTested: '2025-05-10',
      },
      notes: 'High priority for testing with .NET Core repositories'
    },
    'medium': {
      provider: 'deepseek',
      model: 'deepseek-coder-plus',
      testResults: {
        status: TestingStatus.PLANNED,
        avgResponseTime: 0,
        avgResponseSize: 0,
        testCount: 0,
        lastTested: '2025-05-10',
      },
      notes: 'Initial agent tests show promising results for C#'
    },
    'large': {
      provider: 'google',
      model: 'gemini-2.5-pro-preview-05-06',
      testResults: {
        status: TestingStatus.PLANNED,
        avgResponseTime: 0,
        avgResponseSize: 0,
        testCount: 0,
        lastTested: '2025-05-10',
      },
      notes: 'Target for future testing with large .NET solutions'
    }
  },
  'go': {
    'small': {
      provider: 'openai',
      model: 'gpt-4o',
      testResults: {
        status: TestingStatus.PARTIAL,
        avgResponseTime: 2.1,
        avgResponseSize: 980,
        testCount: 2,
        lastTested: '2025-05-10',
      },
      notes: 'Limited testing shows good quality, needs more comprehensive tests'
    },
    'medium': {
      provider: 'deepseek',
      model: 'deepseek-coder-plus',
      testResults: {
        status: TestingStatus.PLANNED,
        avgResponseTime: 0,
        avgResponseSize: 0,
        testCount: 0,
        lastTested: '2025-05-10',
      },
      notes: 'Test priority high - DeepSeek's code focus should work well with Go'
    },
    'large': {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      testResults: {
        status: TestingStatus.PLANNED,
        avgResponseTime: 0,
        avgResponseSize: 0,
        testCount: 0,
        lastTested: '2025-05-10',
      },
      notes: 'Planned testing with large Go backends'
    }
  },
  'ruby': {
    'small': {
      provider: 'openai',
      model: 'gpt-4o',
      testResults: {
        status: TestingStatus.PARTIAL,
        avgResponseTime: 2.0,
        avgResponseSize: 1100,
        testCount: 2,
        lastTested: '2025-05-01',
      },
      notes: 'Initial tests look good, needs more comprehensive testing'
    },
    'medium': {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      testResults: {
        status: TestingStatus.PLANNED,
        avgResponseTime: 0,
        avgResponseSize: 0,
        testCount: 0,
        lastTested: '2025-05-01',
      },
      notes: 'Planning tests with Rails applications'
    },
    'large': {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      testResults: {
        status: TestingStatus.PLANNED,
        avgResponseTime: 0,
        avgResponseSize: 0,
        testCount: 0,
        lastTested: '2025-05-01',
      },
      notes: 'Will test with larger Ruby projects'
    }
  },
  'rust': {
    'small': {
      provider: 'openai',
      model: 'gpt-4o',
      testResults: {
        status: TestingStatus.PLANNED,
        avgResponseTime: 0,
        avgResponseSize: 0,
        testCount: 0,
        lastTested: '',
      },
      notes: 'High priority for testing given Rust's popularity'
    },
    'medium': {
      provider: 'deepseek',
      model: 'deepseek-coder-plus',
      testResults: {
        status: TestingStatus.PLANNED,
        avgResponseTime: 0,
        avgResponseSize: 0,
        testCount: 0,
        lastTested: '',
      },
      notes: 'DeepSeek has shown good early results with systems programming languages'
    },
    'large': {
      provider: 'google',
      model: 'gemini-2.5-pro-preview-05-06',
      testResults: {
        status: TestingStatus.PLANNED,
        avgResponseTime: 0,
        avgResponseSize: 0,
        testCount: 0,
        lastTested: '',
      },
      notes: 'Need to test with larger Rust codebases'
    }
  },
  'php': {
    'small': {
      provider: 'openai',
      model: 'gpt-4o',
      testResults: {
        status: TestingStatus.PLANNED,
        avgResponseTime: 0,
        avgResponseSize: 0,
        testCount: 0,
        lastTested: '',
      },
      notes: 'Will test with small PHP projects'
    },
    'medium': {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      testResults: {
        status: TestingStatus.PLANNED,
        avgResponseTime: 0,
        avgResponseSize: 0,
        testCount: 0,
        lastTested: '',
      },
      notes: 'Planning tests with Laravel applications'
    },
    'large': {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      testResults: {
        status: TestingStatus.PLANNED,
        avgResponseTime: 0,
        avgResponseSize: 0,
        testCount: 0,
        lastTested: '',
      },
      notes: 'Will test with WordPress and other large PHP projects'
    }
  },
  // Provides defaults for any language not explicitly defined
  'default': {
    'small': {
      provider: 'openai',
      model: 'gpt-4o',
      testResults: {
        avgResponseTime: 2.3,
        avgResponseSize: 1298,
        qualityScore: 7.5,
        testCount: 15,
        lastTested: '2025-05-13',
        status: TestingStatus.TESTED
      },
      notes: 'Best overall for small repositories regardless of language'
    },
    'medium': {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      testResults: {
        avgResponseTime: 3.3,
        avgResponseSize: 2032,
        qualityScore: 8.8,
        testCount: 15,
        lastTested: '2025-05-13',
        status: TestingStatus.TESTED
      },
      notes: 'Most detailed overall for medium repositories'
    },
    'large': {
      provider: 'google',
      model: 'gemini-2.5-pro-preview-05-06',
      testResults: {
        avgResponseTime: 2.7,
        avgResponseSize: 1768,
        qualityScore: 8.2,
        testCount: 10,
        lastTested: '2025-05-13',
        status: TestingStatus.TESTED
      },
      notes: 'Good balance of speed and detail for large repositories'
    }
  },
  // Fallback configurations if preferred provider is unavailable
  'fallback': {
    'small': {
      provider: 'openrouter',
      model: 'anthropic/claude-3.7-sonnet',
      testResults: {
        avgResponseTime: 2.3,
        avgResponseSize: 1542,
        qualityScore: 8.2,
        testCount: 10,
        lastTested: '2025-05-13',
        status: TestingStatus.TESTED
      },
      notes: 'Good fallback through OpenRouter with reliable performance'
    },
    'medium': {
      provider: 'google',
      model: 'gemini-2.5-pro-preview-05-06',
      testResults: {
        avgResponseTime: 2.7,
        avgResponseSize: 1768,
        qualityScore: 8.0,
        testCount: 10,
        lastTested: '2025-05-13',
        status: TestingStatus.TESTED
      },
      notes: 'Reliable alternative with good performance'
    },
    'large': {
      provider: 'openai',
      model: 'gpt-4o',
      testResults: {
        avgResponseTime: 2.3,
        avgResponseSize: 1298,
        qualityScore: 7.5,
        testCount: 10,
        lastTested: '2025-05-13',
        status: TestingStatus.TESTED
      },
      notes: 'Fast alternative for large repos when deeper analysis models unavailable'
    }
  }
};

/**
 * DeepSeek model configurations to be tested
 * These are planned to be tested and integrated into the main configuration
 */
export const DEEPSEEK_CONFIGS_TO_TEST: Record<string, RepositoryModelConfig> = {
  'deepseek-coder': {
    provider: 'deepseek',
    model: 'deepseek-coder',
    testResults: {
      status: TestingStatus.PLANNED,
      avgResponseTime: 0,
      avgResponseSize: 0,
      testCount: 0,
      lastTested: '',
    },
    notes: 'Base DeepSeek Coder model - test for general code analysis'
  },
  'deepseek-coder-plus': {
    provider: 'deepseek',
    model: 'deepseek-coder-plus',
    testResults: {
      status: TestingStatus.PLANNED,
      avgResponseTime: 0,
      avgResponseSize: 0,
      testCount: 0,
      lastTested: '',
    },
    notes: 'Enhanced DeepSeek model - test for detailed code understanding'
  },
  'deepseek-coder-lite': {
    provider: 'deepseek',
    model: 'deepseek-coder-lite',
    testResults: {
      status: TestingStatus.PLANNED,
      avgResponseTime: 0,
      avgResponseSize: 0,
      testCount: 0,
      lastTested: '',
    },
    notes: 'Smaller DeepSeek model - test for speed and smaller repositories'
  }
};

/**
 * Languages that need high priority testing with DeepSeek models
 */
export const DEEPSEEK_TEST_PRIORITIES: Record<string, string[]> = {
  'high': [
    'rust',      // Systems programming - should align with DeepSeek strengths
    'c',         // Low-level programming - should align with DeepSeek strengths
    'cpp',       // Low-level programming - should align with DeepSeek strengths
    'go',        // Modern systems language - growing popularity
    'java',      // Enterprise language with complex patterns
    'csharp'     // .NET ecosystem
  ],
  'medium': [
    'kotlin',    // Modern JVM language
    'swift',     // Apple ecosystem
    'typescript', // Compare against current leaders
    'python',    // Compare against current leaders
    'javascript' // Compare against current leaders
  ],
  'low': [
    'ruby',      // Complete testing matrix
    'php',       // Complete testing matrix
    'scala',     // JVM language with functional paradigm
    'haskell',   // Functional programming
    'elixir'     // Functional programming
  ]
};

/**
 * Get the recommended model configuration for a repository
 * @param language Primary language of the repository
 * @param sizeBytes Size of the repository in bytes
 * @returns Recommended model configuration
 */
export function getRecommendedModelConfig(
  language: string, 
  sizeBytes: number
): RepositoryModelConfig {
  // Determine size category
  let sizeCategory: RepositorySizeCategory;
  
  if (sizeBytes < 5 * 1024 * 1024) { // Less than 5MB
    sizeCategory = 'small';
  } else if (sizeBytes < 50 * 1024 * 1024) { // Between 5MB and 50MB
    sizeCategory = 'medium';
  } else {
    sizeCategory = 'large';
  }
  
  // Normalize language for lookup
  const normalizedLang = language.toLowerCase();
  
  // Find configuration for this language and size
  if (REPOSITORY_MODEL_CONFIGS[normalizedLang]?.[sizeCategory]) {
    return REPOSITORY_MODEL_CONFIGS[normalizedLang][sizeCategory];
  }
  
  // Fall back to default configuration if specific language not found
  return REPOSITORY_MODEL_CONFIGS.default[sizeCategory];
}

/**
 * Get untested or partially tested languages by priority
 * Used for planning future testing
 */
export function getLanguagesToTest(): { high: string[], medium: string[], low: string[] } {
  const result = {
    high: [] as string[],
    medium: [] as string[],
    low: [] as string[]
  };
  
  // Check all languages
  for (const language in REPOSITORY_MODEL_CONFIGS) {
    // Skip special entries
    if (language === 'default' || language === 'fallback') continue;
    
    const configs = REPOSITORY_MODEL_CONFIGS[language];
    
    // Check if any size category is untested or partially tested
    const needsTesting = Object.values(configs).some(config => 
      config.testResults?.status === TestingStatus.UNTESTED || 
      config.testResults?.status === TestingStatus.PARTIAL ||
      config.testResults?.status === TestingStatus.PLANNED
    );
    
    if (needsTesting) {
      // Prioritize based on DeepSeek priorities or default to medium
      if (DEEPSEEK_TEST_PRIORITIES.high.includes(language)) {
        result.high.push(language);
      } else if (DEEPSEEK_TEST_PRIORITIES.medium.includes(language)) {
        result.medium.push(language);
      } else if (DEEPSEEK_TEST_PRIORITIES.low.includes(language)) {
        result.low.push(language);
      } else {
        result.medium.push(language);
      }
    }
  }
  
  return result;
}
