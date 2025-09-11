/**
 * External Tool Integration with Static Fallbacks
 * 
 * This module provides seamless integration between external service tools
 * and their static analysis fallbacks. When external services are unavailable,
 * the system automatically uses static analysis.
 */

import { logger } from '../../utils/logger';
import { StaticAnalysisToolRunner } from './StaticAnalysisTools';
import { ToolExecutor } from '../EnhancedBaseMultiToolAgent';

/**
 * Smart tool executor that tries external API first, then falls back to static
 */
export class SmartToolExecutor implements ToolExecutor {
  name: string;
  category: 'external' | 'core' = 'external';
  private staticRunner: StaticAnalysisToolRunner;
  private useStaticByDefault: boolean;

  constructor(toolName: string) {
    this.name = toolName;
    this.staticRunner = new StaticAnalysisToolRunner();
    
    // Check environment configuration
    this.useStaticByDefault = process.env.PREFER_STATIC_ANALYSIS === 'true' ||
                             !process.env.ENABLE_EXTERNAL_TOOLS;
  }

  async execute(targetPath: string, language?: string) {
    const startTime = Date.now();
    
    // If configured to use static by default, skip external attempt
    if (this.useStaticByDefault) {
      logger.info(`${this.name}: Using static analysis (configured preference)`);
      return this.runStaticAnalysis(targetPath);
    }

    // Try external service first
    try {
      if (this.canUseExternalService()) {
        logger.info(`${this.name}: Attempting external service...`);
        const result = await this.runExternalService(targetPath);
        if (result && result.findings.length > 0) {
          logger.info(`${this.name}: External service successful`);
          return result;
        }
      }
    } catch (error: any) {
      logger.warn(`${this.name}: External service failed: ${error.message}`);
    }

    // Fall back to static analysis
    logger.info(`${this.name}: Using static analysis fallback`);
    return this.runStaticAnalysis(targetPath);
  }

  private canUseExternalService(): boolean {
    switch (this.name) {
      case 'bundlephobia':
        // Bundlephobia doesn't need API key
        return !!process.env.ENABLE_EXTERNAL_TOOLS;
      
      case 'speedscope':
      case 'clinic':
        // Need profile data files
        return !!process.env.PROFILE_DATA_PATH;
      
      case 'autocannon':
        // Need staging URL
        return !!process.env.STAGING_URL;
      
      case 'cost-of-modules':
        // Can use npm registry
        return !!process.env.ENABLE_EXTERNAL_TOOLS;
      
      default:
        return false;
    }
  }

  private async runExternalService(targetPath: string) {
    switch (this.name) {
      case 'bundlephobia':
        return this.runBundlephobiaAPI(targetPath);
      
      case 'speedscope':
      case 'clinic':
        return this.runProfileAnalysis(targetPath);
      
      case 'autocannon':
        return this.runLoadTest(targetPath);
      
      case 'cost-of-modules':
        return this.runModuleCostAPI(targetPath);
      
      default:
        throw new Error(`Unknown external tool: ${this.name}`);
    }
  }

  private async runStaticAnalysis(targetPath: string) {
    const result = await this.staticRunner.runSpecific(this.name, targetPath);
    return result || {
      tool: this.name,
      findings: [],
      metadata: {
        executionTime: 0,
        errors: ['Static analysis not available for this tool']
      }
    };
  }

  private async runBundlephobiaAPI(targetPath: string) {
    const packageJsonPath = `${targetPath}/package.json`;
    const fs = require('fs');
    
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('No package.json found');
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const findings: any[] = [];
    
    // Note: Bundlephobia API doesn't require authentication
    const baseUrl = process.env.BUNDLEPHOBIA_API_URL || 'https://bundlephobia.com/api';
    
    for (const [name, version] of Object.entries(packageJson.dependencies || {})) {
      try {
        const response = await fetch(`${baseUrl}/size?package=${name}@${version}`);
        if (response.ok) {
          const data = await response.json();
          
          if (data.gzip > 100000) { // 100KB
            findings.push({
              severity: data.gzip > 500000 ? 'high' : 'medium',
              title: `Large dependency: ${name}`,
              description: `${name} adds ${(data.gzip/1024).toFixed(1)}KB (gzipped) to bundle`,
              recommendation: 'Consider lazy loading or code splitting',
              metrics: data
            });
          }
        }
      } catch (error) {
        // Continue with next package
      }
    }

    return {
      tool: 'bundlephobia',
      findings,
      metadata: {
        executionTime: Date.now() - Date.now(),
        source: 'api'
      }
    };
  }

  private async runProfileAnalysis(targetPath: string) {
    // Would analyze profile data if available
    throw new Error('Profile data not available');
  }

  private async runLoadTest(targetPath: string) {
    // Would run load test against staging
    throw new Error('Staging URL not configured');
  }

  private async runModuleCostAPI(targetPath: string) {
    // Would query npm registry for sizes
    throw new Error('NPM registry analysis not configured');
  }
}

/**
 * Factory to create tool executors
 */
export class ExternalToolFactory {
  static createTools(): ToolExecutor[] {
    const tools = [
      'bundlephobia',
      'speedscope',
      'clinic',
      'autocannon',
      'cost-of-modules'
    ];

    return tools.map(name => new SmartToolExecutor(name));
  }

  static createTool(name: string): ToolExecutor {
    return new SmartToolExecutor(name);
  }
}

/**
 * Configuration helper
 */
export class ExternalToolConfig {
  static getConfiguration() {
    return {
      bundlephobia: {
        apiUrl: process.env.BUNDLEPHOBIA_API_URL || 'https://bundlephobia.com/api',
        requiresAuth: false,
        preferStatic: process.env.PREFER_STATIC_BUNDLEPHOBIA === 'true'
      },
      speedscope: {
        profilePath: process.env.PROFILE_DATA_PATH,
        requiresAuth: false,
        preferStatic: true // Always use static for now
      },
      clinic: {
        profilePath: process.env.PROFILE_DATA_PATH,
        requiresAuth: false,
        preferStatic: true
      },
      autocannon: {
        stagingUrl: process.env.STAGING_URL,
        requiresAuth: false,
        preferStatic: true
      },
      costOfModules: {
        npmRegistry: process.env.NPM_REGISTRY || 'https://registry.npmjs.org',
        requiresAuth: false,
        preferStatic: process.env.PREFER_STATIC_MODULE_COST === 'true'
      }
    };
  }

  static isExternalToolsEnabled(): boolean {
    return process.env.ENABLE_EXTERNAL_TOOLS === 'true';
  }

  static isStaticAnalysisEnabled(): boolean {
    return process.env.ENABLE_STATIC_ANALYSIS !== 'false'; // Default to true
  }
}