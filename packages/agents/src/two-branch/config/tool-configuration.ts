/**
 * Tool Configuration System
 * 
 * Centralizes tool categorization and configuration
 * Makes it easy to enable/disable tool categories
 */

export type ToolCategory = 'core' | 'optional' | 'commercial' | 'external';

export interface ToolConfig {
  name: string;
  category: ToolCategory;
  languages?: string[];  // Applicable languages
  requiresConfig?: string[];  // Required config files
  requiresRuntime?: string[];  // Required runtime (node, python, etc.)
  fallback?: string;  // Fallback tool if this one fails
  enabled?: boolean;  // Override to force enable/disable
}

/**
 * Master tool configuration
 * Single source of truth for all tools
 */
export const TOOL_CONFIGURATION: Record<string, ToolConfig> = {
  // ========== SECURITY TOOLS ==========
  'semgrep': {
    name: 'semgrep',
    category: 'core',
    languages: ['javascript', 'typescript', 'python', 'java', 'go', 'ruby'],
  },
  
  'npm-audit': {
    name: 'npm-audit',
    category: 'core',
    languages: ['javascript', 'typescript'],
    requiresConfig: ['package.json'],
  },
  
  'trivy': {
    name: 'trivy',
    category: 'core',
    // Works for containers and various languages
  },
  
  'gitleaks': {
    name: 'gitleaks',
    category: 'core',
    // Language agnostic - scans for secrets
  },
  
  'snyk': {
    name: 'snyk',
    category: 'commercial',
    fallback: 'npm-audit',
  },
  
  'veracode': {
    name: 'veracode',
    category: 'commercial',
    fallback: 'semgrep',
  },
  
  // ========== CODE QUALITY TOOLS ==========
  'eslint': {
    name: 'eslint',
    category: 'core',
    languages: ['javascript', 'typescript'],
    requiresConfig: ['.eslintrc', '.eslintrc.json', '.eslintrc.js', 'package.json'],
  },
  
  'complexity': {
    name: 'complexity',
    category: 'core',
    languages: ['javascript', 'typescript'],
  },
  
  'jscpd': {
    name: 'jscpd',
    category: 'core',
    // Multi-language copy-paste detector
  },
  
  'sonarjs': {
    name: 'sonarjs',
    category: 'core',
    languages: ['javascript', 'typescript'],
  },
  
  'prettier': {
    name: 'prettier',
    category: 'optional',
    languages: ['javascript', 'typescript', 'css', 'html', 'json'],
    requiresConfig: ['.prettierrc', '.prettierrc.json', '.prettierrc.js'],
  },
  
  'tslint': {
    name: 'tslint',
    category: 'optional',
    languages: ['typescript'],  // TypeScript only
    requiresConfig: ['tslint.json'],
  },
  
  // ========== DEPENDENCY TOOLS ==========
  'yarn-audit': {
    name: 'yarn-audit',
    category: 'core',
    languages: ['javascript', 'typescript'],
    requiresConfig: ['yarn.lock'],
  },
  
  'retire-js': {
    name: 'retire-js',
    category: 'core',
    languages: ['javascript', 'typescript'],
  },
  
  'license-checker': {
    name: 'license-checker',
    category: 'core',
    languages: ['javascript', 'typescript'],
    requiresConfig: ['package.json'],
  },
  
  'npm-outdated': {
    name: 'npm-outdated',
    category: 'core',
    languages: ['javascript', 'typescript'],
    requiresConfig: ['package.json'],
  },
  
  'depcheck': {
    name: 'depcheck',
    category: 'core',
    languages: ['javascript', 'typescript'],
    requiresConfig: ['package.json'],
  },
  
  'npm-check': {
    name: 'npm-check',
    category: 'core',
    languages: ['javascript', 'typescript'],
    requiresConfig: ['package.json'],
  },
  
  'bundlephobia': {
    name: 'bundlephobia',
    category: 'external',  // Requires external API
    languages: ['javascript', 'typescript'],
  },
  
  'cost-of-modules': {
    name: 'cost-of-modules',
    category: 'external',  // Requires npm registry
    languages: ['javascript', 'typescript'],
  },
  
  // ========== ARCHITECTURE TOOLS ==========
  'madge': {
    name: 'madge',
    category: 'core',
    languages: ['javascript', 'typescript'],
  },
  
  'dependency-cruiser': {
    name: 'dependency-cruiser',
    category: 'core',
    languages: ['javascript', 'typescript'],
  },
  
  'complexity-report': {
    name: 'complexity-report',
    category: 'core',
    languages: ['javascript', 'typescript'],
  },
  
  'eslint-plugin-sonarjs': {
    name: 'eslint-plugin-sonarjs',
    category: 'core',
    languages: ['javascript', 'typescript'],
  },
  
  'arkit': {
    name: 'arkit',
    category: 'optional',  // Visualization tool
    languages: ['javascript', 'typescript'],
  },
  
  'plato': {
    name: 'plato',
    category: 'optional',  // Visualization tool
    languages: ['javascript', 'typescript'],
  },
  
  'structure101': {
    name: 'structure101',
    category: 'commercial',
    fallback: 'madge',
  },
  
  'pyreverse': {
    name: 'pyreverse',
    category: 'core',
    languages: ['python'],
  },
  
  'radon': {
    name: 'radon',
    category: 'core',
    languages: ['python'],
  },
  
  // ========== PERFORMANCE TOOLS ==========
  'lighthouse': {
    name: 'lighthouse',
    category: 'core',
    languages: ['javascript', 'typescript'],
    requiresRuntime: ['chrome', 'chromium'],
  },
  
  'webpack-bundle-analyzer': {
    name: 'webpack-bundle-analyzer',
    category: 'core',
    languages: ['javascript', 'typescript'],
    requiresConfig: ['webpack.config.js'],
  },
  
  'memory-profiler': {
    name: 'memory-profiler',
    category: 'core',
    // Language-specific implementations
  },
  
  'cpu-profiler': {
    name: 'cpu-profiler',
    category: 'core',
    // Language-specific implementations
  },
  
  'database-analyzer': {
    name: 'database-analyzer',
    category: 'core',
    // Analyzes database queries in code
  },
  
  'network-analyzer': {
    name: 'network-analyzer',
    category: 'core',
    // Analyzes network calls in code
  },
  
  'cache-analyzer': {
    name: 'cache-analyzer',
    category: 'core',
    // Analyzes caching patterns
  },
  
  'speedscope': {
    name: 'speedscope',
    category: 'external',  // Requires profile data
    requiresRuntime: ['profile-data'],
  },
  
  'clinic': {
    name: 'clinic',
    category: 'external',  // Requires Node.js app running
    languages: ['javascript', 'typescript'],
    requiresRuntime: ['node'],
  },
  
  'autocannon': {
    name: 'autocannon',
    category: 'external',  // Requires running server
    languages: ['javascript', 'typescript'],
    requiresRuntime: ['server'],
  },
  
  // ========== LANGUAGE-SPECIFIC TOOLS ==========
  
  // Python
  'bandit': {
    name: 'bandit',
    category: 'core',
    languages: ['python'],
  },
  
  'pylint': {
    name: 'pylint',
    category: 'core',
    languages: ['python'],
  },
  
  'mypy': {
    name: 'mypy',
    category: 'core',
    languages: ['python'],
  },
  
  'safety': {
    name: 'safety',
    category: 'core',
    languages: ['python'],
    requiresConfig: ['requirements.txt', 'Pipfile', 'pyproject.toml'],
  },
  
  // Ruby
  'brakeman': {
    name: 'brakeman',
    category: 'core',
    languages: ['ruby'],
  },
  
  'rubocop': {
    name: 'rubocop',
    category: 'core',
    languages: ['ruby'],
  },
  
  'bundler-audit': {
    name: 'bundler-audit',
    category: 'core',
    languages: ['ruby'],
    requiresConfig: ['Gemfile.lock'],
  },
  
  // Go
  'gosec': {
    name: 'gosec',
    category: 'core',
    languages: ['go'],
  },
  
  'staticcheck': {
    name: 'staticcheck',
    category: 'core',
    languages: ['go'],
  },
  
  // Rust
  'cargo-audit': {
    name: 'cargo-audit',
    category: 'core',
    languages: ['rust'],
    requiresConfig: ['Cargo.lock'],
  },
  
  'clippy': {
    name: 'clippy',
    category: 'core',
    languages: ['rust'],
  },
  
  // PHP
  'psalm': {
    name: 'psalm',
    category: 'core',
    languages: ['php'],
  },
  
  'phpcs': {
    name: 'phpcs',
    category: 'core',
    languages: ['php'],
  },
};

