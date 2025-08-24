import { 
  IEducatorAgent, 
  CourseSearchParams, 
  SearchQuery,
  EducationalSuggestion 
} from './interfaces/educator.interface';
// Import from analysis-types instead of local types to match orchestrator expectations
import { 
  EducationalEnhancements, 
  Course, 
  Article, 
  Video, 
  LearningPath,
  LearningStep
} from '../types/analysis-types';
import { DeveloperSkills } from '../orchestrator/interfaces/skill-provider.interface';
import { getDynamicModelConfig, trackDynamicAgentCall } from '../monitoring';
import type { AgentRole } from '../monitoring/services/dynamic-agent-cost-tracker.service';

/**
 * Simple Educator Agent Implementation
 * 
 * Finds real educational resources using AI search models
 * without external MCP tools (for now)
 */
export class EducatorAgent implements IEducatorAgent {
  private modelConfigId = '';
  private primaryModel = '';
  private fallbackModel = '';
  private language = 'typescript';
  private repositorySize: 'small' | 'medium' | 'large' | 'enterprise' = 'medium';
  
  constructor(
    private searchModel?: any,  // AI model like Perplexity, Tavily, etc.
    private logger?: any
  ) {}
  
  /**
   * Initialize with model configuration from Supabase
   */
  async initialize(language?: string, repoSize?: 'small' | 'medium' | 'large' | 'enterprise'): Promise<void> {
    this.language = language || 'typescript';
    this.repositorySize = repoSize || 'medium';
    
    try {
      const config = await getDynamicModelConfig(
        'educator' as AgentRole,
        this.language,
        this.repositorySize
      );
      
      if (config) {
        this.modelConfigId = config.id;
        this.primaryModel = config.primary_model;
        this.fallbackModel = config.fallback_model || '';
        
        // Update searchModel if using OpenRouter
        if (process.env.OPENROUTER_API_KEY) {
          this.searchModel = {
            provider: 'openrouter',
            model: config.primary_model,
            apiKey: process.env.OPENROUTER_API_KEY
          };
        }
        
        this.log('info', 'Educator initialized with Supabase config', {
          primary: this.primaryModel,
          fallback: this.fallbackModel,
          configId: this.modelConfigId
        });
      }
    } catch (error) {
      this.log('warn', 'Failed to get Supabase config for Educator', error);
    }
  }

