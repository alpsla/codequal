/**
 * Repository Model Configuration Types
 *
 * Defines all interfaces and types for repository-specific model configurations,
 * including calibration results and testing status tracking.
 */
export declare enum RepositorySizeCategory {
    SMALL = "small",
    MEDIUM = "medium",
    LARGE = "large",
    EXTRA_LARGE = "extra_large"
}
export declare enum TestingStatus {
    NOT_TESTED = "not_tested",
    IN_PROGRESS = "in_progress",
    PARTIAL = "partial",
    TESTED = "tested",
    FAILED = "failed"
}
export declare enum RepositoryProvider {
    GITHUB = "github",
    GITLAB = "gitlab",
    BITBUCKET = "bitbucket",
    OTHER = "other"
}
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
    model?: string;
    notes?: string;
    testResults?: any;
    optimal_models: {
        [role: string]: {
            provider: string;
            model: string;
            confidence_score: number;
            last_updated: string;
        };
    };
    testing_status: TestingStatus;
    last_calibration: string | null;
    calibration_results?: any;
    performance_metrics?: {
        avg_response_time: number;
        avg_cost_per_analysis: number;
        success_rate: number;
    };
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
export declare const DEFAULT_MODEL_CONFIGS: {
    readonly small: {
        readonly cost_preference: "low";
        readonly speed_preference: "fast";
        readonly complexity_threshold: 0.3;
    };
    readonly medium: {
        readonly cost_preference: "medium";
        readonly speed_preference: "balanced";
        readonly complexity_threshold: 0.5;
    };
    readonly large: {
        readonly cost_preference: "medium";
        readonly speed_preference: "balanced";
        readonly complexity_threshold: 0.7;
    };
    readonly extra_large: {
        readonly cost_preference: "high";
        readonly speed_preference: "thorough";
        readonly complexity_threshold: 0.9;
    };
};
export declare const LANGUAGE_MODEL_PREFERENCES: {
    readonly typescript: readonly ["gpt-4o", "claude-3-5-sonnet", "deepseek-coder"];
    readonly javascript: readonly ["gpt-4o", "claude-3-5-sonnet", "deepseek-coder"];
    readonly python: readonly ["deepseek-coder", "gpt-4o", "claude-3-5-sonnet"];
    readonly java: readonly ["gpt-4o", "claude-3-5-sonnet", "gemini-pro"];
    readonly rust: readonly ["deepseek-coder", "gpt-4o", "claude-3-5-sonnet"];
    readonly go: readonly ["deepseek-coder", "gpt-4o", "claude-3-5-sonnet"];
};
export declare const FRAMEWORK_MODEL_PREFERENCES: {
    readonly react: readonly ["gpt-4o", "claude-3-5-sonnet"];
    readonly vue: readonly ["gpt-4o", "claude-3-5-sonnet"];
    readonly angular: readonly ["gpt-4o", "claude-3-5-sonnet"];
    readonly express: readonly ["deepseek-coder", "gpt-4o"];
    readonly nestjs: readonly ["gpt-4o", "claude-3-5-sonnet"];
    readonly django: readonly ["deepseek-coder", "gpt-4o"];
    readonly flask: readonly ["deepseek-coder", "gpt-4o"];
    readonly spring: readonly ["gpt-4o", "claude-3-5-sonnet"];
};
export declare const REPOSITORY_MODEL_CONFIGS: {
    readonly small: {
        readonly cost_preference: "low";
        readonly speed_preference: "fast";
        readonly complexity_threshold: 0.3;
    };
    readonly medium: {
        readonly cost_preference: "medium";
        readonly speed_preference: "balanced";
        readonly complexity_threshold: 0.5;
    };
    readonly large: {
        readonly cost_preference: "medium";
        readonly speed_preference: "balanced";
        readonly complexity_threshold: 0.7;
    };
    readonly extra_large: {
        readonly cost_preference: "high";
        readonly speed_preference: "thorough";
        readonly complexity_threshold: 0.9;
    };
};
