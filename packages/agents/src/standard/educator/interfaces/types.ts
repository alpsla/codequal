/**
 * Educational resource types
 */

export interface Course {
  id: string;
  title: string;
  provider: string;
  url: string;
  duration: string;
  level: string;
  price?: number;
  rating?: number;
  topics: string[];
  description: string;
}

export interface Article {
  id: string;
  title: string;
  author: string;
  url: string;
  readTime: string;
  publishedDate?: Date;
  topics: string[];
  summary: string;
}

export interface Video {
  id: string;
  title: string;
  channel: string;
  url: string;
  duration: string;
  views?: number;
  likes?: number;
  topics: string[];
  description: string;
}

export interface CourseRecommendation extends Course {
  relevanceScore: number;
  estimatedHours: number;
}

export interface EducationalContent {
  courses: CourseRecommendation[];
  articles?: Article[];
  videos?: Video[];
  learningPath?: {
    totalHours: number;
    milestones: string[];
  };
  teamInsights?: {
    commonGaps: string[];
    recommendedWorkshops: string[];
  };
}

export interface EducationalEnhancements {
  courses: CourseRecommendation[];
  learningPaths: LearningPath[];
  personalizedSuggestions: EducationalSuggestion[];
  teamInsights?: TeamLearningInsights;
}

export interface LearningPath {
  id: string;
  title: string;
  description?: string;
  totalHours: number;
  milestones: Milestone[];
  courses: string[]; // Course IDs
}

export interface Milestone {
  title: string;
  description?: string;
  estimatedHours: number;
  resources?: string[];
}

export interface EducationalSuggestion {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  resources?: string[];
}

export interface TeamLearningInsights {
  commonGaps: string[];
  recommendedWorkshops: string[];
  teamLearningPaths: LearningPath[];
}