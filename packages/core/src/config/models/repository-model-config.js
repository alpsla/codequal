"use strict";
/**
 * Repository Model Configuration Types
 *
 * Defines all interfaces and types for repository-specific model configurations,
 * including calibration results and testing status tracking.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPOSITORY_MODEL_CONFIGS = exports.FRAMEWORK_MODEL_PREFERENCES = exports.LANGUAGE_MODEL_PREFERENCES = exports.DEFAULT_MODEL_CONFIGS = exports.RepositoryProvider = exports.TestingStatus = exports.RepositorySizeCategory = void 0;
var RepositorySizeCategory;
(function (RepositorySizeCategory) {
    RepositorySizeCategory["SMALL"] = "small";
    RepositorySizeCategory["MEDIUM"] = "medium";
    RepositorySizeCategory["LARGE"] = "large";
    RepositorySizeCategory["EXTRA_LARGE"] = "extra_large";
})(RepositorySizeCategory || (exports.RepositorySizeCategory = RepositorySizeCategory = {}));
var TestingStatus;
(function (TestingStatus) {
    TestingStatus["NOT_TESTED"] = "not_tested";
    TestingStatus["IN_PROGRESS"] = "in_progress";
    TestingStatus["PARTIAL"] = "partial";
    TestingStatus["TESTED"] = "tested";
    TestingStatus["FAILED"] = "failed";
})(TestingStatus || (exports.TestingStatus = TestingStatus = {}));
var RepositoryProvider;
(function (RepositoryProvider) {
    RepositoryProvider["GITHUB"] = "github";
    RepositoryProvider["GITLAB"] = "gitlab";
    RepositoryProvider["BITBUCKET"] = "bitbucket";
    RepositoryProvider["OTHER"] = "other";
})(RepositoryProvider || (exports.RepositoryProvider = RepositoryProvider = {}));
// Default configurations for different repository types
exports.DEFAULT_MODEL_CONFIGS = {
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
};
// Language-specific model preferences
exports.LANGUAGE_MODEL_PREFERENCES = {
    'typescript': ['gpt-4o', 'claude-3-5-sonnet', 'deepseek-coder'],
    'javascript': ['gpt-4o', 'claude-3-5-sonnet', 'deepseek-coder'],
    'python': ['deepseek-coder', 'gpt-4o', 'claude-3-5-sonnet'],
    'java': ['gpt-4o', 'claude-3-5-sonnet', 'gemini-pro'],
    'rust': ['deepseek-coder', 'gpt-4o', 'claude-3-5-sonnet'],
    'go': ['deepseek-coder', 'gpt-4o', 'claude-3-5-sonnet']
};
exports.FRAMEWORK_MODEL_PREFERENCES = {
    'react': ['gpt-4o', 'claude-3-5-sonnet'],
    'vue': ['gpt-4o', 'claude-3-5-sonnet'],
    'angular': ['gpt-4o', 'claude-3-5-sonnet'],
    'express': ['deepseek-coder', 'gpt-4o'],
    'nestjs': ['gpt-4o', 'claude-3-5-sonnet'],
    'django': ['deepseek-coder', 'gpt-4o'],
    'flask': ['deepseek-coder', 'gpt-4o'],
    'spring': ['gpt-4o', 'claude-3-5-sonnet']
};
// Legacy export for backward compatibility
exports.REPOSITORY_MODEL_CONFIGS = exports.DEFAULT_MODEL_CONFIGS;
