/**
 * Auto-generated Repository Model Configuration
 * Generated on: 2025-05-13T23:38:39.087Z
 * 
 * This configuration was created via comprehensive calibration testing
 * across multiple repository sizes, languages, and complexity levels.
 */

import { RepositoryModelConfig, RepositorySizeCategory, TestingStatus } from '../../src/config/models/repository-model-config';
import { ExtendedModelTestResults } from './interface-fix';

// Helper function to normalize test results format
function normalizeTestResults(testResults: any): ExtendedModelTestResults {
  return {
    ...testResults,
    // If avgResponseSize is missing but avgContentSize exists, use avgContentSize as avgResponseSize
    avgResponseSize: testResults.avgResponseSize || testResults.avgContentSize,
  };
}

/**
 * Repository model configurations based on calibration testing with extended test results
 */
export interface ExtendedRepositoryModelConfig extends RepositoryModelConfig {
  testResults?: ExtendedModelTestResults;
}

/**
 * Raw calibrated model configurations
 * Note: This interface is used to type the raw data structure which may not fully conform to ExtendedModelTestResults
 */
interface RawCalibrationData {
  provider: string;
  model: string;
  testResults?: {
    status: string;
    avgResponseTime: number;
    avgContentSize: number;
    testCount: number;
    lastTested: string;
    [key: string]: any;
  };
  notes?: string;
}

// Raw configuration data
const RAW_CONFIGS: Record<string, Record<RepositorySizeCategory, RawCalibrationData>> = {
  javascript: {
    small: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 4.738666666666667,
        avgContentSize: 2931.3333333333335,
        testCount: 3,
        lastTested: '2025-05-13T23:38:39.086Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    },
    medium: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 5.191,
        avgContentSize: 3369.3333333333335,
        testCount: 3,
        lastTested: '2025-05-13T23:38:39.086Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    },
    large: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 5.417000000000001,
        avgContentSize: 3343.3333333333335,
        testCount: 3,
        lastTested: '2025-05-13T23:38:39.086Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    }
  },
  python: {
    small: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 4.9526666666666666,
        avgContentSize: 3071,
        testCount: 3,
        lastTested: '2025-05-13T23:38:39.086Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    },
    medium: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 4.7745,
        avgContentSize: 3250.6666666666665,
        testCount: 6,
        lastTested: '2025-05-13T23:38:39.086Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    },
    large: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    }
  },
  rust: {
    small: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 4.871333333333333,
        avgContentSize: 3044.6666666666665,
        testCount: 3,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    },
    medium: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    },
    large: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    }
  },
  go: {
    small: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 4.723,
        avgContentSize: 3042.3333333333335,
        testCount: 3,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    },
    medium: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 5.146666666666667,
        avgContentSize: 3419.3333333333335,
        testCount: 3,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    },
    large: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 5.784666666666666,
        avgContentSize: 3508.6666666666665,
        testCount: 3,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    }
  },
  kotlin: {
    small: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 4.549666666666666,
        avgContentSize: 2937,
        testCount: 3,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    },
    medium: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    },
    large: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    }
  },
  typescript: {
    medium: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 5.246833333333334,
        avgContentSize: 3375.3333333333335,
        testCount: 6,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    },
    large: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 5.495,
        avgContentSize: 3463.3333333333335,
        testCount: 3,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    },
    small: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    }
  },
  java: {
    medium: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 4.939666666666667,
        avgContentSize: 3372.3333333333335,
        testCount: 3,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    },
    small: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    },
    large: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    }
  },
  php: {
    medium: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 4.935,
        avgContentSize: 3098.6666666666665,
        testCount: 3,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    },
    small: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    },
    large: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    }
  },
  cpp_plus: {
    small: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 5.1,
        avgContentSize: 3000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages and large repositories'
    },
    medium: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 5.3,
        avgContentSize: 3100,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages and large repositories'
    },
    large: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 5.562,
        avgContentSize: 3188.3333333333335,
        testCount: 3,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    }
  },
  ruby: {
    large: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 5.96,
        avgContentSize: 3431.3333333333335,
        testCount: 3,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    },
    small: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    },
    medium: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    }
  },
  csharp: {
    large: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'tested',
        avgResponseTime: 5.114666666666667,
        avgContentSize: 3537.3333333333335,
        testCount: 3,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Calibrated with claude-3-haiku-20240307 on Tue May 13 2025 (best response time)'
    },
    small: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    },
    medium: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    }
  },
  cpp: {
    small: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    },
    medium: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    },
    large: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      testResults: {
        status: 'estimated',
        avgResponseTime: 10,
        avgContentSize: 8000,
        testCount: 0,
        lastTested: '2025-05-13T23:38:39.087Z'
      },
      notes: 'Estimated configuration based on similar languages'
    }
  }
};

/**
 * Normalized calibrated model configurations
 * This normalizes the raw data to match the extended repository model config interface
 */
export const CALIBRATED_MODEL_CONFIGS: Record<string, Record<RepositorySizeCategory, ExtendedRepositoryModelConfig>> = 
  Object.entries(RAW_CONFIGS).reduce((result, [language, sizes]) => {
    result[language] = Object.entries(sizes).reduce((sizeResult, [size, config]) => {
      const normalizedConfig: ExtendedRepositoryModelConfig = {
        provider: config.provider as any,
        model: config.model,
        notes: config.notes,
      };
      
      if (config.testResults) {
        normalizedConfig.testResults = normalizeTestResults(config.testResults);
      }
      
      sizeResult[size as RepositorySizeCategory] = normalizedConfig;
      return sizeResult;
    }, {} as Record<RepositorySizeCategory, ExtendedRepositoryModelConfig>);
    
    return result;
  }, {} as Record<string, Record<RepositorySizeCategory, ExtendedRepositoryModelConfig>>);
