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

/**
 * Simple Educator Agent Implementation
 * 
 * Finds real educational resources using AI search models
 * without external MCP tools (for now)
 */
export class EducatorAgent implements IEducatorAgent {
  constructor(
    private searchModel?: any,  // AI model like Perplexity, Tavily, etc.
    private logger?: any
  ) {}

  /**
   * Find matching courses based on educational suggestions
   */
  async findMatchingCourses(params: CourseSearchParams): Promise<EducationalEnhancements> {
    this.log('info', 'Finding educational resources', {
      suggestionCount: params.suggestions.length,
      developerLevel: params.developerLevel
    });

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

      return {
        courses,
        articles,
        videos,
        estimatedLearningTime,
        personalizedPath
      };

    } catch (error) {
      this.log('error', 'Failed to find educational resources', error);
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

  // Mock methods for testing without search model
  private getMockCourses(query: SearchQuery): Course[] {
    return [{
      title: 'Advanced TypeScript Security Patterns',
      provider: 'Udemy',
      url: 'https://udemy.com/course/example',
      price: '$19.99',
      duration: '8 hours',
      rating: 4.8,
      relevance: 0.95,
      level: 'advanced'
    }];
  }

  private getMockArticles(query: SearchQuery): Article[] {
    return [{
      title: 'Security Best Practices in TypeScript',
      author: 'John Doe',
      url: 'https://medium.com/example',
      readTime: '15 minutes',
      source: 'Medium',
      relevance: 0.9
    }];
  }

  private getMockVideos(query: SearchQuery): Video[] {
    return [{
      title: 'TypeScript Security Fundamentals',
      channel: 'Tech Academy',
      url: 'https://youtube.com/watch?v=example',
      duration: '45 minutes',
      views: 50000,
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