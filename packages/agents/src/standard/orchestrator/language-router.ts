/**
 * Language Router - Intelligent Tool Selection by Language
 * Routes analysis requests to appropriate tools based on detected language
 */

import { CloudAnalysisClient } from '../../two-branch/services/CloudAnalysisClient';

export interface LanguageConfig {
  primary: string;
  extensions: string[];
  tools: {
    security: string[];
    quality: string[];
    typeCheck?: string[];
    dependencies?: string[];
    performance?: string[];
    architecture?: string[];
  };
  agent: string;
  tier: 1 | 2 | 3; // Support tier
}

export interface LanguageDetectionResult {
  primary: string;
  secondary?: string[];
  confidence?: number;
  files?: {
    [language: string]: number;
  };
  suggestedTools?: string[];
  languages: Array<{name: string; percentage: number; files: number}>;
}

export class LanguageRouter {
  private cloudClient: CloudAnalysisClient;
  
  // Comprehensive language configuration
  private readonly languageConfigs: Map<string, LanguageConfig> = new Map([
    // Tier 1: Full Support
    ['javascript', {
      primary: 'javascript',
      extensions: ['.js', '.jsx', '.mjs'],
      tools: {
        security: ['semgrep', 'eslint'],
        quality: ['eslint', 'jshint'],
        dependencies: ['npm-audit', 'dep-cruiser'],
        performance: ['lighthouse'],
        architecture: ['madge', 'dep-cruiser']
      },
      agent: 'JavaScriptAgent',
      tier: 1
    }],
    
    ['typescript', {
      primary: 'typescript',
      extensions: ['.ts', '.tsx'],
      tools: {
        security: ['semgrep', 'eslint'],
        quality: ['eslint', 'tsc'],
        typeCheck: ['tsc'],
        dependencies: ['npm-audit', 'dep-cruiser'],
        performance: ['lighthouse'],
        architecture: ['madge', 'dep-cruiser']
      },
      agent: 'TypeScriptAgent',
      tier: 1
    }],
    
    ['python', {
      primary: 'python',
      extensions: ['.py', '.pyw'],
      tools: {
        security: ['bandit', 'semgrep', 'safety'],
        quality: ['pylint', 'flake8'],
        typeCheck: ['mypy'],
        dependencies: ['safety'],
        performance: ['py-spy'],
        architecture: ['pydeps']
      },
      agent: 'PythonAgent',
      tier: 1
    }],
    
    // Tier 2: Good Support
    ['java', {
      primary: 'java',
      extensions: ['.java'],
      tools: {
        security: ['semgrep', 'spotbugs'],
        quality: ['checkstyle', 'pmd'],
        typeCheck: ['javac'],
        dependencies: ['owasp-dependency-check'],
        performance: ['jmh'],
        architecture: ['jdepend']
      },
      agent: 'JavaAgent',
      tier: 2
    }],
    
    ['go', {
      primary: 'go',
      extensions: ['.go'],
      tools: {
        security: ['gosec', 'semgrep'],
        quality: ['golangci-lint', 'go-vet'],
        typeCheck: ['go-build'],
        dependencies: ['go-mod-audit'],
        performance: ['go-bench'],
        architecture: ['go-arch']
      },
      agent: 'GoAgent',
      tier: 2
    }],
    
    ['csharp', {
      primary: 'csharp',
      extensions: ['.cs'],
      tools: {
        security: ['semgrep', 'security-scan'],
        quality: ['roslyn-analyzers'],
        typeCheck: ['dotnet-build'],
        dependencies: ['dotnet-audit'],
        performance: ['dotnet-trace'],
        architecture: ['ndepend']
      },
      agent: 'CSharpAgent',
      tier: 2
    }],
    
    ['cpp', {
      primary: 'cpp',
      extensions: ['.cpp', '.cc', '.cxx', '.c++', '.hpp', '.h'],
      tools: {
        security: ['cppcheck', 'semgrep'],
        quality: ['cppcheck', 'clang-tidy'],
        typeCheck: ['clang'],
        dependencies: ['conan-audit'],
        performance: ['valgrind'],
        architecture: ['doxygen']
      },
      agent: 'CppAgent',
      tier: 2
    }],
    
    ['c', {
      primary: 'c',
      extensions: ['.c', '.h'],
      tools: {
        security: ['cppcheck', 'semgrep'],
        quality: ['cppcheck', 'clang-tidy'],
        typeCheck: ['gcc'],
        dependencies: [],
        performance: ['valgrind'],
        architecture: ['cflow']
      },
      agent: 'CAgent',
      tier: 2
    }],
    
    // Tier 3: Basic Support
    ['ruby', {
      primary: 'ruby',
      extensions: ['.rb', '.erb'],
      tools: {
        security: ['brakeman', 'semgrep'],
        quality: ['rubocop'],
        typeCheck: ['sorbet'],
        dependencies: ['bundler-audit'],
        performance: ['ruby-prof'],
        architecture: ['reek']
      },
      agent: 'RubyAgent',
      tier: 3
    }],
    
    ['php', {
      primary: 'php',
      extensions: ['.php'],
      tools: {
        security: ['psalm', 'semgrep'],
        quality: ['phpcs', 'phpstan'],
        typeCheck: ['phpstan'],
        dependencies: ['composer-audit'],
        performance: ['blackfire'],
        architecture: ['pdepend']
      },
      agent: 'PhpAgent',
      tier: 3
    }],
    
    ['rust', {
      primary: 'rust',
      extensions: ['.rs'],
      tools: {
        security: ['cargo-audit', 'semgrep'],
        quality: ['clippy'],
        typeCheck: ['cargo-check'],
        dependencies: ['cargo-audit'],
        performance: ['cargo-bench'],
        architecture: ['cargo-deps']
      },
      agent: 'RustAgent',
      tier: 3
    }],
    
    ['swift', {
      primary: 'swift',
      extensions: ['.swift'],
      tools: {
        security: ['semgrep'],
        quality: ['swiftlint'],
        typeCheck: ['swift-build'],
        dependencies: ['swift-pm-audit'],
        performance: ['instruments'],
        architecture: ['swift-deps']
      },
      agent: 'SwiftAgent',
      tier: 3
    }],
    
    ['kotlin', {
      primary: 'kotlin',
      extensions: ['.kt', '.kts'],
      tools: {
        security: ['semgrep', 'detekt'],
        quality: ['ktlint', 'detekt'],
        typeCheck: ['kotlinc'],
        dependencies: ['gradle-audit'],
        performance: ['jmh'],
        architecture: ['gradle-deps']
      },
      agent: 'KotlinAgent',
      tier: 3
    }],
    
    ['objectivec', {
      primary: 'objectivec',
      extensions: ['.m', '.mm', '.h'],
      tools: {
        security: ['semgrep', 'oclint'],
        quality: ['oclint', 'clang-format'],
        typeCheck: ['clang'],
        dependencies: ['cocoapods-audit'],
        performance: ['instruments'],
        architecture: ['objc-dependency-visualizer']
      },
      agent: 'ObjectiveCAgent',
      tier: 3
    }],
    
    ['scala', {
      primary: 'scala',
      extensions: ['.scala'],
      tools: {
        security: ['semgrep'],
        quality: ['scalastyle', 'scalafix'],
        typeCheck: ['scalac'],
        dependencies: ['sbt-dependency-check'],
        performance: ['jmh'],
        architecture: ['sbt-dependency-graph']
      },
      agent: 'ScalaAgent',
      tier: 3
    }],
    
    ['dart', {
      primary: 'dart',
      extensions: ['.dart'],
      tools: {
        security: ['semgrep'],
        quality: ['dart-analyze'],
        typeCheck: ['dart-analyze'],
        dependencies: ['pub-audit'],
        performance: ['dart-devtools'],
        architecture: ['dart-deps']
      },
      agent: 'DartAgent',
      tier: 3
    }]
  ]);