  /**
   * Find matching courses based on educational suggestions
   */
  async findMatchingCourses(params: CourseSearchParams): Promise<EducationalEnhancements> {
    this.log('info', 'Finding educational resources', {
      suggestionCount: params.suggestions.length,
      developerLevel: params.developerLevel
    });

    const startTime = Date.now();
    let inputTokens = 0;
    let outputTokens = 0;
    let isFallback = false;
    let retryCount = 0;

    try {
      // Group suggestions by priority
      const immediateSuggestions = params.suggestions.filter(s => s.priority === 'immediate');
      const shortTermSuggestions = params.suggestions.filter(s => s.priority === 'short-term');
      const longTermSuggestions = params.suggestions.filter(s => s.priority === 'long-term');

      // Search for resources in parallel
      const [courses, articles, videos] = await Promise.all([
        this.findCourses(immediateSuggestions, params),
        this.findArticles([...immediateSuggestions, ...shortTermSuggestions], params),
        this.findVideos(params.suggestions, params)
      ]);

      // Create personalized learning path
      const mockSkills: DeveloperSkills = {
        userId: 'temp',
        username: 'temp',
        overallScore: 50,
        categoryScores: { security: 50, performance: 50, codeQuality: 50, architecture: 50, dependencies: 50 },
        level: { current: params.developerLevel, numeric: 50, title: params.developerLevel },
        trend: { direction: 'stable', change: 0, period: '30d' },
        lastUpdated: new Date(),
        totalPRs: 0,
        issuesFixed: { critical: 0, high: 0, medium: 0, low: 0 },
        issuesIntroduced: { critical: 0, high: 0, medium: 0, low: 0 }
      };
      
      const personalizedPath = await this.createLearningPath(
        [...courses.slice(0, 3), ...articles.slice(0, 2), ...videos.slice(0, 2)],
        mockSkills
      );

      // Calculate total learning time
      const estimatedLearningTime = this.calculateTotalTime(courses, articles, videos);

      const result = {
        courses,
        articles,
        videos,
        estimatedLearningTime,
        personalizedPath
      };
      
      // Estimate token usage
      inputTokens = Math.round(JSON.stringify(params).length / 4);
      outputTokens = Math.round(JSON.stringify(result).length / 4);
      
      // Track successful search
      if (this.modelConfigId) {
        await trackDynamicAgentCall({
          agent: 'educator' as AgentRole,
          operation: 'find-resources',
          repository: params.repository || 'unknown',
          prNumber: params.prNumber,
          language: this.language,
          repositorySize: this.repositorySize,
          modelConfigId: this.modelConfigId,
          model: this.primaryModel || 'unknown',
          modelVersion: 'latest',
          isFallback,
          inputTokens,
          outputTokens,
          duration: Date.now() - startTime,
          success: true,
          retryCount
        });
      }

      return result;

    } catch (primaryError: any) {
      retryCount++;
      
      // Try fallback model if available
      if (this.fallbackModel && this.searchModel) {
        try {
          this.log('warn', 'Primary model failed, trying fallback');
          
          // Switch to fallback model
          const originalModel = this.searchModel.model;
          this.searchModel.model = this.fallbackModel;
          isFallback = true;
          
          // Retry resource search
          const [courses, articles, videos] = await Promise.all([
            this.findCourses(params.suggestions.filter(s => s.priority === 'immediate'), params),
            this.findArticles(params.suggestions, params),
            this.findVideos(params.suggestions, params)
          ]);
          
          const result = {
            courses,
            articles,
            videos,
            estimatedLearningTime: this.calculateTotalTime(courses, articles, videos),
            personalizedPath: { totalDuration: '0 hours', steps: [] }
          };
          
          // Track successful fallback
          inputTokens = Math.round(JSON.stringify(params).length / 4);
          outputTokens = Math.round(JSON.stringify(result).length / 4);
          
          if (this.modelConfigId) {
            await trackDynamicAgentCall({
              agent: 'educator' as AgentRole,
              operation: 'find-resources',
              repository: params.repository || 'unknown',
              prNumber: params.prNumber,
              language: this.language,
              repositorySize: this.repositorySize,
              modelConfigId: this.modelConfigId,
              model: this.fallbackModel,
              modelVersion: 'latest',
              isFallback: true,
              inputTokens,
              outputTokens,
              duration: Date.now() - startTime,
              success: true,
              retryCount
            });
          }
          
          // Restore original model
          this.searchModel.model = originalModel;
          
          return result;
        } catch (fallbackError: any) {
          // Track failure
          if (this.modelConfigId) {
            await trackDynamicAgentCall({
              agent: 'educator' as AgentRole,
              operation: 'find-resources',
              repository: params.repository || 'unknown',
              prNumber: params.prNumber,
              language: this.language,
              repositorySize: this.repositorySize,
              modelConfigId: this.modelConfigId,
              model: this.fallbackModel,
              modelVersion: 'latest',
              isFallback: true,
              inputTokens,
              outputTokens: 0,
              duration: Date.now() - startTime,
              success: false,
              error: fallbackError.message,
              retryCount
            });
          }
          
          this.log('error', 'Both primary and fallback models failed', {
            primary: primaryError,
            fallback: fallbackError
          });
          throw fallbackError;
        }
      } else {
        // No fallback, track failure
        if (this.modelConfigId) {
          await trackDynamicAgentCall({
            agent: 'educator' as AgentRole,
            operation: 'find-resources',
            repository: params.repository || 'unknown',
            prNumber: params.prNumber,
            language: this.language,
            repositorySize: this.repositorySize,
            modelConfigId: this.modelConfigId,
            model: this.primaryModel || 'unknown',
            modelVersion: 'latest',
            isFallback: false,
            inputTokens,
            outputTokens: 0,
            duration: Date.now() - startTime,
            success: false,
            error: primaryError.message,
            retryCount: 0
          });
        }
        
        this.log('error', 'Failed to find educational resources', primaryError);
        // Return empty results on error
        return {
          courses: [],
          articles: [],
          videos: [],
          estimatedLearningTime: 0,
          personalizedPath: { totalDuration: '0 hours', steps: [] }
        };
      }
    }
  }

