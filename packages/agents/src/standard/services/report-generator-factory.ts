/**
 * Report Generator Factory
 * 
 * Ensures V8 generator is used by default and handles version selection
 * with proper deprecation warnings and fallbacks.
 */

import { getReportGeneratorVersion, validateGeneratorVersion, getDefaultReportOptions } from '../config/generator-config';

export interface ReportGeneratorFactoryOptions {
  version?: string;
  skipValidation?: boolean;
  allowDeprecated?: boolean;
}

export interface ReportGenerator {
  generateReport(data: any, options?: any): string;
}

/**
 * Factory class for creating report generators
 */
export class ReportGeneratorFactory {
  /**
   * Creates the appropriate report generator instance
   */
  static createGenerator(options: ReportGeneratorFactoryOptions = {}): ReportGenerator {
    const version = getReportGeneratorVersion(options.version);
    
    // Validate version unless explicitly skipped
    if (!options.skipValidation) {
      try {
        validateGeneratorVersion(version);
      } catch (error) {
        if (!options.allowDeprecated) {
          throw error;
        }
        console.warn(`⚠️ Using deprecated version ${version} with explicit override`);
      }
    }

    return ReportGeneratorFactory.instantiateGenerator(version);
  }

  /**
   * Instantiates the generator for the specified version
   */
  private static instantiateGenerator(version: string): ReportGenerator {
    switch (version) {
      case 'v8':
        return ReportGeneratorFactory.createV8Generator();
      
      case 'v7':
        console.warn('⚠️ V7 generator is deprecated. See docs/DEPRECATED_V7_WARNING.md');
        throw new Error('V7 generator is deprecated and has been removed. Use V8 instead.');
      
      case 'v6':
        console.warn('⚠️ V6 generator is deprecated. See docs/DEPRECATED_V7_WARNING.md');
        throw new Error('V6 generator is deprecated and has been removed. Use V8 instead.');
      
      default:
        console.warn(`⚠️ Unknown version ${version}, falling back to V8`);
        return ReportGeneratorFactory.createV8Generator();
    }
  }

  /**
   * Creates V8 generator instance
   */
  private static createV8Generator(): ReportGenerator {
    try {
      // Dynamic import to avoid circular dependencies
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ReportGeneratorV8Final } = require('../comparison/report-generator-v8-final');
      return new ReportGeneratorV8Final();
    } catch (error) {
      console.error('❌ Failed to load V8 generator:', error);
      throw new Error('V8 Report Generator is not available. Please check your build configuration.');
    }
  }

  /**
   * Get the recommended generator (always V8)
   */
  static getRecommendedGenerator(): ReportGenerator {
    return ReportGeneratorFactory.createGenerator({ version: 'v8' });
  }

  /**
   * Create generator with enhanced options
   */
  static createWithDefaultOptions(options: ReportGeneratorFactoryOptions = {}): {
    generator: ReportGenerator;
    options: any;
  } {
    const generator = ReportGeneratorFactory.createGenerator(options);
    const defaultOptions = getDefaultReportOptions();
    
    return {
      generator,
      options: defaultOptions
    };
  }
}

/**
 * Convenience function to get V8 generator directly
 */
export function getV8Generator(): ReportGenerator {
  return ReportGeneratorFactory.getRecommendedGenerator();
}

/**
 * Convenience function to create generator with validation
 */
export function createReportGenerator(requestedVersion?: string): ReportGenerator {
  return ReportGeneratorFactory.createGenerator({ version: requestedVersion });
}

/**
 * Wrapper class that enforces V8 usage and provides enhanced features
 */
export class EnhancedReportGenerator {
  private generator: ReportGenerator;
  private defaultOptions: any;

  constructor() {
    const { generator, options } = ReportGeneratorFactory.createWithDefaultOptions();
    this.generator = generator;
    this.defaultOptions = options;
  }

  /**
   * Generate report with enhanced options and validation
   */
  generateReport(data: any, userOptions: any = {}): string {
    // Merge with default options
    const options = {
      ...this.defaultOptions,
      ...userOptions
    };

    // Ensure educational content structure is correct
    if (options.includeEducation && data.education) {
      data.education = this.fixEducationalStructure(data.education);
    }

    // Log generator usage for monitoring
    console.log('📊 Generating report with V8 generator', {
      hasEducation: !!data.education,
      hasSkillTracking: !!data.skillTracking,
      format: options.format,
      includeEducation: options.includeEducation
    });

    try {
      return this.generator.generateReport(data, options);
    } catch (error) {
      console.error('❌ Report generation failed:', error);
      
      // Try to generate a minimal report as fallback
      const fallbackData = {
        ...data,
        success: false,
        error: 'Report generation failed, showing minimal data'
      };
      
      try {
        return this.generator.generateReport(fallbackData, { 
          ...options, 
          includeEducation: false,
          includeArchitectureDiagram: false 
        });
      } catch (fallbackError) {
        console.error('❌ Fallback report generation also failed:', fallbackError);
        return this.generateErrorReport(error);
      }
    }
  }

  /**
   * Fix educational content structure issues
   */
  private fixEducationalStructure(education: any): any {
    if (!education) return null;

    // Ensure proper structure
    return {
      courses: Array.isArray(education.courses) ? education.courses : [],
      articles: Array.isArray(education.articles) ? education.articles : [],
      videos: Array.isArray(education.videos) ? education.videos : [],
      estimatedLearningTime: education.estimatedLearningTime || 0,
      personalizedPath: education.personalizedPath || null
    };
  }

  /**
   * Generate error report when all else fails
   */
  private generateErrorReport(error: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Report Generation Error</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .error { background: #ffebee; border: 1px solid #f44336; padding: 20px; border-radius: 4px; }
        .error h2 { color: #f44336; margin-top: 0; }
    </style>
</head>
<body>
    <div class="error">
        <h2>Report Generation Error</h2>
        <p>An error occurred while generating the report:</p>
        <pre>${error?.message || 'Unknown error'}</pre>
        <p>Please try again or contact support if the issue persists.</p>
    </div>
</body>
</html>
    `;
  }
}

/**
 * Factory function for creating enhanced generator
 */
export function createEnhancedGenerator(): EnhancedReportGenerator {
  return new EnhancedReportGenerator();
}