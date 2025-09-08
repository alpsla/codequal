/**
 * Analysis Depth Manager
 * Provides user-configurable analysis depth with intelligent parallelization
 */

export enum AnalysisDepth {
  QUICK = 'quick',           // ~1 minute, 150 files
  STANDARD = 'standard',     // ~3-5 minutes, 500 files (default)
  THOROUGH = 'thorough',     // ~7-10 minutes, 1000 files
  COMPLETE = 'complete',     // No limit, analyze everything
  CUSTOM = 'custom'          // User-defined limits
}

export interface AnalysisConfig {
  depth: AnalysisDepth;
  maxFiles?: number;
  maxTime?: number;          // Maximum execution time in seconds
  parallelization: {
    enabled: boolean;
    maxConcurrentTools: number;
    maxFilesPerBatch: number;
  };
  priorities: {
    prChanges: boolean;      // Always analyze PR changes first
    securityFirst: boolean;  // Prioritize security-critical files
    skipTests: boolean;      // Skip test files for faster analysis
  };
}

export class AnalysisDepthManager {
  private static readonly DEPTH_CONFIGS: Record<AnalysisDepth, Partial<AnalysisConfig>> = {
    [AnalysisDepth.QUICK]: {
      maxFiles: 150,
      maxTime: 60,
      parallelization: {
        enabled: true,
        maxConcurrentTools: 5,
        maxFilesPerBatch: 50
      },
      priorities: {
        prChanges: true,
        securityFirst: true,
        skipTests: true
      }
    },
    [AnalysisDepth.STANDARD]: {
      maxFiles: 500,
      maxTime: 300,
      parallelization: {
        enabled: true,
        maxConcurrentTools: 4,
        maxFilesPerBatch: 100
      },
      priorities: {
        prChanges: true,
        securityFirst: true,
        skipTests: false
      }
    },
    [AnalysisDepth.THOROUGH]: {
      maxFiles: 1000,
      maxTime: 600,
      parallelization: {
        enabled: true,
        maxConcurrentTools: 3,
        maxFilesPerBatch: 200
      },
      priorities: {
        prChanges: true,
        securityFirst: false,
        skipTests: false
      }
    },
    [AnalysisDepth.COMPLETE]: {
      maxFiles: undefined,  // No limit
      maxTime: undefined,   // No timeout
      parallelization: {
        enabled: true,
        maxConcurrentTools: 2,
        maxFilesPerBatch: 500
      },
      priorities: {
        prChanges: false,  // Analyze everything equally
        securityFirst: false,
        skipTests: false
      }
    },
    [AnalysisDepth.CUSTOM]: {
      // User provides all values
    }
  };

  /**
   * Get configuration for specified depth
   */
  static getConfig(depth: AnalysisDepth, customConfig?: Partial<AnalysisConfig>): AnalysisConfig {
    const baseConfig = this.DEPTH_CONFIGS[depth] || {};
    
    if (depth === AnalysisDepth.CUSTOM && customConfig) {
      return {
        depth,
        ...customConfig
      } as AnalysisConfig;
    }
    
    return {
      depth,
      ...baseConfig,
      ...customConfig  // Allow overrides
    } as AnalysisConfig;
  }

  /**
   * Estimate analysis time based on file count and tools
   */
  static estimateTime(
    fileCount: number,
    languages: string[],
    depth: AnalysisDepth
  ): { min: number; max: number; likely: number } {
    // Base time per file per tool (seconds)
    const timePerFile = {
      rust: { min: 0.5, max: 2, avg: 1 },
      python: { min: 0.3, max: 1, avg: 0.5 },
      typescript: { min: 0.2, max: 0.8, avg: 0.4 },
      go: { min: 0.3, max: 0.8, avg: 0.5 },
      java: { min: 0.5, max: 1.5, avg: 0.8 }
    };

    const config = this.getConfig(depth);
    const parallelFactor = config.parallelization.enabled 
      ? config.parallelization.maxConcurrentTools 
      : 1;

    let totalMin = 0;
    let totalMax = 0;
    let totalAvg = 0;

    for (const lang of languages) {
      const times = timePerFile[lang as keyof typeof timePerFile] || { min: 0.5, max: 1, avg: 0.7 };
      const filesForLang = Math.min(fileCount, config.maxFiles || fileCount);
      
      totalMin += (times.min * filesForLang) / parallelFactor;
      totalMax += (times.max * filesForLang) / parallelFactor;
      totalAvg += (times.avg * filesForLang) / parallelFactor;
    }

    // Add overhead for initialization and report generation
    const overhead = 10;

    return {
      min: Math.round(totalMin + overhead),
      max: Math.round(totalMax + overhead),
      likely: Math.round(totalAvg + overhead)
    };
  }