  /**
   * Search for specific courses
   */
  async searchCourses(query: SearchQuery): Promise<Course[]> {
    if (!this.searchModel) {
      return this.getMockCourses(query);
    }

    const searchPrompt = `Find online courses for: ${query.query}
      Level: ${query.filters?.level || 'any'}
      Max Price: ${query.filters?.maxPrice || 'any'}
      Focus on: Recent (2024-2025), highly-rated, practical courses
      Return: Title, Provider, URL, Price, Duration, Rating`;

    const results = await this.searchModel.search(searchPrompt);
    return this.parseCourseResults(results);
  }

  /**
   * Search for technical articles
   */
  async searchArticles(query: SearchQuery): Promise<Article[]> {
    if (!this.searchModel) {
      return this.getMockArticles(query);
    }

    const searchPrompt = `Find technical articles about: ${query.query}
      Level: ${query.filters?.level || 'any'}
      Focus on: Recent (2024-2025), authoritative sources, practical guides
      Sources: Medium, Dev.to, official docs, tech blogs
      Return: Title, Author, URL, Read Time, Source`;

    const results = await this.searchModel.search(searchPrompt);
    return this.parseArticleResults(results);
  }

  /**
   * Search for educational videos
   */
  async searchVideos(query: SearchQuery): Promise<Video[]> {
    if (!this.searchModel) {
      return this.getMockVideos(query);
    }

    const searchPrompt = `Find educational videos about: ${query.query}
      Level: ${query.filters?.level || 'any'}
      Focus on: Recent, high-quality, practical tutorials
      Platforms: YouTube, Pluralsight, Coursera
      Return: Title, Channel, URL, Duration`;

    const results = await this.searchModel.search(searchPrompt);
    return this.parseVideoResults(results);
  }

  /**
   * Create a personalized learning path
   */
  async createLearningPath(
    resources: (Course | Article | Video)[],
    developerProfile: DeveloperSkills
  ): Promise<LearningPath> {
    // Sort resources by relevance and difficulty
    const sortedResources = resources.sort((a, b) => {
      // Prioritize by relevance
      return (b.relevance || 0) - (a.relevance || 0);
    });

    // Create learning steps
    const steps: LearningStep[] = sortedResources.map((resource, index) => ({
      order: index + 1,
      resource,
      reason: this.getReasonForResource(resource, developerProfile)
    }));

    // Calculate total duration
    const totalMinutes = steps.reduce((total, step) => {
      let durationStr: string;
      if ('duration' in step.resource) {
        durationStr = step.resource.duration;
      } else if ('readTime' in step.resource) {
        durationStr = step.resource.readTime;
      } else {
        durationStr = '0 min';
      }
      const duration = this.parseDurationToMinutes(durationStr);
      return total + duration;
    }, 0);

    return {
      totalDuration: this.formatDuration(totalMinutes),
      steps
    };
  }

  /**
   * Extract educational suggestions from report
   */
  /**
   * Research educational content based on found issues
   * This method is called by the Orchestrator to get training materials
   */
  async research(params: {
    issues: any[];
    developerLevel?: string;
    teamProfile?: any;
  }): Promise<any> {
    this.log('info', 'Starting educational research', {
      issueCount: params.issues.length,
      developerLevel: params.developerLevel
    });

    try {
      // Extract unique issue patterns and categories
      const issuePatterns = this.extractIssuePatterns(params.issues);
      
      // Generate learning paths based on issues
      const learningPaths = await this.generateLearningPaths(issuePatterns, params.developerLevel);
      
      // Search for relevant courses, articles, and videos
      const educationalContent = await this.searchEducationalContent(issuePatterns);
      
      // Structure the response
      const response = {
        summary: this.generateEducationalSummary(params.issues),
        learningPaths,
        resources: educationalContent,
        estimatedLearningTime: this.calculateTotalLearningTime(educationalContent),
        priorityTopics: this.identifyPriorityTopics(params.issues),
        teamRecommendations: this.generateTeamRecommendations(params.teamProfile)
      };
      
      this.log('info', 'Educational research completed', {
        pathsGenerated: learningPaths.length,
        resourcesFound: educationalContent.courses.length + educationalContent.articles.length + educationalContent.videos.length
      });
      
      return response;
    } catch (error) {
      this.log('error', 'Educational research failed', error);
      // Return minimal fallback response
      return {
        summary: 'Educational content generation failed. Please review issues manually.',
        learningPaths: [],
        resources: { courses: [], articles: [], videos: [] },
        estimatedLearningTime: 0,
        priorityTopics: [],
        teamRecommendations: []
      };
    }
  }

