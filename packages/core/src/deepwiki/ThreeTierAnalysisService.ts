import { DeepWikiClient, RepositoryContext, ModelConfig, DeepWikiProvider } from './DeepWikiClient';
import { Logger } from '../utils/logger';

/**
 * Analysis depth options for the three-tier approach
 */
export enum AnalysisDepth {
  QUICK = 'quick',           // PR-only analysis
  COMPREHENSIVE = 'comprehensive',  // Repository + PR analysis
  TARGETED = 'targeted'      // Targeted architectural deep dive
}

/**
 * Targeted analysis perspective types
 */
export enum TargetedPerspective {
  ARCHITECTURE = 'architecture',
  PATTERNS = 'patterns',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  TESTING = 'testing',
  DEPENDENCIES = 'dependencies',
  MAINTAINABILITY = 'maintainability'
}

/**
 * Targeted perspective query mapping
 */
const PERSPECTIVE_QUERIES: Record<TargetedPerspective, string> = {
  [TargetedPerspective.ARCHITECTURE]: 
    "What is the overall architecture of this repository? Please identify the main components, how they interact with each other, and evaluate the architectural approach used. Include any architectural patterns you identify and assess their appropriateness.",
  
  [TargetedPerspective.PATTERNS]:
    "What design patterns and architectural approaches are used in this codebase? Are there any anti-patterns that should be addressed? How consistently are patterns applied across the codebase?",
  
  [TargetedPerspective.PERFORMANCE]:
    "What are the potential performance bottlenecks in this codebase? How efficiently are resources managed in critical paths? Are there any optimizations that could improve performance significantly?",
  
  [TargetedPerspective.SECURITY]:
    "What security vulnerabilities or potential risks exist in this codebase? Are there any insecure coding practices, dependency vulnerabilities, or areas where security best practices aren't being followed?",
  
  [TargetedPerspective.TESTING]:
    "How well is this codebase tested? Evaluate the test coverage, testing approaches used, and identify any gaps in the testing strategy. Are there areas that would benefit from additional testing?",
  
  [TargetedPerspective.DEPENDENCIES]:
    "Analyze the dependency management in this codebase. Are dependencies up-to-date, properly managed, and appropriately used? Are there any risks associated with the current dependency strategy?",
  
  [TargetedPerspective.MAINTAINABILITY]:
    "How maintainable is this codebase? Evaluate code organization, documentation, complexity, and adherence to coding standards. What refactoring opportunities would improve maintainability?"
};

/**
 * Options for repository analysis
 */
export interface RepositoryAnalysisOptions {
  /**
   * Analysis depth level
   */
  depth: AnalysisDepth;
  
  /**
   * Targeted perspectives (only applicable for TARGETED depth)
   */
  perspectives?: TargetedPerspective[];
  
  /**
   * Override model configuration (optional)
   */
  modelConfig?: ModelConfig<DeepWikiProvider>;
  
  /**
   * Whether to use cached repository analysis if available
   */
  useCache?: boolean;
}

/**
 * PR analysis options
 */
export interface PullRequestAnalysisOptions extends RepositoryAnalysisOptions {
  /**
   * Pull request number
   */
  prNumber: number;
}

/**
 * Analysis result structure
 */
export interface AnalysisResult {
  /**
   * Repository context
   */
  repository: RepositoryContext;
  
  /**
   * Analysis options used
   */
  options: RepositoryAnalysisOptions | PullRequestAnalysisOptions;
  
  /**
   * Analysis results
   */
  results: {
    /**
     * Repository wiki (for comprehensive analysis)
     */
    repositoryWiki?: Record<string, unknown>;
    
    /**
     * PR analysis (for PR-related analysis)
     */
    prAnalysis?: Record<string, unknown>;
    
    /**
     * Targeted perspective results (for targeted analysis)
     */
    perspectiveResults?: Record<TargetedPerspective, Record<string, unknown>>;
  };
}

/**
 * Three-tier analysis service that utilizes DeepWiki
 */
export class ThreeTierAnalysisService {
  private deepWikiClient: DeepWikiClient;
  private logger: Logger;
  
  /**
   * Constructor
   * @param deepWikiClient DeepWiki client instance
   * @param logger Logger instance
   */
  constructor(deepWikiClient: DeepWikiClient, logger: Logger) {
    this.deepWikiClient = deepWikiClient;
    this.logger = logger;
    
    this.logger.info('ThreeTierAnalysisService initialized');
  }
  
  /**
   * Analyze a pull request
   * @param repository Repository context
   * @param prId Pull request ID
   * @param options Analysis options
   * @returns Analysis result
   */
  async analyzePR(
    repository: RepositoryContext,
    prId: string,
    options: RepositoryAnalysisOptions
  ): Promise<AnalysisResult> {
    const prNumber = parseInt(prId.replace(/\D/g, ''), 10);
    if (isNaN(prNumber)) {
      throw new Error(`Invalid PR ID format: ${prId}`);
    }
    
    const prOptions: PullRequestAnalysisOptions = {
      ...options,
      prNumber
    };
    
    switch (options.depth) {
      case AnalysisDepth.QUICK:
        return this.performQuickPRAnalysis(repository, prOptions);
      case AnalysisDepth.COMPREHENSIVE:
        return this.performComprehensivePRAnalysis(repository, prOptions);
      case AnalysisDepth.TARGETED:
        return this.performTargetedPRAnalysis(repository, prOptions);
      default:
        return this.performQuickPRAnalysis(repository, prOptions);
    }
  }
  
