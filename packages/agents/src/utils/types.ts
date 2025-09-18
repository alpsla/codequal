/**
 * Local type definitions to replace @codequal/core/types
 */

export interface AuthenticatedUser {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  // Security fields - optional but critical for production
  permissions?: {
    repositories?: Record<string, string[]>;
    organizations?: string[];
    globalPermissions?: string[];
    quotas?: {
      requestsPerHour: number;
      maxConcurrentExecutions: number;
      storageQuotaMB: number;
    };
  };
  session?: {
    token: string;
    expiresAt: Date;
    refreshToken?: string;
    fingerprint?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  status?: 'active' | 'suspended' | 'pending';
}

export interface Agent {
  name: string;
  role: string;
  provider?: string;
  model?: string;
}

export interface AnalysisResult {
  repository: string;
  prNumber?: number;
  timestamp: string;
  summary: string;
  issues: Issue[];
  metrics?: any;
  recommendations?: string[];
}

export interface Issue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  file: string;
  line?: number;
  column?: number;
  message: string;
  category?: string;
  suggestion?: string;
}

export interface Insight {
  type: string;
  description: string;
  impact?: string;
  recommendation?: string;
}

export interface Suggestion {
  type: string;
  description: string;
  code?: string;
  rationale?: string;
}

export interface EducationalContent {
  topic: string;
  content: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  examples?: string[];
  resources?: string[];
}

export interface Resource {
  title: string;
  url: string;
  type: 'documentation' | 'tutorial' | 'video' | 'article';
  description?: string;
}