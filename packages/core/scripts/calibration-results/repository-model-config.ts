/**
 * Auto-generated Repository Model Configuration
 * Generated on: 2025-05-14T03:42:31.217Z
 * 
 * This configuration was created via comprehensive calibration testing
 * across multiple repository sizes, languages, and complexity levels.
 */

import { RepositoryModelConfig, RepositorySizeCategory, TestingStatus } from '../types/repository-model-config';

/**
 * Repository model configurations based on calibration testing
 */
export const REPOSITORY_MODEL_CONFIGS: Record<
  string, 
  Record<RepositorySizeCategory, RepositoryModelConfig>
> = {
  small: {},
  javascript: {
    large: {
      provider: "google",
      model: "gemini-1.5-flash",
      testResults: {
        status: "tested",
        avgResponseTime: 0,
        avgContentSize: 0,
        qualityScore: 8.363059999999999,
        testCount: 1,
        lastTested: "2025-05-14T03:42:31.215Z"
      },
      notes: "Calibrated on Tue May 13 2025 with score 8.36"
    },
    medium: {
      provider: "google",
      model: "gemini-1.5-flash",
      testResults: {
        status: "tested",
        avgResponseTime: 0,
        avgContentSize: 0,
        qualityScore: 8.56182,
        testCount: 1,
        lastTested: "2025-05-14T03:42:31.215Z"
      },
      notes: "Calibrated on Tue May 13 2025 with score 8.56"
    }
  },
  python: {
    large: {
      provider: "google",
      model: "gemini-1.5-flash",
      testResults: {
        status: "tested",
        avgResponseTime: 0,
        avgContentSize: 0,
        qualityScore: 8.4897,
        testCount: 1,
        lastTested: "2025-05-14T03:42:31.215Z"
      },
      notes: "Calibrated on Tue May 13 2025 with score 8.49"
    },
    small: {
      provider: "google",
      model: "gemini-1.5-flash",
      testResults: {
        status: "tested",
        avgResponseTime: 0,
        avgContentSize: 0,
        qualityScore: 8.53886,
        testCount: 1,
        lastTested: "2025-05-14T03:42:31.215Z"
      },
      notes: "Calibrated on Tue May 13 2025 with score 8.54"
    }
  },
  rust: {
    large: {
      provider: "google",
      model: "gemini-1.5-flash",
      testResults: {
        status: "tested",
        avgResponseTime: 0,
        avgContentSize: 0,
        qualityScore: 8.66692,
        testCount: 1,
        lastTested: "2025-05-14T03:42:31.215Z"
      },
      notes: "Calibrated on Tue May 13 2025 with score 8.67"
    }
  },
  go: {
    large: {
      provider: "google",
      model: "gemini-1.5-flash",
      testResults: {
        status: "tested",
        avgResponseTime: 0,
        avgContentSize: 0,
        qualityScore: 8.5729,
        testCount: 1,
        lastTested: "2025-05-14T03:42:31.215Z"
      },
      notes: "Calibrated on Tue May 13 2025 with score 8.57"
    }
  },
  kotlin: {
    large: {
      provider: "google",
      model: "gemini-1.5-flash",
      testResults: {
        status: "tested",
        avgResponseTime: 0,
        avgContentSize: 0,
        qualityScore: 7.9742,
        testCount: 1,
        lastTested: "2025-05-14T03:42:31.215Z"
      },
      notes: "Calibrated on Tue May 13 2025 with score 7.97"
    }
  },
  typescript: {
    large: {
      provider: "google",
      model: "gemini-1.5-flash",
      testResults: {
        status: "tested",
        avgResponseTime: 0,
        avgContentSize: 0,
        qualityScore: 8.26986,
        testCount: 1,
        lastTested: "2025-05-14T03:42:31.215Z"
      },
      notes: "Calibrated on Tue May 13 2025 with score 8.27"
    }
  },
  java: {
    large: {
      provider: "google",
      model: "gemini-1.5-flash",
      testResults: {
        status: "tested",
        avgResponseTime: 0,
        avgContentSize: 0,
        qualityScore: 8.92622,
        testCount: 1,
        lastTested: "2025-05-14T03:42:31.215Z"
      },
      notes: "Calibrated on Tue May 13 2025 with score 8.93"
    }
  },
  php: {
    medium: {
      provider: "google",
      model: "gemini-1.5-flash",
      testResults: {
        status: "tested",
        avgResponseTime: 0,
        avgContentSize: 0,
        qualityScore: 8.532399999999999,
        testCount: 1,
        lastTested: "2025-05-14T03:42:31.215Z"
      },
      notes: "Calibrated on Tue May 13 2025 with score 8.53"
    }
  },
  default: {
    small: {
      provider: "openai",
      model: "gpt-4o",
      testResults: {
        status: "tested",
        avgResponseTime: 2,
        avgContentSize: 1000,
        testCount: 1,
        lastTested: "2025-05-14T03:42:31.217Z"
      },
      notes: "Default model for small repositories"
    },
    medium: {
      provider: "anthropic",
      model: "claude-3-opus-20240229",
      testResults: {
        status: "tested",
        avgResponseTime: 3,
        avgContentSize: 2000,
        testCount: 1,
        lastTested: "2025-05-14T03:42:31.217Z"
      },
      notes: "Default model for medium repositories"
    },
    large: {
      provider: "anthropic",
      model: "claude-3-opus-20240229",
      testResults: {
        status: "tested",
        avgResponseTime: 3.5,
        avgContentSize: 2500,
        testCount: 1,
        lastTested: "2025-05-14T03:42:31.217Z"
      },
      notes: "Default model for large repositories"
    }
  }
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