  /**
   * Analyze a repository using the appropriate depth strategy
   * @param repository Repository context
   * @param options Analysis options
   * @returns Analysis result
   */
  async analyzeRepository(
    repository: RepositoryContext,
    options: RepositoryAnalysisOptions
  ): Promise<AnalysisResult> {
    this.logger.info('Starting repository analysis', { repository, options });
    
    switch (options.depth) {
      case AnalysisDepth.QUICK:
        return this.performQuickAnalysis(repository, options);
      
      case AnalysisDepth.COMPREHENSIVE:
        return this.performComprehensiveAnalysis(repository, options);
      
      case AnalysisDepth.TARGETED:
        return this.performTargetedAnalysis(repository, options);
      
      default:
        throw new Error(`Unsupported analysis depth: ${options.depth}`);
    }
  }
  
  /**
   * Analyze a pull request using the appropriate depth strategy
   * @param repository Repository context
   * @param options Pull request analysis options
   * @returns Analysis result
   */
  async analyzePullRequest(
    repository: RepositoryContext,
    options: PullRequestAnalysisOptions
  ): Promise<AnalysisResult> {
    this.logger.info('Starting pull request analysis', { repository, options });
    
    switch (options.depth) {
      case AnalysisDepth.QUICK:
        return this.performQuickPRAnalysis(repository, options);
      
      case AnalysisDepth.COMPREHENSIVE:
        return this.performComprehensivePRAnalysis(repository, options);
      
      case AnalysisDepth.TARGETED:
        return this.performTargetedPRAnalysis(repository, options);
      
      default:
        throw new Error(`Unsupported analysis depth: ${options.depth}`);
    }
  }
  
  /**
   * Perform quick repository analysis (minimal context)
   * @param repository Repository context
   * @param options Analysis options
   * @returns Analysis result
   */
  private async performQuickAnalysis(
    repository: RepositoryContext,
    options: RepositoryAnalysisOptions
  ): Promise<AnalysisResult> {
    this.logger.info('Performing quick repository analysis', { repository });
    
    // For quick analysis, we'll use chat completion instead of full wiki generation
    const repoUrl = this.buildRepoUrl(repository);
    
    const response = await this.deepWikiClient.getChatCompletion(repoUrl, {
      messages: [
        {
          role: 'user',
          content: 'Provide a brief analysis of this repository structure and its main components.'
        }
      ],
      modelConfig: options.modelConfig
    });
    
    return {
      repository,
      options,
      results: {
        repositoryWiki: response
      }
    };
  }
  
  /**
   * Perform comprehensive repository analysis (full context)
   * @param repository Repository context
   * @param options Analysis options
   * @returns Analysis result
   */
  private async performComprehensiveAnalysis(
    repository: RepositoryContext,
    options: RepositoryAnalysisOptions
  ): Promise<AnalysisResult> {
    this.logger.info('Performing comprehensive repository analysis', { repository });
    
    // For comprehensive analysis, we'll generate a full wiki
    const wiki = await this.deepWikiClient.generateWiki(repository, {
      format: 'json',
      language: 'en',
      modelConfig: options.modelConfig
    });
    
    return {
      repository,
      options,
      results: {
        repositoryWiki: wiki
      }
    };
  }
  
  /**
   * Perform targeted repository analysis (architectural deep dive)
   * @param repository Repository context
   * @param options Analysis options
   * @returns Analysis result
   */
  private async performTargetedAnalysis(
    repository: RepositoryContext,
    options: RepositoryAnalysisOptions
  ): Promise<AnalysisResult> {
    this.logger.info('Performing targeted repository analysis', { 
      repository, 
      perspectives: options.perspectives 
    });
    
    if (!options.perspectives || options.perspectives.length === 0) {
      throw new Error('Targeted analysis requires at least one perspective');
    }
    
    const repoUrl = this.buildRepoUrl(repository);
    const perspectiveResults: Record<TargetedPerspective, Record<string, unknown>> = {} as Record<TargetedPerspective, Record<string, unknown>>;
    
    // Run analyses for each requested perspective
    for (const perspective of options.perspectives) {
      this.logger.info(`Analyzing perspective: ${perspective}`, { repository });
      
      const query = PERSPECTIVE_QUERIES[perspective];
      
      const response = await this.deepWikiClient.getChatCompletion(repoUrl, {
        messages: [
          {
            role: 'user',
            content: query
          }
        ],
        modelConfig: options.modelConfig
      });
      
      perspectiveResults[perspective] = response;
    }
    
    return {
      repository,
      options,
      results: {
        perspectiveResults
      }
    };
  }
  
