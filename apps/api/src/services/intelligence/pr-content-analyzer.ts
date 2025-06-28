import { createLogger } from '@codequal/core/utils';

export interface PRFile {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface PRContentAnalysis {
  // File type categorization
  fileTypes: string[];           // ['.js', '.ts', '.md', '.css']
  fileCategories: FileCategory[];
  
  // Change type analysis
  changeTypes: ChangeType[];     // ['ui-only', 'docs-only', 'config-only', 'core-logic']
  impactedAreas: ImpactArea[];   // ['frontend', 'backend', 'tests', 'docs']
  
  // Complexity metrics
  complexity: 'trivial' | 'moderate' | 'complex';
  riskLevel: 'low' | 'medium' | 'high';
  totalChanges: number;
  
  // Agent recommendations
  agentsToSkip: string[];
  agentsToKeep: string[];
  skipReasons: Record<string, string>;
}

export type FileCategory = 'code' | 'test' | 'documentation' | 'configuration' | 'style' | 'asset';
export type ChangeType = 'docs-only' | 'ui-only' | 'test-only' | 'config-only' | 'style-only' | 
                        'dependency-update' | 'feature' | 'bugfix' | 'refactor' | 'mixed';
export type ImpactArea = 'frontend' | 'backend' | 'database' | 'tests' | 'docs' | 'infra' | 'deps';

// Agent skipping rules based on change types
const AGENT_SKIPPING_RULES: Record<ChangeType, { skip: string[], keep: string[] }> = {
  'docs-only': {
    skip: ['security', 'performance', 'dependencies', 'architecture'],
    keep: ['codeQuality'] // Only documentation quality matters
  },
  'ui-only': {
    skip: ['security', 'dependencies', 'architecture'], 
    keep: ['codeQuality', 'performance'] // UI performance and quality critical
  },
  'test-only': {
    skip: ['security', 'performance', 'dependencies'],
    keep: ['codeQuality', 'architecture'] // Test structure and quality
  },
  'config-only': {
    skip: ['performance', 'codeQuality'],
    keep: ['security', 'dependencies', 'architecture'] // Config security, deps & architecture critical
  },
  'style-only': {
    skip: ['security', 'performance', 'dependencies', 'architecture'],
    keep: ['codeQuality'] // Pure formatting/style changes
  },
  'dependency-update': {
    skip: ['architecture', 'performance', 'codeQuality'],
    keep: ['security', 'dependencies'] // Security scan critical
  },
  'feature': {
    skip: [], // Keep all agents for new features
    keep: ['security', 'architecture', 'performance', 'dependencies', 'codeQuality']
  },
  'bugfix': {
    skip: [], // Keep all agents for bug fixes
    keep: ['security', 'architecture', 'performance', 'dependencies', 'codeQuality']
  },
  'refactor': {
    skip: ['dependencies', 'security'], // Usually no dep or security changes in refactors
    keep: ['architecture', 'performance', 'codeQuality']
  },
  'mixed': {
    skip: [], // Mixed changes need full analysis
    keep: ['security', 'architecture', 'performance', 'dependencies', 'codeQuality']
  }
};

export class PRContentAnalyzer {
  private readonly logger = createLogger('PRContentAnalyzer');
  
  /**
   * Analyze PR content to determine which agents to skip
   */
  async analyzePR(files: PRFile[]): Promise<PRContentAnalysis> {
    this.logger.info('Analyzing PR content', { fileCount: files.length });
    
    // Categorize files
    const fileAnalysis = this.categorizeFiles(files);
    
    // Determine change types with more context
    const changeTypes = this.determineChangeTypes(fileAnalysis, files);
    
    // Calculate complexity
    const complexity = this.calculateComplexity(files);
    const riskLevel = this.assessRiskLevel(fileAnalysis, complexity);
    
    // Analyze file content patterns for better agent selection
    const contentPatterns = this.analyzeContentPatterns(files);
    
    // Determine which agents to skip with enhanced logic
    const agentRecommendations = this.determineAgentRecommendations(
      changeTypes, 
      riskLevel,
      fileAnalysis,
      contentPatterns
    );
    
    const analysis: PRContentAnalysis = {
      fileTypes: fileAnalysis.fileTypes,
      fileCategories: fileAnalysis.categories,
      changeTypes,
      impactedAreas: fileAnalysis.impactedAreas,
      complexity,
      riskLevel,
      totalChanges: files.reduce((sum, f) => sum + f.changes, 0),
      ...agentRecommendations
    };
    
    this.logger.info('PR analysis complete', {
      changeTypes,
      complexity,
      agentsToSkip: analysis.agentsToSkip
    });
    
    return analysis;
  }
  
