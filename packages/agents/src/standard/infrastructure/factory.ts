/**
 * Test Factory for Integration Tests
 * 
 * Creates test instances of orchestrator and related services with mock implementations
 */

import { ComparisonOrchestrator } from '../orchestrator/comparison-orchestrator';
import { IConfigProvider, AnalysisConfig, ModelSelection } from '../orchestrator/interfaces/config-provider.interface';
import { ISkillProvider, DeveloperSkills, SkillUpdate, TeamSkills, HistoryParams, SkillHistory, CategoryScores } from '../orchestrator/interfaces/skill-provider.interface';
import { IDataStore, AnalysisReport } from '../services/interfaces/data-store.interface';
import { ResearcherAgent } from '../../researcher/researcher-agent';
import { AuthenticatedUser, UserRole, UserStatus } from '../../multi-agent/types/auth';
import { RepositoryContext } from '../types/analysis-types';

// Mock Config Provider
class MockConfigProvider implements IConfigProvider {
  async getConfig(userId: string, repoType: string): Promise<AnalysisConfig | null> {
    // Return a default test configuration
    return {
      id: 'test-config-123',
      userId: userId,
      teamId: 'test-team-456',
      repoType: repoType,
      language: 'typescript',
      version: '1.0',
      modelPreferences: {
        primary: {
          modelId: 'anthropic/claude-3-5-sonnet-20241022',
          provider: 'anthropic',
          temperature: 0.3,
          maxTokens: 4000
        },
        fallback: {
          modelId: 'openai/gpt-4o-mini',
          provider: 'openai',
          temperature: 0.3,
          maxTokens: 4000
        }
      },
      weights: {
        security: 0.25,
        performance: 0.25,
        codeQuality: 0.25,
        architecture: 0.15,
        dependencies: 0.10
      },
      thresholds: {
        critical: 0.9,
        high: 0.75,
        medium: 0.5,
        low: 0.25
      },
      features: {
        enableEducation: true,
        enableSkillTracking: true,
        enableDependencyAnalysis: true,
        enableArchitectureReview: true,
        enablePerformanceProfiling: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async findSimilarConfigs(params: { repoType: string; language: string; complexity?: string }): Promise<AnalysisConfig[]> {
    return [];
  }

  async saveConfig(config: AnalysisConfig): Promise<string> {
    // Mock save
    return 'mock-config-id-' + Date.now();
  }

  async updateConfig(configId: string, updates: Partial<AnalysisConfig>): Promise<void> {
    // Mock update
  }

  async deleteConfig(id: string): Promise<void> {
    // Mock delete
  }

  async getDefaultConfig(repoType: string): Promise<AnalysisConfig> {
    const config = await this.getConfig('default-user', repoType);
    return config!;
  }
}

// Mock Skill Provider
class MockSkillProvider implements ISkillProvider {
  async getUserSkills(userId: string): Promise<DeveloperSkills> {
    return {
      userId: userId,
      username: `user-${userId}`,
      email: `${userId}@test.com`,
      overallScore: 75,
      categoryScores: {
        security: 70,
        performance: 80,
        codeQuality: 85,
        architecture: 70,
        dependencies: 65,
        testing: 60
      },
      level: {
        current: 'B+',
        numeric: 75,
        title: 'Intermediate'
      },
      trend: {
        direction: 'up',
        change: 5,
        period: '30d'
      },
      lastUpdated: new Date(),
      totalPRs: 45,
      issuesFixed: {
        critical: 2,
        high: 8,
        medium: 15,
        low: 20
      },
      issuesIntroduced: {
        critical: 0,
        high: 1,
        medium: 3,
        low: 5
      }
    };
  }

  async getTeamSkills(teamId: string): Promise<TeamSkills> {
    const mockUser = await this.getUserSkills('mock-user');
    return {
      teamId: teamId,
      teamName: `Team ${teamId}`,
      averageScore: 75,
      memberCount: 5,
      members: [mockUser],
      topPerformers: [mockUser],
      needsImprovement: [],
      overallTrend: {
        direction: 'up',
        change: 3,
        period: '30d'
      }
    };
  }

  async getBatchUserSkills(userIds: string[]): Promise<DeveloperSkills[]> {
    const results = [];
    for (const userId of userIds) {
      results.push(await this.getUserSkills(userId));
    }
    return results;
  }

  async updateSkills(updates: SkillUpdate[]): Promise<void> {
    // Mock update
  }

  async getHistoricalData(params: HistoryParams): Promise<SkillHistory> {
    return {
      dataPoints: [],
      summary: {
        averageScore: 75,
        highestScore: 85,
        lowestScore: 65,
        totalPRs: 45,
        improvement: 10,
        mostImprovedCategory: 'security',
        leastImprovedCategory: 'testing'
      }
    };
  }

  async initializeNewDeveloper(userId: string, prScore: number): Promise<DeveloperSkills> {
    return this.getUserSkills(userId);
  }

  async getCategoryLeaderboard(category: keyof CategoryScores, limit?: number): Promise<DeveloperSkills[]> {
    const mockUser = await this.getUserSkills('top-performer');
    return [mockUser];
  }

  async archiveDeveloper(userId: string): Promise<void> {
    // Mock archive
  }
}

// Mock Data Store
class MockDataStore implements IDataStore {
  async saveReport(report: AnalysisReport): Promise<string> {
    return 'mock-report-id-' + Date.now();
  }

  async getReport(id: string): Promise<AnalysisReport | null> {
    return null;
  }

  async queryReports(filters: any[], options?: any): Promise<AnalysisReport[]> {
    return [];
  }

  cache = {
    async get<T>(key: string): Promise<T | null> {
      return null;
    },
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
      // Mock cache set
    },
    async delete(key: string): Promise<void> {
      // Mock cache delete
    },
    async deleteByTags(tags: string[]): Promise<void> {
      // Mock cache delete by tags
    }
  };

  async transaction<T>(callback: (tx: IDataStore) => Promise<T>): Promise<T> {
    return callback(this);
  }

  async bulkInsert<T>(table: string, items: T[]): Promise<void> {
    // Mock bulk insert
  }

  async bulkUpdate<T>(table: string, items: T[]): Promise<void> {
    // Mock bulk update
  }

  async raw<T>(query: string, params?: any[]): Promise<T[]> {
    return [];
  }
}

// Mock Researcher Agent
class MockResearcherAgent extends ResearcherAgent {
  constructor() {
    // Call parent with minimal config
    const mockUser: AuthenticatedUser = {
      id: 'mock-user-id',
      name: 'Mock User',
      email: 'mock@test.com',
      permissions: {
        repositories: {},
        organizations: [],
        globalPermissions: [],
        quotas: { 
          requestsPerHour: 1000, 
          maxConcurrentExecutions: 10,
          storageQuotaMB: 1000 
        }
      },
      session: {
        token: 'mock-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        refreshToken: 'mock-refresh-token',
        fingerprint: 'mock-fingerprint',
        ipAddress: '127.0.0.1',
        userAgent: 'Mock User Agent'
      },
      role: 'user' as UserRole,
      status: 'active' as UserStatus
    };
    const mockConfig = {
      researchDepth: 'shallow' as const,
      prioritizeCost: true,
      maxCostPerMillion: 50,
      minPerformanceThreshold: 7
    };
    super(mockUser, mockConfig);
  }

  async findOptimalModel(context: any): Promise<any> {
    // Return a mock optimal model
    return {
      modelId: 'anthropic/claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      version: '2024-10-22',
      reasoning: ['Mock reasoning for test']
    };
  }
}

/**
 * Create a test orchestrator with all mock dependencies
 */
export async function createTestOrchestrator(): Promise<ComparisonOrchestrator> {
  const configProvider = new MockConfigProvider();
  const skillProvider = new MockSkillProvider();
  const dataStore = new MockDataStore();
  const researcherAgent = new MockResearcherAgent();
  
  const orchestrator = new ComparisonOrchestrator(
    configProvider,
    skillProvider,
    dataStore,
    researcherAgent,
    undefined, // No educator agent for this test
    console    // Simple console logger
  );

  return orchestrator;
}

/**
 * Standard Agent Factory for creating production and test orchestrators
 */
export class StandardAgentFactory {
  static async createTestOrchestrator(): Promise<ComparisonOrchestrator> {
    return createTestOrchestrator();
  }
  
  static createMockConfigProvider(): MockConfigProvider {
    return new MockConfigProvider();
  }
  
  static createMockSkillProvider(): MockSkillProvider {
    return new MockSkillProvider();
  }
  
  static createMockDataStore(): MockDataStore {
    return new MockDataStore();
  }
  
  static createComparisonAgent(): any {
    // Mock comparison agent
    return {
      initialize: async () => {
        // Mock initialization - no-op
        return Promise.resolve();
      },
      analyze: async () => ({ success: true, report: 'Mock report' })
    };
  }
  
  static createDataStore(): MockDataStore {
    return new MockDataStore();
  }
  
  static createSkillProvider(): MockSkillProvider {
    return new MockSkillProvider();
  }
  
  static createConfigProvider(): MockConfigProvider {
    return new MockConfigProvider();
  }
  
  static createLogger(): any {
    return console;
  }
}

// Also export the mock classes for direct use
export { MockConfigProvider, MockSkillProvider, MockDataStore, MockResearcherAgent };