  /**
   * Perform quick PR analysis
   * @param repository Repository context
   * @param options Pull request analysis options
   * @returns Analysis result
   */
  private async performQuickPRAnalysis(
    repository: RepositoryContext,
    options: PullRequestAnalysisOptions
  ): Promise<AnalysisResult> {
    this.logger.info('Performing quick PR analysis', { repository, prNumber: options.prNumber });
    
    const repoUrl = this.buildRepoUrl(repository);
    
    const response = await this.deepWikiClient.getChatCompletion(repoUrl, {
      messages: [
        {
          role: 'user',
          content: `Analyze pull request #${options.prNumber}. Focus only on the changes in this PR. Identify any issues, improvements, or suggestions related to code quality, security, and performance.`
        }
      ],
      modelConfig: options.modelConfig
    });
    
    return {
      repository,
      options,
      results: {
        prAnalysis: response
      }
    };
  }
  
  /**
   * Perform comprehensive PR analysis (with repository context)
   * @param repository Repository context
   * @param options Pull request analysis options
   * @returns Analysis result
   */
  private async performComprehensivePRAnalysis(
    repository: RepositoryContext,
    options: PullRequestAnalysisOptions
  ): Promise<AnalysisResult> {
    this.logger.info('Performing comprehensive PR analysis', { repository, prNumber: options.prNumber });
    
    // First, get the repository wiki (or use cache if available)
    let repositoryWiki: Record<string, unknown> | undefined;
    
    if (options.useCache) {
      // Try to get from cache
      // Implementation will depend on our caching strategy
    }
    
    if (!repositoryWiki) {
      // Generate fresh wiki
      repositoryWiki = await this.deepWikiClient.generateWiki(repository, {
        format: 'json',
        language: 'en',
        modelConfig: options.modelConfig
      });
      
      // Store in cache for future use
      // Implementation will depend on our caching strategy
    }
    
    // Now analyze the PR with repository context
    const repoUrl = this.buildRepoUrl(repository);
    
    const prAnalysis = await this.deepWikiClient.getChatCompletion(repoUrl, {
      messages: [
        {
          role: 'system',
          content: 'You have deep knowledge of this repository structure and architecture. Use this understanding to provide insightful analysis of the PR in context of the overall codebase.'
        },
        {
          role: 'user',
          content: `Analyze pull request #${options.prNumber}. Consider how the changes fit into the overall architecture and codebase patterns. Identify any issues, improvements, or suggestions related to code quality, architectural fit, security, and performance.`
        }
      ],
      modelConfig: options.modelConfig
    });
    
    return {
      repository,
      options,
      results: {
        repositoryWiki,
        prAnalysis
      }
    };
  }
  
  /**
   * Perform targeted PR analysis (with specific architectural perspectives)
   * @param repository Repository context
   * @param options Pull request analysis options
   * @returns Analysis result
   */
  private async performTargetedPRAnalysis(
    repository: RepositoryContext,
    options: PullRequestAnalysisOptions
  ): Promise<AnalysisResult> {
    this.logger.info('Performing targeted PR analysis', { 
      repository, 
      prNumber: options.prNumber,
      perspectives: options.perspectives 
    });
    
    if (!options.perspectives || options.perspectives.length === 0) {
      throw new Error('Targeted analysis requires at least one perspective');
    }
    
    // Generate base PR analysis first
    const repoUrl = this.buildRepoUrl(repository);
    
    const prAnalysis = await this.deepWikiClient.getChatCompletion(repoUrl, {
      messages: [
        {
          role: 'user',
          content: `Analyze pull request #${options.prNumber}. Provide a high-level overview of the changes and their purpose.`
        }
      ],
      modelConfig: options.modelConfig
    });
    
    // Now analyze each perspective
    const perspectiveResults: Record<TargetedPerspective, Record<string, unknown>> = {} as Record<TargetedPerspective, Record<string, unknown>>;
    
    for (const perspective of options.perspectives) {
      this.logger.info(`Analyzing PR perspective: ${perspective}`, { 
        repository, 
        prNumber: options.prNumber 
      });
      
      // Create a perspective-specific query for the PR
      const baseQuery = PERSPECTIVE_QUERIES[perspective];
      const prQuery = `Analyze pull request #${options.prNumber} from the following perspective: ${baseQuery}`;
      
      const response = await this.deepWikiClient.getChatCompletion(repoUrl, {
        messages: [
          {
            role: 'user',
            content: prQuery
          }
        ],
        modelConfig: options.modelConfig
      });
      
      perspectiveResults[perspective] = response;
    }
    
    return {
      repository,
      options,
      results: {
        prAnalysis,
        perspectiveResults
      }
    };
  }
  
  /**
   * Build a repository URL from context
   * @param repository Repository context
   * @returns Repository URL
   */
  private buildRepoUrl(repository: RepositoryContext): string {
    const baseUrl = repository.repoType === 'github' 
      ? 'https://github.com' 
      : repository.repoType === 'gitlab'
        ? 'https://gitlab.com'
        : 'https://bitbucket.org';
    
    return `${baseUrl}/${repository.owner}/${repository.repo}`;
  }
}