  private extractIssuePatterns(issues: any[]): Map<string, any[]> {
    const patterns = new Map<string, any[]>();
    
    issues.forEach(issue => {
      const category = this.categorizeIssue(issue);
      if (!patterns.has(category)) {
        patterns.set(category, []);
      }
      patterns.get(category)!.push(issue);
    });
    
    return patterns;
  }

  private categorizeIssue(issue: any): string {
    const title = (issue.title || issue.message || '').toLowerCase();
    
    if (title.includes('security') || title.includes('vulnerability') || title.includes('injection') || title.includes('xss') || title.includes('csrf')) {
      return 'security';
    }
    if (title.includes('performance') || title.includes('optimization') || title.includes('n+1') || title.includes('cache')) {
      return 'performance';
    }
    if (title.includes('test') || title.includes('coverage')) {
      return 'testing';
    }
    if (title.includes('architecture') || title.includes('design') || title.includes('pattern')) {
      return 'architecture';
    }
    if (title.includes('dependency') || title.includes('package') || title.includes('version')) {
      return 'dependencies';
    }
    
    return 'code-quality';
  }

  private async generateLearningPaths(patterns: Map<string, any[]>, level?: string): Promise<any[]> {
    const paths = [];
    
    for (const [category, issues] of patterns) {
      // Create a simple learning path for each category
      paths.push({
        topic: category,
        issueCount: issues.length,
        description: `Learning path for ${category} improvements based on ${issues.length} issues found`,
        suggestedResources: []
      });
    }
    
    return paths;
  }

  private async searchEducationalContent(patterns: Map<string, any[]>): Promise<any> {
    const courses = [];
    const articles = [];
    const videos = [];
    
    for (const [category, issues] of patterns) {
      // Search for courses
      const categoryCourses = await this.searchCourses({
        query: category,
        filters: { level: 'any', duration: 'any' }
      });
      courses.push(...categoryCourses);
      
      // Search for articles
      const categoryArticles = await this.searchArticles({
        query: category,
        filters: {}
      });
      articles.push(...categoryArticles);
      
      // Search for videos
      const categoryVideos = await this.searchVideos({
        query: category,
        filters: {}
      });
      videos.push(...categoryVideos);
    }
    
    return {
      courses: this.deduplicateResources(courses),
      articles: this.deduplicateResources(articles),
      videos: this.deduplicateResources(videos)
    };
  }

  private deduplicateResources(resources: any[]): any[] {
    const seen = new Set<string>();
    return resources.filter(resource => {
      const key = resource.url || resource.title;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private generateEducationalSummary(issues: any[]): string {
    const categories = new Map<string, number>();
    
    issues.forEach(issue => {
      const category = this.categorizeIssue(issue);
      categories.set(category, (categories.get(category) || 0) + 1);
    });
    
    const topCategories = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, count]) => `${cat} (${count} issues)`);
    
    return `Based on the analysis, focus areas for improvement include: ${topCategories.join(', ')}.`;
  }

  private calculateTotalLearningTime(content: any): number {
    let totalMinutes = 0;
    
    // Estimate time for courses (average 2 hours per course)
    totalMinutes += (content.courses?.length || 0) * 120;
    
    // Estimate time for articles (average 15 minutes per article)
    totalMinutes += (content.articles?.length || 0) * 15;
    
    // Estimate time for videos (average 30 minutes per video)
    totalMinutes += (content.videos?.length || 0) * 30;
    
    return totalMinutes;
  }