/**
 * Configuration helper class
 */
export class ToolConfigurationManager {
  private enabledCategories: Set<ToolCategory>;
  private forceEnabled: Set<string>;
  private forceDisabled: Set<string>;
  
  constructor() {
    // By default, enable core tools only
    this.enabledCategories = new Set(['core']);
    this.forceEnabled = new Set();
    this.forceDisabled = new Set();
    
    // Check environment variables
    if (process.env.ENABLE_OPTIONAL_TOOLS === 'true') {
      this.enabledCategories.add('optional');
    }
    
    if (process.env.ENABLE_COMMERCIAL_TOOLS === 'true') {
      this.enabledCategories.add('commercial');
    }
    
    if (process.env.ENABLE_EXTERNAL_TOOLS === 'true') {
      this.enabledCategories.add('external');
    }
  }
  
  /**
   * Check if a tool should be executed
   */
  isToolEnabled(toolName: string, language?: string): boolean {
    // Check force enable/disable first
    if (this.forceDisabled.has(toolName)) return false;
    if (this.forceEnabled.has(toolName)) return true;
    
    const config = TOOL_CONFIGURATION[toolName];
    if (!config) return false;
    
    // Check category
    if (!this.enabledCategories.has(config.category)) {
      return false;
    }
    
    // Check language compatibility
    if (language && config.languages && !config.languages.includes(language)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get fallback tool if available
   */
  getFallbackTool(toolName: string): string | undefined {
    return TOOL_CONFIGURATION[toolName]?.fallback;
  }
  
  /**
   * Get required config files for a tool
   */
  getRequiredConfigs(toolName: string): string[] {
    return TOOL_CONFIGURATION[toolName]?.requiresConfig || [];
  }
  
  /**
   * Get tools for a specific category
   */
  getToolsByCategory(category: ToolCategory): string[] {
    return Object.entries(TOOL_CONFIGURATION)
      .filter(([_, config]) => config.category === category)
      .map(([name]) => name);
  }
  
  /**
   * Get enabled tools for a language
   */
  getEnabledToolsForLanguage(language: string): string[] {
    return Object.entries(TOOL_CONFIGURATION)
      .filter(([name, config]) => {
        if (!this.isToolEnabled(name, language)) return false;
        if (config.languages && !config.languages.includes(language)) return false;
        return true;
      })
      .map(([name]) => name);
  }
  
  /**
   * Enable a category of tools
   */
  enableCategory(category: ToolCategory) {
    this.enabledCategories.add(category);
  }
  
  /**
   * Disable a category of tools
   */
  disableCategory(category: ToolCategory) {
    this.enabledCategories.delete(category);
  }
  
  /**
   * Force enable a specific tool
   */
  forceEnableTool(toolName: string) {
    this.forceEnabled.add(toolName);
    this.forceDisabled.delete(toolName);
  }
  
  /**
   * Force disable a specific tool
   */
  forceDisableTool(toolName: string) {
    this.forceDisabled.add(toolName);
    this.forceEnabled.delete(toolName);
  }
}

// Export singleton instance
export const toolConfig = new ToolConfigurationManager();