  /**
   * Get user-friendly description of analysis depth
   */
  static getDescription(depth: AnalysisDepth): string {
    const descriptions = {
      [AnalysisDepth.QUICK]: '⚡ Quick scan - Essential issues only (~1 minute)',
      [AnalysisDepth.STANDARD]: '✅ Standard analysis - Recommended balance (~3-5 minutes)',
      [AnalysisDepth.THOROUGH]: '🔍 Thorough analysis - Comprehensive coverage (~7-10 minutes)',
      [AnalysisDepth.COMPLETE]: '🌟 Complete analysis - Every file, no limits (time varies)',
      [AnalysisDepth.CUSTOM]: '⚙️ Custom settings - User-defined parameters'
    };
    
    return descriptions[depth] || 'Unknown depth';
  }

  /**
   * Interactive prompt for user to select depth
   */
  static async promptUser(): Promise<AnalysisConfig> {
    console.log('\n📊 Select Analysis Depth:');
    console.log('1. ⚡ Quick (150 files, ~1 minute)');
    console.log('2. ✅ Standard (500 files, ~3-5 minutes) [DEFAULT]');
    console.log('3. 🔍 Thorough (1000 files, ~7-10 minutes)');
    console.log('4. 🌟 Complete (All files, no time limit)');
    console.log('5. ⚙️  Custom (Specify your own limits)');
    
    // In a real implementation, this would read from stdin
    // For now, return default
    return this.getConfig(AnalysisDepth.STANDARD);
  }
}

/**
 * Parallel Execution Orchestrator
 */
export class ParallelExecutor {
  private activeTools: Map<string, Promise<any>> = new Map();
  private startTime: number = Date.now();

  constructor(private config: AnalysisConfig) {}

  /**
   * Execute tools in parallel with smart batching
   */
  async executeTools(
    tools: Array<{
      name: string;
      language: string;
      execute: (files: string[]) => Promise<any>;
    }>,
    files: string[]
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    if (!this.config.parallelization.enabled) {
      // Sequential execution
      for (const tool of tools) {
        results.set(tool.name, await tool.execute(files));
      }
      return results;
    }

    // Parallel execution strategy
    const strategies = this.determineParallelStrategy(tools, files);
    
    // Execute based on strategy
    for (const strategy of strategies) {
      await this.executeStrategy(strategy, results);
    }

    return results;
  }

  /**
   * Determine optimal parallel execution strategy
   */
  private determineParallelStrategy(tools: any[], files: string[]) {
    const fileCount = files.length;
    const toolCount = tools.length;
    const maxConcurrent = this.config.parallelization.maxConcurrentTools;

    // Strategy 1: Tool-level parallelism (best for different tools)
    if (toolCount <= maxConcurrent) {
      return [{
        type: 'tool-parallel',
        groups: [tools],
        files
      }];
    }

    // Strategy 2: Mixed parallelism (tools and files)
    if (fileCount > this.config.parallelization.maxFilesPerBatch) {
      const fileBatches = this.chunkFiles(files, this.config.parallelization.maxFilesPerBatch);
      const toolGroups = this.chunkArray(tools, maxConcurrent);
      
      return toolGroups.map((group, i) => ({
        type: 'mixed-parallel',
        groups: [group],
        files: fileBatches[i % fileBatches.length]
      }));
    }

    // Strategy 3: Tool groups (too many tools)
    const toolGroups = this.chunkArray(tools, maxConcurrent);
    return toolGroups.map(group => ({
      type: 'tool-groups',
      groups: [group],
      files
    }));
  }