  private categorizeFiles(files: PRFile[]): {
    fileTypes: string[];
    categories: FileCategory[];
    impactedAreas: ImpactArea[];
  } {
    const fileTypes = new Set<string>();
    const categories = new Set<FileCategory>();
    const impactedAreas = new Set<ImpactArea>();
    
    for (const file of files) {
      const ext = this.getFileExtension(file.filename);
      fileTypes.add(ext);
      
      // Categorize by file type
      const category = this.getFileCategory(file.filename);
      categories.add(category);
      
      // Determine impacted areas
      const areas = this.getImpactedAreas(file.filename);
      areas.forEach(area => impactedAreas.add(area));
    }
    
    return {
      fileTypes: Array.from(fileTypes),
      categories: Array.from(categories),
      impactedAreas: Array.from(impactedAreas)
    };
  }
  
  private getFileExtension(filename: string): string {
    const match = filename.match(/\.[^.]+$/);
    return match ? match[0] : '';
  }
  
  private getFileCategory(filename: string): FileCategory {
    const lower = filename.toLowerCase();
    
    // Test files
    if (lower.includes('.test.') || lower.includes('.spec.') || 
        lower.includes('__tests__') || lower.includes('/test/')) {
      return 'test';
    }
    
    // Documentation
    if (lower.endsWith('.md') || lower.includes('/docs/') || 
        lower.includes('readme') || lower.includes('changelog')) {
      return 'documentation';
    }
    
    // Configuration
    if (lower.includes('config') || lower.endsWith('.json') || 
        lower.endsWith('.yml') || lower.endsWith('.yaml') ||
        lower.includes('.env') || lower.includes('package.json')) {
      return 'configuration';
    }
    
    // Style/Assets
    if (lower.endsWith('.css') || lower.endsWith('.scss') || 
        lower.endsWith('.less') || lower.includes('/assets/') ||
        lower.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)) {
      return 'style';
    }
    