  // Tool availability mapping (what's actually installed on cloud server)
  private readonly availableTools = new Set([
    // Currently installed
    'eslint', 'semgrep', 'bandit', 'npm-audit', 'tsc',
    'pylint', 'mypy', 'safety', 'jshint', 'jscpd',
    'madge', 'dep-cruiser', 'cppcheck', 'cloc',
    
    // To be installed
    'spotbugs', 'checkstyle', 'pmd', 'gosec', 'golangci-lint',
    'brakeman', 'rubocop', 'phpstan', 'clippy', 'swiftlint',
    'ktlint', 'oclint', 'scalastyle', 'dart-analyze'
  ]);

  constructor() {
    this.cloudClient = new CloudAnalysisClient();
  }

  /**
   * Detect primary language from file extensions
   */
  async detectLanguage(files: string[]): Promise<LanguageDetectionResult> {
    const languageCounts: Map<string, number> = new Map();
    
    // Count files by extension
    for (const file of files) {
      const ext = this.getExtension(file);
      
      for (const [lang, config] of this.languageConfigs) {
        if (config.extensions.includes(ext)) {
          languageCounts.set(lang, (languageCounts.get(lang) || 0) + 1);
        }
      }
    }
    
    // Sort by count
    const sorted = Array.from(languageCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    
    if (sorted.length === 0) {
      return {
        primary: 'unknown',
        secondary: [],
        confidence: 0,
        files: {},
        suggestedTools: ['semgrep', 'cloc'], // Universal tools
        languages: []
      };
    }
    
    const primary = sorted[0][0];
    const secondary = sorted.slice(1).map(s => s[0]);
    const totalFiles = files.length;
    const primaryCount = sorted[0][1];
    const confidence = primaryCount / totalFiles;
    
    // Get suggested tools for primary language
    const primaryConfig = this.languageConfigs.get(primary);
    const suggestedTools = this.getToolsForLanguage(primary);
    
    return {
      primary,
      secondary,
      confidence,
      files: Object.fromEntries(languageCounts),
      suggestedTools,
      languages: sorted.map(([name, count]) => ({
        name,
        percentage: Math.round((count / totalFiles) * 100),
        files: count
      }))
    };
  }

  /**
   * Get all applicable tools for a language
   */
  getToolsForLanguage(language: string): string[] {
    const config = this.languageConfigs.get(language);
    if (!config) {
      // Fallback to universal tools
      return ['semgrep', 'jscpd', 'cloc'];
    }
    
    const tools = new Set<string>();
    
    // Add all tools from all categories
    Object.values(config.tools).forEach(categoryTools => {
      categoryTools.forEach(tool => {
        if (this.availableTools.has(tool)) {
          tools.add(tool);
        }
      });
    });
    
    // Always add universal tools
    tools.add('semgrep');
    tools.add('jscpd');
    tools.add('cloc');
    
    return Array.from(tools);
  }

  /**
   * Route analysis to appropriate agent and tools
   */
  async routeAnalysis(
    repository: string,
    language: string,
    categories: string[] = ['security', 'quality']
  ): Promise<Map<string, any>> {
    const config = this.languageConfigs.get(language);
    
    if (!config) {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    const results = new Map<string, any>();
    const tools: string[] = [];
    
    // Select tools based on requested categories
    for (const category of categories) {
      const categoryTools = config.tools[category as keyof typeof config.tools];
      if (categoryTools) {
        tools.push(...categoryTools.filter(t => this.availableTools.has(t)));
      }
    }
    
    // Remove duplicates
    const uniqueTools = Array.from(new Set(tools));
    
    // Execute analysis with selected tools
    if (uniqueTools.length > 0) {
      const batchResults = await this.cloudClient.batchAnalyze(
        repository,
        uniqueTools,
        { branch: 'main' }
      );
      
      for (const [tool, result] of batchResults) {
        results.set(tool, result);
      }
    }
    
    return results;
  }

  /**
   * Get agent for language
   */
  getAgentForLanguage(language: string): string {
    const config = this.languageConfigs.get(language);
    return config?.agent || 'GeneralAgent';
  }

  /**
   * Get language configuration
   */
  getLanguageConfig(language: string): LanguageConfig | undefined {
    return this.languageConfigs.get(language.toLowerCase());
  }

  /**
   * Check if a tool is available on the cloud server
   */
  async isToolAvailable(tool: string): Promise<boolean> {
    // For now, check against known available tools
    // In production, this would query the cloud server
    return this.availableTools.has(tool);
  }

  /**
   * Detect language from repository
   */
  async detectFromRepository(repositoryPath: string): Promise<LanguageDetectionResult> {
    // Simplified detection - in production would analyze files
    // For now, use the repository name as a hint
    const repoName = repositoryPath.toLowerCase();
    
    let primary = 'typescript';
    if (repoName.includes('ios') || repoName.includes('objc')) {
      primary = 'objectivec';
    } else if (repoName.includes('android') || repoName.includes('java')) {
      primary = 'java';
    } else if (repoName.includes('ml') || repoName.includes('python')) {
      primary = 'python';
    }
    
    return {
      primary,
      languages: [
        { name: primary, percentage: 80, files: 100 }
      ]
    };
  }

  /**
   * Get support tier for language
   */
  getSupportTier(language: string): number {
    const config = this.languageConfigs.get(language);
    return config?.tier || 3;
  }

  /**
   * Check if language is fully supported
   */
  isFullySupported(language: string): boolean {
    const config = this.languageConfigs.get(language);
    return config?.tier === 1;
  }

  /**
   * Get installation script for missing tools
   */
  getMissingToolsScript(language: string): string {
    const config = this.languageConfigs.get(language);
    if (!config) return '';
    
    const missing: string[] = [];
    Object.values(config.tools).forEach(tools => {
      tools.forEach(tool => {
        if (!this.availableTools.has(tool)) {
          missing.push(tool);
        }
      });
    });
    
    if (missing.length === 0) return '';
    
    // Generate installation commands
    const commands: string[] = [];
    
    if (missing.includes('spotbugs') || missing.includes('checkstyle')) {
      commands.push('# Java tools');
      commands.push('apt-get install -y default-jdk maven');
      if (missing.includes('spotbugs')) {
        commands.push('wget https://github.com/spotbugs/spotbugs/releases/download/4.7.3/spotbugs-4.7.3.tgz');
        commands.push('tar -xzf spotbugs-4.7.3.tgz -C /opt/');
      }
    }
    
    if (missing.includes('gosec') || missing.includes('golangci-lint')) {
      commands.push('# Go tools');
      commands.push('snap install go --classic');
      if (missing.includes('gosec')) {
        commands.push('go install github.com/securego/gosec/v2/cmd/gosec@latest');
      }
      if (missing.includes('golangci-lint')) {
        commands.push('curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b /usr/local/bin');
      }
    }
    
    if (missing.includes('brakeman') || missing.includes('rubocop')) {
      commands.push('# Ruby tools');
      commands.push('apt-get install -y ruby-full');
      commands.push(`gem install ${missing.filter(t => ['brakeman', 'rubocop', 'bundler-audit'].includes(t)).join(' ')}`);
    }
    
    if (missing.includes('phpstan') || missing.includes('phpcs')) {
      commands.push('# PHP tools');
      commands.push('apt-get install -y php php-xml php-mbstring composer');
      commands.push('composer global require phpstan/phpstan squizlabs/php_codesniffer');
    }
    
    if (missing.includes('clippy')) {
      commands.push('# Rust tools');
      commands.push('curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh');
      commands.push('cargo install clippy cargo-audit');
    }
    
    if (missing.includes('swiftlint')) {
      commands.push('# Swift tools (Linux)');
      commands.push('wget https://swift.org/builds/swift-5.9-release/ubuntu2204/swift-5.9-RELEASE/swift-5.9-RELEASE-ubuntu22.04.tar.gz');
      commands.push('# Note: SwiftLint requires additional setup');
    }
    
    if (missing.includes('ktlint') || missing.includes('detekt')) {
      commands.push('# Kotlin tools');
      commands.push('curl -sSLO https://github.com/pinterest/ktlint/releases/download/0.50.0/ktlint');
      commands.push('chmod +x ktlint && mv ktlint /usr/local/bin/');
    }
    
    if (missing.includes('oclint')) {
      commands.push('# Objective-C tools');
      commands.push('wget https://github.com/oclint/oclint/releases/download/v22.02/oclint-22.02-llvm-13.0.1-x86_64-linux-ubuntu-20.04.tar.gz');
      commands.push('tar -xzf oclint-*.tar.gz -C /opt/');
    }
    
    return commands.join('\n');
  }

  /**
   * Get comprehensive language support matrix
   */
  getLanguageSupportMatrix(): any {
    const matrix: any[] = [];
    
    for (const [lang, config] of this.languageConfigs) {
      const availableTools = Object.values(config.tools)
        .flat()
        .filter(tool => this.availableTools.has(tool));
      
      const totalTools = Object.values(config.tools).flat().length;
      const coverage = availableTools.length / totalTools * 100;
      
      matrix.push({
        language: lang,
        tier: config.tier,
        coverage: Math.round(coverage),
        availableTools: availableTools.length,
        totalTools,
        agent: config.agent,
        status: coverage === 100 ? 'ready' : coverage > 50 ? 'partial' : 'pending'
      });
    }
    
    return matrix.sort((a, b) => a.tier - b.tier);
  }

  private getExtension(file: string): string {
    const lastDot = file.lastIndexOf('.');
    return lastDot > 0 ? file.substring(lastDot) : '';
  }
}

/**
 * Language-specific agent factory
 */
export class LanguageAgentFactory {
  private router: LanguageRouter;
  
  constructor() {
    this.router = new LanguageRouter();
  }
  
  /**
   * Create appropriate agent for detected language
   */
  async createAgent(
    files: string[],
    repository: string
  ): Promise<{
    agent: string;
    language: string;
    tools: string[];
    confidence: number;
  }> {
    // Detect language
    const detection = await this.router.detectLanguage(files);
    
    // Get agent
    const agent = this.router.getAgentForLanguage(detection.primary);
    
    // Get tools
    const tools = this.router.getToolsForLanguage(detection.primary);
    
    return {
      agent,
      language: detection.primary,
      tools,
      confidence: detection.confidence
    };
  }
  
  /**
   * Execute full analysis with appropriate tools
   */
  async analyzeRepository(
    repository: string,
    files: string[],
    categories: string[] = ['security', 'quality', 'dependencies']
  ): Promise<{
    language: string;
    agent: string;
    results: Map<string, any>;
    coverage: number;
    recommendations: string[];
  }> {
    // Detect language
    const detection = await this.router.detectLanguage(files);
    
    // Route to appropriate tools
    const results = await this.router.routeAnalysis(
      repository,
      detection.primary,
      categories
    );
    
    // Calculate coverage
    const tier = this.router.getSupportTier(detection.primary);
    const coverage = tier === 1 ? 100 : tier === 2 ? 70 : 30;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (tier > 1) {
      recommendations.push(`Language ${detection.primary} has Tier ${tier} support. Some tools may be missing.`);
      
      const installScript = this.router.getMissingToolsScript(detection.primary);
      if (installScript) {
        recommendations.push('To enable full support, install missing tools on the cloud server.');
      }
    }
    
    if (detection.secondary.length > 0) {
      recommendations.push(`Mixed languages detected: ${detection.secondary.join(', ')}. Consider separate analysis.`);
    }
    
    if (detection.confidence < 0.8) {
      recommendations.push(`Low confidence (${Math.round(detection.confidence * 100)}%) in language detection. Manual verification recommended.`);
    }
    
    return {
      language: detection.primary,
      agent: this.router.getAgentForLanguage(detection.primary),
      results,
      coverage,
      recommendations
    };
  }
}