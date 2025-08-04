/**
 * Mock implementation of IEducatorAgent for testing
 */

import { 
  IEducatorAgent,
  CourseSearchParams,
  EducationalSuggestion,
  SearchQuery
} from '../../standard/educator/interfaces/educator.interface';
// Import from analysis-types to match orchestrator expectations
import {
  EducationalEnhancements,
  Course,
  Article,
  Video,
  LearningPath,
  LearningStep
} from '../../standard/types/analysis-types';
import {
  CourseRecommendation,
  EducationalContent
} from '../../standard/educator/interfaces/types';

export class MockEducatorAgent implements IEducatorAgent {
  async findMatchingCourses(params: CourseSearchParams): Promise<EducationalEnhancements> {
    // Generate mock courses
    const courses: Course[] = params.suggestions.slice(0, 3).map((suggestion, index) => ({
      title: `Learn ${suggestion.topic || suggestion.category}`,
      provider: 'Mock Learning Platform',
      url: `https://learn.example.com/course/${index + 1}`,
      price: index === 0 ? 'Free' : `$${19.99 + (index * 10)}`,
      duration: `${10 + (index * 5)} hours`,
      rating: 4.5 - (index * 0.1),
      relevance: 0.85 - (index * 0.1),
      level: params.developerLevel as 'beginner' | 'intermediate' | 'advanced'
    }));
    
    // Generate mock articles
    const articles: Article[] = params.suggestions.slice(0, 2).map((suggestion, index) => ({
      title: `Understanding ${suggestion.topic || suggestion.category}`,
      author: `Expert ${index + 1}`,
      url: `https://blog.example.com/article/${index + 1}`,
      readTime: `${10 + (index * 5)} minutes`,
      source: 'Tech Blog',
      relevance: 0.8 - (index * 0.1)
    }));
    
    // Generate mock videos
    const videos: Video[] = params.suggestions.slice(0, 2).map((suggestion, index) => ({
      title: `${suggestion.topic || suggestion.category} Tutorial`,
      channel: 'Tech Academy',
      url: `https://youtube.com/watch?v=example${index + 1}`,
      duration: `${30 + (index * 15)} minutes`,
      views: 10000 + (index * 5000),
      relevance: 0.75 - (index * 0.1)
    }));
    
    // Calculate total learning time in hours
    const courseHours = courses.reduce((sum, c) => sum + parseInt(c.duration), 0);
    const articleHours = articles.reduce((sum, a) => sum + parseInt(a.readTime) / 60, 0);
    const videoHours = videos.reduce((sum, v) => sum + parseInt(v.duration) / 60, 0);
    const estimatedLearningTime = Math.round(courseHours + articleHours + videoHours);
    
    // Create personalized learning path
    const learningSteps: LearningStep[] = [];
    let order = 1;
    
    // Add courses to learning path
    courses.forEach(course => {
      learningSteps.push({
        order: order++,
        resource: course,
        reason: `Build solid foundation in ${course.title}`
      });
    });
    
    // Add articles
    articles.forEach(article => {
      learningSteps.push({
        order: order++,
        resource: article,
        reason: `Deepen understanding with practical insights`
      });
    });
    
    // Add videos
    videos.forEach(video => {
      learningSteps.push({
        order: order++,
        resource: video,
        reason: `Visual learning and hands-on practice`
      });
    });
    
    const personalizedPath: LearningPath = {
      totalDuration: `${estimatedLearningTime} hours`,
      steps: learningSteps
    };
    
    return {
      courses,
      articles,
      videos,
      estimatedLearningTime,
      personalizedPath
    };
  }
  
  async generateLearningPath(params: {
    skillGaps: string[];
    currentLevel: string;
    targetLevel: string;
  }): Promise<any> {
    return {
      path: params.skillGaps.map((gap, index) => ({
        step: index + 1,
        skill: gap,
        resources: [`Resource for ${gap}`],
        duration: '1 week'
      })),
      estimatedDuration: `${params.skillGaps.length} weeks`,
      milestones: params.skillGaps.map(gap => `Master ${gap}`)
    };
  }
  
