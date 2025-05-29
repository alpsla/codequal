/**
 * DeepWiki OpenRouter Integration Service
 * 
 * This service provides a clean interface for the orchestrator to interact with
 * the DeepWiki repository analysis functionality via OpenRouter.
 * 
 * It implements the simplified three-parameter approach:
 * 1. Repository URL
 * 2. Primary model
 * 3. Fallback models
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);

/**
 * Options for repository analysis
 */
export interface DeepWikiAnalysisOptions {
  /** Repository URL to analyze */
  repositoryUrl: string;
  
  /** Primary model to use (with provider prefix) */
  primaryModel: string;
  
  /** Optional fallback models if primary fails */
  fallbackModels?: string[];
  
  /** Kubernetes namespace (default: 'codequal-dev') */
  namespace?: string;
  
  /** Pod selector (default: 'deepwiki-fixed') */
  podSelector?: string;
  
  /** Port for DeepWiki API (default: 8001) */
  port?: number;
  
  /** Output path for results (default: ./results/{repo-name}_analysis.json) */
  outputPath?: string;
}

/**
 * Result of repository analysis
 */
export interface AnalysisResult {
  /** Whether the analysis was successful */
  success: boolean;
  
  /** Analysis result data (if successful) */
  result?: any;
  
  /** Error message (if failed) */
  error?: string;
  
  /** Model used for successful analysis */
  modelUsed?: string;
}

/**
 * Service for interacting with DeepWiki OpenRouter integration
 */
export class DeepWikiService {
  private scriptPath: string;
  private logger = console; // Simple logger using console
  
  /**
   * Create a new DeepWikiService
   */
  constructor() {
    this.scriptPath = path.resolve(__dirname, '../scripts/deepwiki_integration/fresh_implementation/simple_analysis.sh');
    this.ensureScriptExecutable();
  }
  
  /**
   * Ensure the analysis script is executable
   */
  private async ensureScriptExecutable(): Promise<void> {
    try {
      await execAsync(`chmod +x "${this.scriptPath}"`);
    } catch (error) {
      console.error(`Error making script executable: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Analyze a repository with fallback support
   */
  async analyzeRepositoryWithFallback(options: DeepWikiAnalysisOptions): Promise<AnalysisResult> {
    const {
      repositoryUrl,
      primaryModel,
      fallbackModels = [],
      namespace = 'codequal-dev',
      podSelector = 'deepwiki-fixed',
      port = 8001,
    } = options;
    
    // Extract repository name from URL for default output path
    const repoName = repositoryUrl.split('/').pop()?.replace(/\.git$/, '') || 'repository';
    const outputPath = options.outputPath || `./results/${repoName}_analysis.json`;
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    try {
      await mkdirAsync(outputDir, { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
      if (error && typeof error === 'object' && 'code' in error && error.code !== 'EEXIST') {
        return {
          success: false,
          error: `Failed to create output directory: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    
    // Convert fallback models to comma-separated string if provided
    const fallbackModelsStr = fallbackModels.length > 0 ? fallbackModels.join(',') : '';
    
    try {
      this.logger.info(`Analyzing repository: ${repositoryUrl}`);
      this.logger.info(`Primary model: ${primaryModel}`);
      this.logger.info(`Fallback models: ${fallbackModelsStr || 'None'}`);
      
      // Execute the analysis script
      await execAsync(
        `"${this.scriptPath}" "${repositoryUrl}" "${primaryModel}" "${fallbackModelsStr}" "${namespace}" "${podSelector}" "${port}" "${outputPath}"`
      );
      
      // Read and parse the results
      const rawResult = await readFileAsync(outputPath, 'utf8');
      const result = JSON.parse(rawResult);
      
      // Check if analysis failed
      if (result.error) {
        return {
          success: false,
          error: result.error,
          modelUsed: result.model_used
        };
      }
      
      return {
        success: true,
        result,
        modelUsed: result.model_used || primaryModel
      };
    } catch (error) {
      console.error(`Error analyzing repository: ${error instanceof Error ? error.message : String(error)}`);
      
      // Check if error output was created
      try {
        if (fs.existsSync(outputPath)) {
          const errorOutput = JSON.parse(await readFileAsync(outputPath, 'utf8'));
          return {
            success: false,
            error: errorOutput.error || 'Unknown error',
            modelUsed: errorOutput.model_used
          };
        }
      } catch (parseError) {
        // Unable to parse error output, continue with original error
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Validate the DeepWiki OpenRouter integration
   */
  async validateIntegration(namespace = 'codequal-dev', podSelector = 'deepwiki-fixed', port = 8001): Promise<boolean> {
    try {
      const validationScriptPath = path.resolve(
        __dirname, 
        '../scripts/deepwiki_integration/fresh_implementation/validate_integration.sh'
      );
      
      // Ensure validation script is executable
      await execAsync(`chmod +x "${validationScriptPath}"`);
      
      // Run validation script
      const { stdout } = await execAsync(
        `"${validationScriptPath}" "${namespace}" "${podSelector}" "${port}"`
      );
      
      // Check if validation passed
      return stdout.includes('All validation checks passed');
    } catch (error) {
      console.error(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

/**
 * Example usage
 */
async function exampleUsage() {
  const deepwikiService = new DeepWikiService();
  
  // Validate integration first
  const isValid = await deepwikiService.validateIntegration();
  if (!isValid) {
    console.error('DeepWiki OpenRouter integration validation failed. Please check the setup.');
    return;
  }
  
  // Run analysis with primary and fallback models
  const result = await deepwikiService.analyzeRepositoryWithFallback({
    repositoryUrl: 'https://github.com/pallets/click',
    primaryModel: 'anthropic/claude-3-opus',
    fallbackModels: ['openai/gpt-4o', 'anthropic/claude-3.7-sonnet']
  });
  
  if (result.success) {
    // Log success for debugging
    // console.log(`Analysis completed successfully using model: ${result.modelUsed}`);
    // console.log(result.result);
  } else {
    // Log error for debugging
    // console.error(`Analysis failed: ${result.error}`);
  }
}

// Only run example if this file is executed directly
if (require.main === module) {
  exampleUsage().catch(console.error);
}
