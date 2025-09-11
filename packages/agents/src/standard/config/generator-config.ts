/**
 * Report Generator Configuration
 * 
 * Centralizes configuration for all report generators with focus on V8 as default.
 * This ensures consistent behavior across the application.
 */

export interface ReportGeneratorConfig {
  defaultVersion: 'v8' | 'v7' | 'v6';
  forceVersion?: 'v8' | 'v7' | 'v6';
  fallbackVersion: 'v8' | 'v7' | 'v6';
  deprecatedVersions: string[];
  enableEducationalContent: boolean;
  enableSkillTracking: boolean;
  enableArchitectureDiagram: boolean;
  enableBusinessMetrics: boolean;
  enableAIIDESection: boolean;
  responseTransformation: {
    enabled: boolean;
    hybridMode: boolean;
    forceEnhancement: boolean;
    intelligentFallback: boolean;
  };
}

/**
 * Default configuration with V8 as primary generator
 */
export const DEFAULT_GENERATOR_CONFIG: ReportGeneratorConfig = {
  defaultVersion: 'v8',
  forceVersion: process.env.FORCE_REPORT_GENERATOR_VERSION as any || 'v8',
  fallbackVersion: 'v8',
  deprecatedVersions: ['v7', 'v6', 'v5', 'v4', 'v3', 'v2', 'v1'],
  enableEducationalContent: true,
  enableSkillTracking: true,
  enableArchitectureDiagram: true,
  enableBusinessMetrics: true,
  enableAIIDESection: true,
  responseTransformation: {
    enabled: process.env.DISABLE_DEEPWIKI_TRANSFORMER !== 'true',
    hybridMode: process.env.USE_DEEPWIKI_HYBRID === 'true',
    forceEnhancement: process.env.FORCE_DEEPWIKI_ENHANCEMENT === 'true',
    intelligentFallback: true
  }
};

/**
 * Educational content structure configuration
 */
export interface EducationalContentConfig {
  enabled: boolean;
  includeCoursesCount: number;
  includeArticlesCount: number;
  includeVideosCount: number;
  personalizedPathEnabled: boolean;
  skillBasedRecommendations: boolean;
  categories: {
    security: boolean;
    performance: boolean;
    codeQuality: boolean;
    architecture: boolean;
    dependencies: boolean;
    testing: boolean;
  };
  providers: {
    coursera: boolean;
    udemy: boolean;
    pluralsight: boolean;
    egghead: boolean;
    youtube: boolean;
    devto: boolean;
    medium: boolean;
    github: boolean;
  };
}

export const DEFAULT_EDUCATIONAL_CONFIG: EducationalContentConfig = {
  enabled: true,
  includeCoursesCount: 3,
  includeArticlesCount: 5,
  includeVideosCount: 3,
  personalizedPathEnabled: true,
  skillBasedRecommendations: true,
  categories: {
    security: true,
    performance: true,
    codeQuality: true,
    architecture: true,
    dependencies: true,
    testing: true
  },
  providers: {
    coursera: true,
    udemy: true,
    pluralsight: true,
    egghead: true,
    youtube: true,
    devto: true,
    medium: true,
    github: true
  }
};

/**
 * Get the appropriate generator version based on configuration and environment
 */
export function getReportGeneratorVersion(
  requestedVersion?: string,
  config: ReportGeneratorConfig = DEFAULT_GENERATOR_CONFIG
): 'v8' | 'v7' | 'v6' {
  // Force V8 if explicitly configured
  if (config.forceVersion) {
    if (config.deprecatedVersions.includes(config.forceVersion)) {
      console.warn(`⚠️ Forced version ${config.forceVersion} is deprecated. Using V8 instead.`);
      return 'v8';
    }
    return config.forceVersion;
  }

  // Check if requested version is deprecated
  if (requestedVersion && config.deprecatedVersions.includes(requestedVersion)) {
    console.warn(`⚠️ Requested version ${requestedVersion} is deprecated. Using V8 instead.`);
    return 'v8';
  }

  // Use requested version if valid
  if (requestedVersion === 'v8' || requestedVersion === 'v7' || requestedVersion === 'v6') {
    // But still warn if using deprecated version
    if (config.deprecatedVersions.includes(requestedVersion)) {
      console.warn(`⚠️ Using deprecated version ${requestedVersion}. Consider upgrading to V8.`);
    }
    return requestedVersion;
  }

  // Default to V8
  return config.defaultVersion;
}

/**
 * Validates that V8 generator is being used and warns about deprecated versions
 */
export function validateGeneratorVersion(version: string): void {
  const config = DEFAULT_GENERATOR_CONFIG;
  
  if (config.deprecatedVersions.includes(version)) {
    console.error(`❌ ERROR: Version ${version} is DEPRECATED and should not be used.`);
    console.error('📖 Please see docs/DEPRECATED_V7_WARNING.md for migration guide.');
    console.error('✅ Use V8 Report Generator for the latest features and fixes.');
    throw new Error(`Deprecated generator version ${version} is not allowed. Use V8 instead.`);
  }

  if (version !== 'v8') {
    console.warn(`⚠️ WARNING: Using non-standard version ${version}. V8 is recommended.`);
  }
}

/**
 * Get report options with V8 defaults
 */
export function getDefaultReportOptions(config: ReportGeneratorConfig = DEFAULT_GENERATOR_CONFIG) {
  return {
    format: 'html' as const,
    includeEducation: config.enableEducationalContent,
    includeArchitectureDiagram: config.enableArchitectureDiagram,
    includeSkillTracking: config.enableSkillTracking,
    includeBusinessMetrics: config.enableBusinessMetrics,
    includeAIIDESection: config.enableAIIDESection,
    useTransformer: config.responseTransformation.enabled,
    useHybridMode: config.responseTransformation.hybridMode,
    forceEnhancement: config.responseTransformation.forceEnhancement
  };
}

/**
 * Environment-specific configuration overrides
 */
export function getEnvironmentConfig(): Partial<ReportGeneratorConfig> {
  const overrides: Partial<ReportGeneratorConfig> = {};

  // Production environment - always use V8, enable all features
  if (process.env.NODE_ENV === 'production') {
    overrides.forceVersion = 'v8';
    overrides.enableEducationalContent = true;
    overrides.enableSkillTracking = true;
    overrides.responseTransformation = {
      enabled: true,
      hybridMode: true,
      forceEnhancement: true,
      intelligentFallback: true
    };
  }

  // Test environment - use V8 but may disable some features for speed
  if (process.env.NODE_ENV === 'test') {
    overrides.forceVersion = 'v8';
    overrides.enableEducationalContent = false; // Speed up tests
    overrides.responseTransformation = {
      enabled: true,
      hybridMode: false,
      forceEnhancement: false,
      intelligentFallback: true
    };
  }

  // Development environment - use V8 with all features enabled
  if (process.env.NODE_ENV === 'development') {
    overrides.defaultVersion = 'v8';
    overrides.enableEducationalContent = true;
    overrides.responseTransformation = {
      enabled: true,
      hybridMode: true,
      forceEnhancement: true,
      intelligentFallback: true
    };
  }

  return overrides;
}

/**
 * Merge configurations with environment overrides
 */
export function getActiveConfig(): ReportGeneratorConfig {
  const baseConfig = { ...DEFAULT_GENERATOR_CONFIG };
  const envOverrides = getEnvironmentConfig();
  
  return {
    ...baseConfig,
    ...envOverrides,
    responseTransformation: {
      ...baseConfig.responseTransformation,
      ...envOverrides.responseTransformation
    }
  };
}