  private identifyPriorityTopics(issues: any[]): string[] {
    const severityScore = new Map<string, number>();
    
    issues.forEach(issue => {
      const category = this.categorizeIssue(issue);
      const score = this.getSeverityScore(issue.severity);
      severityScore.set(category, (severityScore.get(category) || 0) + score);
    });
    
    return Array.from(severityScore.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);
  }

  private getSeverityScore(severity: string): number {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }

  private generateTeamRecommendations(teamProfile: any): string[] {
    const recommendations = [];
    
    // Add team-specific recommendations based on profile
    if (teamProfile?.weakestSkills) {
      recommendations.push(`Focus team training on: ${teamProfile.weakestSkills.join(', ')}`);
    }
    
    recommendations.push('Consider pair programming for complex issues');
    recommendations.push('Schedule regular code review sessions');
    recommendations.push('Implement automated testing for critical paths');
    
    return recommendations;
  }

  extractSuggestionsFromReport(markdownReport: string): EducationalSuggestion[] {
    const suggestions: EducationalSuggestion[] = [];
    
    // Look for educational insights section
    const educationSection = this.extractSection(markdownReport, 'Educational Insights');
    if (!educationSection) return suggestions;

    // Parse immediate learning needs
    const immediateNeeds = this.extractBulletPoints(educationSection, 'Immediate Learning Needs');
    immediateNeeds.forEach(need => {
      suggestions.push({
        topic: need.title,
        reason: need.reason,
        priority: 'immediate',
        category: this.inferCategory(need.title),
        level: this.inferLevel(need.title)
      });
    });

    // Add more parsing logic as needed...

    return suggestions;
  }

  // Private helper methods
  private async findCourses(
    suggestions: EducationalSuggestion[], 
    params: CourseSearchParams
  ): Promise<Course[]> {
    const queries = suggestions.map(s => ({
      query: `${s.topic} ${params.developerLevel} course online training`,
      filters: {
        level: s.level,
        maxPrice: params.budgetConstraint === 'free' ? 0 : undefined
      }
    }));

    const results = await Promise.all(queries.map(q => this.searchCourses(q)));
    return results.flat().slice(0, params.maxResults || 10);
  }

  private async findArticles(
    suggestions: EducationalSuggestion[], 
    params: CourseSearchParams
  ): Promise<Article[]> {
    const queries = suggestions.map(s => ({
      query: `${s.topic} tutorial guide best practices`,
      filters: { level: s.level }
    }));

    const results = await Promise.all(queries.map(q => this.searchArticles(q)));
    return results.flat().slice(0, params.maxResults || 10);
  }

  private async findVideos(
    suggestions: EducationalSuggestion[], 
    params: CourseSearchParams
  ): Promise<Video[]> {
    const queries = suggestions.slice(0, 3).map(s => ({
      query: `${s.topic} tutorial video`,
      filters: { level: s.level }
    }));

    const results = await Promise.all(queries.map(q => this.searchVideos(q)));
    return results.flat().slice(0, params.maxResults || 5);
  }

  private calculateTotalTime(
    courses: Course[], 
    articles: Article[], 
    videos: Video[]
  ): number {
    let totalHours = 0;

    courses.forEach(course => {
      const hours = this.parseDurationToMinutes(course.duration) / 60;
      totalHours += hours;
    });

    articles.forEach(article => {
      const minutes = this.parseDurationToMinutes(article.readTime);
      totalHours += minutes / 60;
    });

    videos.forEach(video => {
      const minutes = this.parseDurationToMinutes(video.duration);
      totalHours += minutes / 60;
    });

    return Math.round(totalHours);
  }

