/**
 * Repository Model Configuration Types
 * 
 * Defines all interfaces and types for repository-specific model configurations,
 * including calibration results and testing status tracking.
 */

export enum RepositorySizeCategory {
  SMALL = 'small',
  MEDIUM = 'medium', 
  LARGE = 'large',
  EXTRA_LARGE = 'extra_large'
}

export enum TestingStatus {
  NOT_TESTED = 'not_tested',
  IN_PROGRESS = 'in_progress',
  PARTIAL = 'partial',
  TESTED = 'tested',
  FAILED = 'failed'
}

export enum RepositoryProvider {
  GITHUB = 'github',
  GITLAB = 'gitlab',
  BITBUCKET = 'bitbucket',
  OTHER = 'other'
}

// Note: Model providers are dynamically discovered from Vector DB configurations
// No hardcoded provider enum needed - orchestrator handles provider discovery

export interface RepositoryModelConfig {
  id: string;
  repository_url: string;
  repository_name: string;
  provider: RepositoryProvider;
  primary_language: string;
  languages: string[];
  size_category: RepositorySizeCategory;
  framework_stack?: string[];
  complexity_score?: number;
  
  // Legacy fields for backward compatibility
  model?: string;
  notes?: string;
  testResults?: any;
  
  // Model configuration
  optimal_models: {
    [role: string]: {
      provider: string;
      model: string;
      confidence_score: number;
      last_updated: string;
    };
  };
  
  // Testing and calibration
  testing_status: TestingStatus;
  last_calibration: string | null;
  calibration_results?: any;
  
  // Performance metrics
  performance_metrics?: {
    avg_response_time: number;
    avg_cost_per_analysis: number;
    success_rate: number;
  };
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface ModelCalibrationResult {
  repository_id: string;
  model_provider: string;
  model_name: string;
  role: string;
  test_results: {
    accuracy_score: number;
    response_time: number;
    cost_per_request: number;
    success_rate: number;
  };
  test_date: string;
  sample_size: number;
}

export interface RepositoryAnalysisContext {
  repository: {
    url: string;
    name: string;
    provider: RepositoryProvider;
    primary_language: string;
    languages: string[];
    size_category: RepositorySizeCategory;
    framework_stack?: string[];
  };
  analysis_type: string;
  user_preferences?: {
    preferred_models?: string[];
    cost_preference?: 'low' | 'medium' | 'high';
    speed_preference?: 'fast' | 'balanced' | 'thorough';
  };
}

export interface OptimalModelSelection {
  role: string;
  selected_model: {
    provider: string;
    model: string;
    confidence_score: number;
    reasoning: string;
  };
  fallback_models: Array<{
    provider: string;
    model: string;
    confidence_score: number;
  }>;
  selection_criteria: {
    accuracy_weight: number;
    cost_weight: number;
    speed_weight: number;
  };
}

// Default configurations for different repository types
export const DEFAULT_MODEL_CONFIGS = {
  [RepositorySizeCategory.SMALL]: {
    cost_preference: 'low',
    speed_preference: 'fast',
    complexity_threshold: 0.3
  },
  [RepositorySizeCategory.MEDIUM]: {
    cost_preference: 'medium', 
    speed_preference: 'balanced',
    complexity_threshold: 0.5
  },
  [RepositorySizeCategory.LARGE]: {
    cost_preference: 'medium',
    speed_preference: 'balanced', 
    complexity_threshold: 0.7
  },
  [RepositorySizeCategory.EXTRA_LARGE]: {
    cost_preference: 'high',
    speed_preference: 'thorough',
    complexity_threshold: 0.9
  }
} as const;

// Language-specific model preferences
export const LANGUAGE_MODEL_PREFERENCES = {
  'typescript': ['gpt-4o', 'claude-3-5-sonnet', 'deepseek-coder'],
  'javascript': ['gpt-4o', 'claude-3-5-sonnet', 'deepseek-coder'],
  'python': ['deepseek-coder', 'gpt-4o', 'claude-3-5-sonnet'],
  'java': ['gpt-4o', 'claude-3-5-sonnet', 'gemini-pro'],
  'rust': ['deepseek-coder', 'gpt-4o', 'claude-3-5-sonnet'],
  'go': ['deepseek-coder', 'gpt-4o', 'claude-3-5-sonnet']
} as const;

export const FRAMEWORK_MODEL_PREFERENCES = {
  'react': ['gpt-4o', 'claude-3-5-sonnet'],
  'vue': ['gpt-4o', 'claude-3-5-sonnet'],
  'angular': ['gpt-4o', 'claude-3-5-sonnet'],
  'express': ['deepseek-coder', 'gpt-4o'],
  'nestjs': ['gpt-4o', 'claude-3-5-sonnet'],
  'django': ['deepseek-coder', 'gpt-4o'],
  'flask': ['deepseek-coder', 'gpt-4o'],
  'spring': ['gpt-4o', 'claude-3-5-sonnet']
} as const;

// Legacy export for backward compatibility
export const REPOSITORY_MODEL_CONFIGS = DEFAULT_MODEL_CONFIGS;