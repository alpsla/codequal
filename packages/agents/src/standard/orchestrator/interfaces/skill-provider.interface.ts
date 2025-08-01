export interface DeveloperSkills {
  userId: string;
  username: string;
  email?: string;
  overallScore: number;
  categoryScores: CategoryScores;
  level: SkillLevel;
  trend: SkillTrend;
  lastUpdated: Date;
  totalPRs: number;
  issuesFixed: IssueCount;
  issuesIntroduced: IssueCount;
}

export interface CategoryScores {
  security: number;
  performance: number;
  codeQuality: number;
  architecture: number;
  dependencies: number;
  testing?: number;
}

export interface SkillLevel {
  current: string; // 'A+', 'A', 'B+', etc.
  numeric: number; // 0-100
  title: string;   // 'Expert', 'Senior', 'Junior', etc.
}

export interface SkillTrend {
  direction: 'up' | 'down' | 'stable';
  change: number;
  period: string;
}

export interface IssueCount {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface TeamSkills {
  teamId: string;
  teamName: string;
  averageScore: number;
  memberCount: number;
  members: DeveloperSkills[];
  topPerformers: DeveloperSkills[];
  needsImprovement: DeveloperSkills[];
  overallTrend: SkillTrend;
}

export interface SkillUpdate {
  userId: string;
  prId: string;
  timestamp: Date;
  previousScore: number;
  newScore: number;
  adjustments: SkillAdjustment[];
  categoryChanges: Partial<CategoryScores>;
}

export interface SkillAdjustment {
  reason: string;
  category: keyof CategoryScores;
  points: number;
  type: 'positive' | 'negative';
}

export interface HistoryParams {
  userId?: string;
  teamId?: string;
  startDate: Date;
  endDate: Date;
  granularity?: 'daily' | 'weekly' | 'monthly';
}

export interface SkillHistory {
  dataPoints: SkillDataPoint[];
  summary: HistorySummary;
}

export interface SkillDataPoint {
  timestamp: Date;
  score: number;
  categoryScores: CategoryScores;
  prCount: number;
  issuesFixed: number;
  issuesIntroduced: number;
}

export interface HistorySummary {
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalPRs: number;
  improvement: number;
  mostImprovedCategory: string;
  leastImprovedCategory: string;
}

export interface ISkillProvider {
  /**
   * Get skills for an entire team
   */
  getTeamSkills(teamId: string): Promise<TeamSkills>;
  
  /**
   * Get skills for a specific user
   */
  getUserSkills(userId: string): Promise<DeveloperSkills>;
  
  /**
   * Get multiple users' skills
   */
  getBatchUserSkills(userIds: string[]): Promise<DeveloperSkills[]>;
  
  /**
   * Update skills based on PR analysis
   */
  updateSkills(updates: SkillUpdate[]): Promise<void>;
  
  /**
   * Get historical skill data
   */
  getHistoricalData(params: HistoryParams): Promise<SkillHistory>;
  
  /**
   * Initialize skills for a new developer
   */
  initializeNewDeveloper(userId: string, prScore: number): Promise<DeveloperSkills>;
  
  /**
   * Get leaderboard for a specific category
   */
  getCategoryLeaderboard(category: keyof CategoryScores, limit?: number): Promise<DeveloperSkills[]>;
  
  /**
   * Archive inactive developer
   */
  archiveDeveloper(userId: string): Promise<void>;
}