  /**
   * Execute a parallelization strategy
   */
  private async executeStrategy(strategy: any, results: Map<string, any>) {
    const promises: Promise<void>[] = [];
    
    for (const group of strategy.groups) {
      for (const tool of group) {
        // Check time limit
        if (this.shouldStop()) {
          console.log(`⏱️ Time limit reached, stopping analysis...`);
          break;
        }

        const promise = this.runTool(tool, strategy.files)
          .then(result => {
            results.set(tool.name, result);
            console.log(`✅ Completed: ${tool.name}`);
          })
          .catch(error => {
            console.error(`❌ Failed: ${tool.name}:`, error.message);
            results.set(tool.name, { error: error.message });
          });

        promises.push(promise);
        
        // Limit concurrent executions
        if (promises.length >= this.config.parallelization.maxConcurrentTools) {
          await Promise.race(promises);
          // Remove completed promises
          promises.splice(0, promises.findIndex(p => p));
        }
      }
    }

    // Wait for remaining tools
    await Promise.all(promises);
  }

  /**
   * Run a single tool with monitoring
   */
  private async runTool(tool: any, files: string[]): Promise<any> {
    console.log(`🔧 Starting: ${tool.name} (${files.length} files)`);
    
    const toolPromise = tool.execute(files);
    this.activeTools.set(tool.name, toolPromise);
    
    try {
      const result = await toolPromise;
      return result;
    } finally {
      this.activeTools.delete(tool.name);
    }
  }

  /**
   * Check if time limit exceeded
   */
  private shouldStop(): boolean {
    if (!this.config.maxTime) return false;
    
    const elapsed = (Date.now() - this.startTime) / 1000;
    return elapsed > this.config.maxTime;
  }

  /**
   * Chunk files into batches
   */
  private chunkFiles(files: string[], size: number): string[][] {
    const chunks: string[][] = [];
    for (let i = 0; i < files.length; i += size) {
      chunks.push(files.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Chunk array into groups
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get current status
   */
  getStatus(): { 
    elapsed: number; 
    activeTools: string[]; 
    timeRemaining?: number 
  } {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const activeTools = Array.from(this.activeTools.keys());
    
    const timeRemaining = this.config.maxTime 
      ? Math.max(0, this.config.maxTime - elapsed)
      : undefined;

    return { elapsed, activeTools, timeRemaining };
  }
}

/**
 * Export convenience functions
 */
export function createQuickAnalysis(customFiles?: number): AnalysisConfig {
  return AnalysisDepthManager.getConfig(AnalysisDepth.QUICK, {
    maxFiles: customFiles
  });
}

export function createStandardAnalysis(customFiles?: number): AnalysisConfig {
  return AnalysisDepthManager.getConfig(AnalysisDepth.STANDARD, {
    maxFiles: customFiles
  });
}

export function createThoroughAnalysis(customFiles?: number): AnalysisConfig {
  return AnalysisDepthManager.getConfig(AnalysisDepth.THOROUGH, {
    maxFiles: customFiles
  });
}

export function createCompleteAnalysis(): AnalysisConfig {
  return AnalysisDepthManager.getConfig(AnalysisDepth.COMPLETE);
}

export function createCustomAnalysis(
  maxFiles: number,
  maxTime: number,
  maxConcurrentTools: number = 4
): AnalysisConfig {
  return AnalysisDepthManager.getConfig(AnalysisDepth.CUSTOM, {
    maxFiles,
    maxTime,
    parallelization: {
      enabled: true,
      maxConcurrentTools,
      maxFilesPerBatch: Math.ceil(maxFiles / maxConcurrentTools)
    },
    priorities: {
      prChanges: true,
      securityFirst: true,
      skipTests: maxFiles < 200
    }
  });
}