  async searchEducationalContent(
    query: string, 
    filters?: any
  ): Promise<CourseRecommendation[]> {
    return [
      {
        id: 'search-1',
        title: `${query} Fundamentals`,
        provider: 'Mock Platform',
        url: 'https://learn.example.com/search-1',
        relevanceScore: 0.9,
        level: filters?.level || 'intermediate',
        estimatedHours: 15,
        duration: '15 hours',
        topics: [query],
        description: `Learn all about ${query}`
      }
    ];
  }
  
  async getTeamTrainingRecommendations(
    teamId: string
  ): Promise<any> {
    return {
      teamId,
      recommendations: [
        'Security Best Practices Workshop',
        'Performance Optimization Seminar',
        'Clean Code Principles'
      ],
      priority: 'high',
      estimatedImpact: {
        productivityGain: '15%',
        qualityImprovement: '20%'
      }
    };
  }
  
  async searchCourses(query: SearchQuery): Promise<Course[]> {
    return [
      {
        title: `${query.query} Fundamentals`,
        provider: 'Mock Platform',
        url: 'https://learn.example.com/course-1',
        price: query.filters?.maxPrice === 0 ? 'Free' : '$49.99',
        duration: '10 hours',
        rating: 4.5,
        relevance: 0.9,
        level: (query.filters?.level || 'intermediate') as 'beginner' | 'intermediate' | 'advanced'
      }
    ];
  }
  
  async searchArticles(query: SearchQuery): Promise<Article[]> {
    return [
      {
        title: `Understanding ${query.query}`,
        author: 'Expert Developer',
        url: `https://blog.example.com/${query.query}`,
        readTime: '10 minutes',
        source: 'Tech Blog',
        relevance: 0.85
      }
    ];
  }
  
  async searchVideos(query: SearchQuery): Promise<Video[]> {
    return [
      {
        title: `${query.query} Tutorial`,
        channel: 'Tech Academy',
        url: `https://video.example.com/${query.query}`,
        duration: '45 minutes',
        views: 10000,
        relevance: 0.8
      }
    ];
  }
  
  async createLearningPath(
    resources: (Course | Article | Video)[],
    developerProfile: any
  ): Promise<LearningPath> {
    const totalHours = resources.reduce((sum, resource) => {
      if ('duration' in resource && resource.duration.includes('hour')) {
        return sum + parseInt(resource.duration);
      }
      if ('readTime' in resource) {
        return sum + (parseInt(resource.readTime) || 0) / 60;
      }
      if ('duration' in resource && resource.duration.includes('min')) {
        return sum + (parseInt(resource.duration) || 0) / 60;
      }
      return sum;
    }, 0);
    
    const steps: LearningStep[] = resources.map((resource, index) => ({
      order: index + 1,
      resource,
      reason: this.getReasonForResource(resource)
    }));
    
    return {
      totalDuration: `${Math.round(totalHours)} hours`,
      steps
    };
  }
  
  private getReasonForResource(resource: Course | Article | Video): string {
    if ('price' in resource) {
      return `Comprehensive course covering key concepts at ${resource.level} level`;
    } else if ('readTime' in resource) {
      return `Quick read to understand practical implementation`;
    } else {
      return `Visual tutorial for hands-on learning`;
    }
  }
  
  extractSuggestionsFromReport(report: string): EducationalSuggestion[] {
    // Mock extraction - return some common suggestions
    return [
      {
        topic: 'Error Handling',
        reason: 'Improve error handling patterns',
        priority: 'immediate',
        category: 'code-quality',
        level: 'intermediate'
      },
      {
        topic: 'Unit Testing',
        reason: 'Add comprehensive unit tests',
        priority: 'short-term',
        category: 'code-quality',
        level: 'intermediate'
      },
      {
        topic: 'Query Optimization',
        reason: 'Optimize database queries for performance',
        priority: 'short-term',
        category: 'performance',
        level: 'advanced'
      },
      {
        topic: 'Security Best Practices',
        reason: 'Enhance security measures',
        priority: 'immediate',
        category: 'security',
        level: 'intermediate'
      }
    ];
  }
}