  private parseDurationToMinutes(duration: string): number {
    // Parse various duration formats: "2 hours", "30 minutes", "1h 30m", etc.
    const hours = duration.match(/(\d+)\s*h/i);
    const minutes = duration.match(/(\d+)\s*m/i);
    
    let total = 0;
    if (hours) total += parseInt(hours[1]) * 60;
    if (minutes) total += parseInt(minutes[1]);
    
    // If no match, try to parse as pure number (assume minutes)
    if (total === 0) {
      const num = parseInt(duration);
      if (!isNaN(num)) total = num;
    }
    
    return total || 30; // Default 30 minutes
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours} hours`;
    } else {
      return `${mins} minutes`;
    }
  }

  private getReasonForResource(
    resource: Course | Article | Video, 
    profile: DeveloperSkills
  ): string {
    // Generate contextual reason for including this resource
    if ('price' in resource) {
      return `Comprehensive course covering key concepts at your ${profile.level || 'current'} level`;
    } else if ('readTime' in resource) {
      return `Quick read to understand practical implementation`;
    } else {
      return `Visual tutorial for hands-on learning`;
    }
  }

  private extractSection(markdown: string, sectionTitle: string): string | null {
    const regex = new RegExp(`## ${sectionTitle}\\s*([\\s\\S]*?)(?=##|$)`, 'i');
    const match = markdown.match(regex);
    return match ? match[1].trim() : null;
  }

  private extractBulletPoints(text: string, subsection?: string): any[] {
    // Implementation to extract bullet points from markdown
    return [];
  }

  private inferCategory(topic: string): any {
    const lower = topic.toLowerCase();
    if (lower.includes('security')) return 'security';
    if (lower.includes('performance')) return 'performance';
    if (lower.includes('architecture')) return 'architecture';
    if (lower.includes('dependency')) return 'dependencies';
    return 'code-quality';
  }

  private inferLevel(topic: string): 'beginner' | 'intermediate' | 'advanced' {
    const lower = topic.toLowerCase();
    if (lower.includes('advanced') || lower.includes('expert')) return 'advanced';
    if (lower.includes('beginner') || lower.includes('basic')) return 'beginner';
    return 'intermediate';
  }

  // Mock methods for testing without search model - returns real useful URLs
  private getMockCourses(query: SearchQuery): Course[] {
    const queryLower = query.query.toLowerCase();
    
    // Return relevant courses based on query
    if (queryLower.includes('security')) {
      return [{
        title: 'Web Security Fundamentals',
        provider: 'Pluralsight',
        url: 'https://www.pluralsight.com/courses/web-security-fundamentals',
        price: 'Free Trial',
        duration: '4 hours',
        rating: 4.7,
        relevance: 0.95,
        level: 'intermediate'
      }, {
        title: 'OWASP Top 10 Security Risks',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/owasp-top-10-web-application-security/',
        price: '$19.99',
        duration: '6 hours',
        rating: 4.6,
        relevance: 0.90,
        level: 'beginner'
      }];
    } else if (queryLower.includes('typescript') || queryLower.includes('type')) {
      return [{
        title: 'TypeScript: The Complete Developer\'s Guide',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/typescript-the-complete-developers-guide/',
        price: '$24.99',
        duration: '27 hours',
        rating: 4.6,
        relevance: 0.95,
        level: 'beginner'
      }, {
        title: 'Advanced TypeScript',
        provider: 'Frontend Masters',
        url: 'https://frontendmasters.com/courses/advanced-typescript/',
        price: 'Subscription',
        duration: '5 hours',
        rating: 4.8,
        relevance: 0.90,
        level: 'advanced'
      }];
    } else if (queryLower.includes('error') || queryLower.includes('exception')) {
      return [{
        title: 'JavaScript Error Handling Best Practices',
        provider: 'Pluralsight',
        url: 'https://www.pluralsight.com/courses/javascript-error-handling',
        price: 'Free Trial',
        duration: '3 hours',
        rating: 4.5,
        relevance: 0.90,
        level: 'intermediate'
      }];
    } else if (queryLower.includes('performance')) {
      return [{
        title: 'Web Performance Optimization',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/web-performance/',
        price: '$19.99',
        duration: '8 hours',
        rating: 4.7,
        relevance: 0.95,
        level: 'intermediate'
      }];
    }
    
    // Default courses for general queries
    return [{
      title: 'Clean Code: Writing Code for Humans',
      provider: 'Pluralsight',
      url: 'https://www.pluralsight.com/courses/writing-clean-code-humans',
      price: 'Free Trial',
      duration: '3.5 hours',
      rating: 4.8,
      relevance: 0.85,
      level: 'intermediate'
    }];
  }

  private getMockArticles(query: SearchQuery): Article[] {
    const queryLower = query.query.toLowerCase();
    
    if (queryLower.includes('security')) {
      return [{
        title: 'Web Application Security Best Practices',
        author: 'OWASP Foundation',
        url: 'https://owasp.org/www-project-top-ten/',
        readTime: '30 minutes',
        source: 'OWASP',
        relevance: 0.95
      }, {
        title: 'Security Headers Quick Reference',
        author: 'MDN Web Docs',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security',
        readTime: '15 minutes',
        source: 'MDN',
        relevance: 0.90
      }];
    } else if (queryLower.includes('typescript') || queryLower.includes('type')) {
      return [{
        title: 'TypeScript Best Practices',
        author: 'Microsoft',
        url: 'https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html',
        readTime: '20 minutes',
        source: 'TypeScript Docs',
        relevance: 0.95
      }, {
        title: 'Advanced TypeScript Patterns',
        author: 'Basarat Ali Syed',
        url: 'https://basarat.gitbook.io/typescript/main-1/typed-event',
        readTime: '25 minutes',
        source: 'TypeScript Deep Dive',
        relevance: 0.90
      }];
    } else if (queryLower.includes('error')) {
      return [{
        title: 'Error Handling Best Practices',
        author: 'MDN Contributors',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling',
        readTime: '15 minutes',
        source: 'MDN',
        relevance: 0.90
      }];
    }
    
    return [{
      title: 'JavaScript Best Practices',
      author: 'MDN Contributors',
      url: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks',
      readTime: '20 minutes',
      source: 'MDN',
      relevance: 0.85
    }];
  }

  private getMockVideos(query: SearchQuery): Video[] {
    const queryLower = query.query.toLowerCase();
    
    if (queryLower.includes('security')) {
      return [{
        title: 'Web Security Essentials',
        channel: 'Traversy Media',
        url: 'https://www.youtube.com/watch?v=jDF8Gb_YJCE',
        duration: '32 minutes',
        views: 150000,
        relevance: 0.90
      }];
    } else if (queryLower.includes('typescript')) {
      return [{
        title: 'TypeScript Tutorial for Beginners',
        channel: 'Programming with Mosh',
        url: 'https://www.youtube.com/watch?v=d56mG7DezGs',
        duration: '52 minutes',
        views: 2500000,
        relevance: 0.95
      }];
    } else if (queryLower.includes('performance')) {
      return [{
        title: 'JavaScript Performance Optimization Tips',
        channel: 'Google Chrome Developers',
        url: 'https://www.youtube.com/watch?v=xjj5aWUtnP0',
        duration: '28 minutes',
        views: 85000,
        relevance: 0.90
      }];
    }
    
    return [{
      title: 'Clean Code - Uncle Bob',
      channel: 'IntelliJ IDEA',
      url: 'https://www.youtube.com/watch?v=7EmboKQH8lM',
      duration: '1 hour 48 minutes',
      views: 1200000,
      relevance: 0.85
    }];
  }

  // Parsing methods (implement based on search model response format)
  private parseCourseResults(results: any): Course[] {
    // Implementation depends on search model response format
    return [];
  }

  private parseArticleResults(results: any): Article[] {
    // Implementation depends on search model response format
    return [];
  }

  private parseVideoResults(results: any): Video[] {
    // Implementation depends on search model response format
    return [];
  }

  private log(level: string, message: string, data?: any) {
    if (this.logger) {
      this.logger[level](message, data);
    } else {
      const msg = `[EducatorAgent] ${message}`;
      switch (level) {
        case 'debug': console.debug(msg, data || ''); break; // eslint-disable-line no-console
        case 'info': console.info(msg, data || ''); break; // eslint-disable-line no-console
        case 'warn': console.warn(msg, data || ''); break; // eslint-disable-line no-console
        case 'error': console.error(msg, data || ''); break; // eslint-disable-line no-console
        default: console.log(msg, data || ''); break; // eslint-disable-line no-console
      }
    }
  }
}