    // Assets
    if (lower.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|ttf|mp4|mov)$/)) {
      return 'asset';
    }
    
    // Default to code
    return 'code';
  }
  
  private getImpactedAreas(filename: string): ImpactArea[] {
    const areas: ImpactArea[] = [];
    const lower = filename.toLowerCase();
    
    // Frontend patterns
    if (lower.includes('/frontend/') || lower.includes('/client/') || 
        lower.includes('/ui/') || lower.includes('/components/') ||
        lower.includes('/pages/') || lower.includes('/views/') ||
        (lower.includes('src/') && (lower.endsWith('.tsx') || lower.endsWith('.jsx') || lower.includes('hooks/')))) {
      areas.push('frontend');
    }
    
    // Backend patterns - be more specific
    if ((lower.includes('/backend/') || lower.includes('/server/') || 
         lower.includes('/api/') || lower.includes('/services/') ||
         lower.includes('/controllers/') || lower.includes('/middleware/')) &&
        !lower.includes('/test/') && !lower.includes('.test.')) {
      areas.push('backend');
    }
    
    // Core/shared services that might be backend
    if (lower.includes('src/core/') || lower.includes('src/patterns/') ||
        lower.includes('src/interfaces/')) {
      areas.push('backend');
    }
    
    if (lower.includes('/database/') || lower.includes('/migrations/') || 
        lower.includes('/models/') || lower.includes('.sql')) {
      areas.push('database');
    }
    
    if (lower.includes('/test/') || lower.includes('.test.') || 
        lower.includes('.spec.') || lower.includes('__tests__')) {
      areas.push('tests');
    }
    
    if (lower.includes('/docs/') || lower.endsWith('.md')) {
      areas.push('docs');
    }
    
    // Infrastructure - be more specific about config files
    if (lower.includes('/infra/') || lower.includes('/deploy/') || 
        lower.includes('dockerfile') || lower.includes('docker-compose') ||
        lower.includes('.github/workflows/') || 
        (lower.endsWith('.yml') && (lower.includes('ci') || lower.includes('deploy')))) {
      areas.push('infra');
    }
    
    // Dependencies - only actual dependency files
    if (lower === 'package.json' || lower === 'package-lock.json' ||
        lower.includes('requirements.txt') || lower.includes('requirements.pip') ||
        lower === 'gemfile' || lower === 'gemfile.lock' ||
        lower === 'go.mod' || lower === 'go.sum' ||
        lower === 'cargo.toml' || lower === 'cargo.lock') {
      areas.push('deps');
    }
    
    return areas;
  }
  
  private determineChangeTypes(fileAnalysis: {
    categories: FileCategory[];
    impactedAreas: ImpactArea[];
  }, files: PRFile[]): ChangeType[] {
    const types = new Set<ChangeType>();
    const { categories, impactedAreas } = fileAnalysis;
    
    // Priority 1: Check for dependency updates first
    if (impactedAreas.includes('deps')) {
      types.add('dependency-update');
      // If ONLY dependency files changed, return early
      if (categories.every(c => c === 'configuration') && 
          impactedAreas.every(a => a === 'deps')) {
        return Array.from(types);
      }
    }
    
    // Priority 2: Check for single-category changes
    if (categories.length === 1) {
      switch (categories[0]) {
        case 'documentation':
          types.add('docs-only');
          return Array.from(types);
        case 'test':
          types.add('test-only');
          return Array.from(types);
        case 'style':
          types.add('style-only');
          return Array.from(types);
      }
    }
    
    // Priority 3: Check for infrastructure/config changes
    if (impactedAreas.includes('infra') && 
        !impactedAreas.includes('backend') && 
        !impactedAreas.includes('frontend')) {
      types.add('config-only');
      // If only infra files, return early
      if (impactedAreas.length === 1) {
        return Array.from(types);
      }
    }
    
    // Priority 4: Check for UI-only changes
    if (!impactedAreas.includes('backend') && 
        !impactedAreas.includes('database') &&
        !impactedAreas.includes('infra') &&
        (impactedAreas.includes('frontend') || categories.includes('style'))) {
      types.add('ui-only');
      // If only frontend/style, return early
      if (categories.every(c => c === 'code' || c === 'style') &&
          impactedAreas.every(a => a === 'frontend' || a === 'docs')) {
        return Array.from(types);
      }
    }
    
    // Priority 5: Analyze code changes more intelligently
    if (categories.includes('code')) {
      const hasBackend = impactedAreas.includes('backend');
      const hasFrontend = impactedAreas.includes('frontend');
      const hasDatabase = impactedAreas.includes('database');
      const hasTests = impactedAreas.includes('tests');
      
      // Check if we have multiple different types of code files
      const hasMultipleAreas = [hasBackend, hasFrontend, hasDatabase].filter(Boolean).length > 1;
      
      // Architecture-focused changes (service/model/interface files)
      if (hasBackend && !hasFrontend && !hasDatabase && !hasTests) {
        // Pure backend refactoring
        types.add('refactor');
      } else if (hasMultipleAreas || (hasBackend && categories.length > 1)) {
        // Cross-cutting changes or mixed file types
        types.add('mixed');
      }
    }
    
    // If no specific type detected, it's mixed
    if (types.size === 0) {
      types.add('mixed');
    }
    
    // Special case: Check for mixed changes based on file patterns
    if (types.size > 0 && !types.has('mixed')) {
      // Check if we have both API controllers and utility files being changed
      const hasApiControllers = files.some(f => 
        f.filename.toLowerCase().includes('/api/') && 
        f.filename.toLowerCase().includes('controller'));
      const hasUtilFiles = files.some(f => 
        f.filename.toLowerCase().includes('/utils/') || 
        f.filename.toLowerCase().includes('/util/'));
      
      // If we have both API controllers and utilities with security issues, it's mixed
      if (hasApiControllers && hasUtilFiles && categories.includes('code')) {
        types.clear();
        types.add('mixed');
      }
    }
    
    return Array.from(types);
  }
  
  private calculateComplexity(files: PRFile[]): 'trivial' | 'moderate' | 'complex' {
    const totalChanges = files.reduce((sum, f) => sum + f.changes, 0);
    const fileCount = files.length;
    
    if (totalChanges < 50 && fileCount <= 3) {
      return 'trivial';
    } else if (totalChanges < 500 && fileCount <= 20) {
      return 'moderate';
    } else {
      return 'complex';
    }
  }
  
  private assessRiskLevel(
    fileAnalysis: { categories: FileCategory[]; impactedAreas: ImpactArea[] },
    complexity: 'trivial' | 'moderate' | 'complex'
  ): 'low' | 'medium' | 'high' {
    // High risk if touching database or security-sensitive areas
    if (fileAnalysis.impactedAreas.includes('database') || 
        fileAnalysis.categories.includes('configuration')) {
      return complexity === 'trivial' ? 'medium' : 'high';
    }
    
    // Low risk for docs/tests only
    if (fileAnalysis.categories.every(c => c === 'documentation' || c === 'test')) {
      return 'low';
    }
    
    // Map complexity to risk for other cases
    return complexity === 'trivial' ? 'low' : 
           complexity === 'moderate' ? 'medium' : 'high';
  }
  
  private analyzeContentPatterns(files: PRFile[]): {
    hasSecurityPatterns: boolean;
    hasPerformancePatterns: boolean;
    hasDependencyChanges: boolean;
    hasArchitecturePatterns: boolean;
    hasTestChanges: boolean;
    hasMixedSecurityIssues: boolean;
    hasAIMLPatterns: boolean;
    hasModelConfigChanges: boolean;
    hasPromptChanges: boolean;
    hasValidationChanges: boolean;
  } {
    let hasSecurityPatterns = false;
    let hasPerformancePatterns = false;
    let hasDependencyChanges = false;
    let hasArchitecturePatterns = false;
    let hasTestChanges = false;
    let hasMixedSecurityIssues = false;
    let hasAIMLPatterns = false;
    let hasModelConfigChanges = false;
    let hasPromptChanges = false;
    let hasValidationChanges = false;
    
    for (const file of files) {
      const filename = file.filename.toLowerCase();
      const patch = file.patch?.toLowerCase() || '';
      
      // AI/ML patterns - models, agents, prompts, embeddings
      if (filename.includes('model') || filename.includes('agent') || 
          filename.includes('prompt') || filename.includes('embedding') ||
          filename.includes('llm') || filename.includes('ai') || 
          filename.includes('ml') || filename.includes('neural') ||
          filename.includes('transformer') || filename.includes('gpt') ||
          filename.includes('claude') || filename.includes('openai')) {
        hasAIMLPatterns = true;
      }
      
      // Model configuration changes
      if ((filename.includes('config') || filename.includes('settings')) && 
          (filename.includes('model') || filename.includes('agent'))) {
        hasModelConfigChanges = true;
      }
      
      // Prompt engineering changes
      if (filename.includes('prompt') || filename.includes('template') ||
          patch.includes('system:') || patch.includes('user:') ||
          patch.includes('assistant:') || patch.includes('prompt')) {
        hasPromptChanges = true;
      }
      
      // Validation and hallucination detection patterns
      if (filename.includes('validat') || filename.includes('verif') ||
          filename.includes('hallucination') || filename.includes('fact-check') ||
          filename.includes('ground-truth') || filename.includes('retriev')) {
        hasValidationChanges = true;
      }
      
      // Security patterns
      if (filename.includes('auth') || filename.includes('security') || 
          filename.includes('login') || filename.includes('password') ||
          filename.includes('token') || filename.includes('crypto')) {
        hasSecurityPatterns = true;
      }
      
      // Check for SQL injection patterns in patches (for mixed changes detection)
      if (patch.includes('sql') && patch.includes('injection')) {
        hasMixedSecurityIssues = true;
      }
      
      // Performance patterns
      if (filename.includes('cache') || filename.includes('optim') ||
          filename.includes('perf') || filename.includes('worker') ||
          filename.includes('queue') || filename.includes('index')) {
        hasPerformancePatterns = true;
      }
      
      // Dependency changes
      if (filename === 'package.json' || filename === 'package-lock.json' ||
          filename.includes('requirements') || filename.includes('gemfile') ||
          filename.includes('go.mod') || filename.includes('cargo.toml')) {
        hasDependencyChanges = true;
      }
      
      // Architecture patterns
      if (filename.includes('service') || filename.includes('controller') ||
          filename.includes('model') || filename.includes('interface') ||
          filename.includes('schema') || filename.includes('migration')) {
        hasArchitecturePatterns = true;
      }
      
      // Test changes
      if (filename.includes('.test.') || filename.includes('.spec.') ||
          filename.includes('__tests__') || filename.includes('/test/')) {
        hasTestChanges = true;
      }
    }
    
    return {
      hasSecurityPatterns,
      hasPerformancePatterns,
      hasDependencyChanges,
      hasArchitecturePatterns,
      hasTestChanges,
      hasMixedSecurityIssues,
      hasAIMLPatterns,
      hasModelConfigChanges,
      hasPromptChanges,
      hasValidationChanges
    };
  }
  
  private determineAgentRecommendations(
    changeTypes: ChangeType[],
    riskLevel: 'low' | 'medium' | 'high',
    fileAnalysis: { categories: FileCategory[]; impactedAreas: ImpactArea[] },
    contentPatterns: ReturnType<typeof this.analyzeContentPatterns>
  ): {
    agentsToSkip: string[];
    agentsToKeep: string[];
    skipReasons: Record<string, string>;
  } {
    const agentsToSkip = new Set<string>();
    const agentsToKeep = new Set<string>();
    const skipReasons: Record<string, string> = {};
    
    // Start with base rules from change types
    for (const changeType of changeTypes) {
      const rules = AGENT_SKIPPING_RULES[changeType];
      
      rules.skip.forEach(agent => {
        agentsToSkip.add(agent);
        skipReasons[agent] = `Not relevant for ${changeType} changes`;
      });
      
      rules.keep.forEach(agent => {
        agentsToKeep.add(agent);
        agentsToSkip.delete(agent); // Keep overrides skip
      });
    }
    
    // Apply intelligent overrides based on content patterns
    // Only override if the pattern is strong and not already handled by change type
    
    // Security patterns ALWAYS override any skip rules
    if (contentPatterns.hasSecurityPatterns) {
      agentsToKeep.add('security');
      agentsToSkip.delete('security');
      delete skipReasons['security'];
    }
    
    // Performance patterns override skip rules
    if (contentPatterns.hasPerformancePatterns) {
      agentsToKeep.add('performance');
      agentsToSkip.delete('performance');
      delete skipReasons['performance'];
    }
    
    // Architecture patterns override skip rules
    if (contentPatterns.hasArchitecturePatterns) {
      agentsToKeep.add('architecture');
      agentsToSkip.delete('architecture');
      delete skipReasons['architecture'];
    }
    
    // AI/ML patterns require special handling
    if (contentPatterns.hasAIMLPatterns || contentPatterns.hasModelConfigChanges || 
        contentPatterns.hasPromptChanges) {
      // For AI/ML changes, we need multiple agents:
      // - Architecture: to validate model integration patterns
      // - Performance: to check inference latency and resource usage
      // - Security: to check for prompt injection, data leakage
      // - Code Quality: to validate error handling and fallback mechanisms
      agentsToKeep.add('architecture');
      agentsToKeep.add('performance');
      agentsToKeep.add('security');
      agentsToKeep.add('codeQuality');
      
      // Remove from skip list
      agentsToSkip.delete('architecture');
      agentsToSkip.delete('performance');
      agentsToSkip.delete('security');
      agentsToSkip.delete('codeQuality');
      
      delete skipReasons['architecture'];
      delete skipReasons['performance'];
      delete skipReasons['security'];
      delete skipReasons['codeQuality'];
    }
    
    // Validation changes are critical for hallucination prevention
    if (contentPatterns.hasValidationChanges) {
      // Keep all agents for validation changes as they impact system reliability
      agentsToKeep.add('codeQuality'); // For validation logic quality
      agentsToKeep.add('security');    // For input sanitization
      agentsToKeep.add('architecture'); // For validation architecture patterns
      
      agentsToSkip.delete('codeQuality');
      agentsToSkip.delete('security');
      agentsToSkip.delete('architecture');
      
      delete skipReasons['codeQuality'];
      delete skipReasons['security'];
      delete skipReasons['architecture'];
    }
    
    // For mixed changes with security issues, don't skip any agents
    if (changeTypes.includes('mixed') && contentPatterns.hasMixedSecurityIssues) {
      // Clear all skip rules for mixed security changes
      agentsToSkip.clear();
      Object.keys(skipReasons).forEach(key => delete skipReasons[key]);
      
      // Keep all agents
      ['security', 'architecture', 'performance', 'dependencies', 'codeQuality']
        .forEach(agent => agentsToKeep.add(agent));
    }
    
    // For architecture refactoring, trust the change type classification
    else if (changeTypes.includes('refactor') && !contentPatterns.hasSecurityPatterns) {
      // Architecture refactor should skip security unless security patterns found
      if (!contentPatterns.hasSecurityPatterns) {
        agentsToSkip.add('security');
        skipReasons['security'] = 'Architecture refactoring without security-related changes';
      }
    }
    
    // For dependency updates, enforce the skip rules
    if (changeTypes.includes('dependency-update')) {
      // Always skip architecture and performance for pure dependency updates
      agentsToSkip.add('architecture');
      agentsToSkip.add('performance');
      skipReasons['architecture'] = 'Pure dependency update without architectural changes';
      skipReasons['performance'] = 'Pure dependency update without performance impact';
      
      // But keep security and dependencies
      agentsToKeep.add('security');
      agentsToKeep.add('dependencies');
      agentsToSkip.delete('security');
      agentsToSkip.delete('dependencies');
    }
    
    // For UI-only changes, be more aggressive about skipping
    if (changeTypes.includes('ui-only')) {
      // Skip security, dependencies, and architecture for pure frontend changes
      agentsToSkip.add('security');
      agentsToSkip.add('dependencies');
      agentsToSkip.add('architecture');
      skipReasons['security'] = 'Frontend-only changes without security implications';
      skipReasons['dependencies'] = 'Frontend-only changes without dependency updates';
      skipReasons['architecture'] = 'Frontend-only changes without architectural impact';
      
      // Keep only code quality and performance
      agentsToKeep.add('codeQuality');
      agentsToKeep.add('performance');
    }
    
    // For infrastructure changes, handle more carefully
    if (changeTypes.includes('config-only') && fileAnalysis.impactedAreas.includes('infra')) {
      // Infrastructure changes should skip performance but keep security
      agentsToSkip.add('performance');
      skipReasons['performance'] = 'Infrastructure configuration without performance code changes';
      
      agentsToKeep.add('security');
      agentsToKeep.add('architecture');
      agentsToSkip.delete('security');
      agentsToSkip.delete('architecture');
    }
    
    // Special handling for test-only changes
    if (changeTypes.includes('test-only')) {
      // Test files rarely need most agents
      ['security', 'performance', 'dependencies', 'architecture'].forEach(agent => {
        agentsToSkip.add(agent);
        skipReasons[agent] = 'Test-only changes without production code impact';
      });
      
      // Only keep code quality for test files
      agentsToKeep.add('codeQuality');
    }
    
    // Only override for high-risk if it's truly high risk (not just complex)
    if (riskLevel === 'high' && fileAnalysis.impactedAreas.includes('database')) {
      // Only force all agents for database changes
      agentsToSkip.clear();
      Object.keys(skipReasons).forEach(key => delete skipReasons[key]);
      
      ['security', 'architecture', 'performance', 'dependencies', 'codeQuality']
        .forEach(agent => agentsToKeep.add(agent));
    }
    
    return {
      agentsToSkip: Array.from(agentsToSkip),
      agentsToKeep: Array.from(agentsToKeep),
      skipReasons
    };
  }
}