/**
 * Mock implementation of ISkillProvider for testing
 */

import { 
  ISkillProvider, 
  DeveloperSkills, 
  TeamSkills, 
  SkillUpdate,
  HistoryParams,
  SkillHistory 
} from '../../standard/orchestrator/interfaces/skill-provider.interface';

export class MockSkillProvider implements ISkillProvider {
  private skills: Map<string, DeveloperSkills> = new Map();
  private history: SkillUpdate[] = [];
  
  async getTeamSkills(teamId: string): Promise<TeamSkills> {
    // Get all team members (mock data)
    // In a real implementation, we'd filter by team membership
    const members = Array.from(this.skills.values());
    
    const averageScore = members.length > 0
      ? members.reduce((sum, m) => sum + m.overallScore, 0) / members.length
      : 75;
    
    return {
      teamId,
      teamName: `Team ${teamId}`,
      averageScore,
      memberCount: members.length,
      members,
      topPerformers: members.filter(m => m.overallScore >= 80),
      needsImprovement: members.filter(m => m.overallScore < 60),
      overallTrend: {
        direction: 'stable',
        change: 0,
        period: 'monthly'
      }
    };
  }
  
  async getUserSkills(userId: string): Promise<DeveloperSkills> {
    return this.skills.get(userId) || this.createDefaultSkills(userId);
  }
  
  async getBatchUserSkills(userIds: string[]): Promise<DeveloperSkills[]> {
    return userIds.map(id => this.skills.get(id) || this.createDefaultSkills(id));
  }
  
  async updateSkills(updates: SkillUpdate[]): Promise<void> {
    for (const update of updates) {
      const current = await this.getUserSkills(update.userId);
      
      // Apply category changes
      if (update.categoryChanges) {
        Object.assign(current.categoryScores, update.categoryChanges);
      }
      
      // Update overall score
      current.overallScore = update.newScore;
      current.lastUpdated = update.timestamp;
      current.totalPRs++;
      
      // Update trend
      current.trend = {
        direction: update.newScore > update.previousScore ? 'up' : 
                  update.newScore < update.previousScore ? 'down' : 'stable',
        change: update.newScore - update.previousScore,
        period: 'weekly'
      };
      
      // Save updated skills
      this.skills.set(update.userId, current);
      
      // Record in history
      this.history.push(update);
    }
  }
  
  async getHistoricalData(params: HistoryParams): Promise<SkillHistory> {
    const relevantHistory = this.history.filter(h => {
      const inDateRange = h.timestamp >= params.startDate && h.timestamp <= params.endDate;
      const matchesUser = !params.userId || h.userId === params.userId;
      return inDateRange && matchesUser;
    });
    
    return {
      dataPoints: relevantHistory.map(h => ({
        timestamp: h.timestamp,
        score: h.newScore,
        categoryScores: {
          security: h.categoryChanges?.security || 70,
          performance: h.categoryChanges?.performance || 75,
          codeQuality: h.categoryChanges?.codeQuality || 80,
          architecture: h.categoryChanges?.architecture || 75,
          dependencies: h.categoryChanges?.dependencies || 70
        },
        prCount: 1,
        issuesFixed: (h.adjustments || []).filter(a => a.points > 0).length,
        issuesIntroduced: (h.adjustments || []).filter(a => a.points < 0).length
      })),
      summary: {
        averageScore: 75,
        highestScore: 85,
        lowestScore: 65,
        totalPRs: relevantHistory.length,
        improvement: 5,
        mostImprovedCategory: 'codeQuality',
        leastImprovedCategory: 'security'
      }
    };
  }
  
  async initializeNewDeveloper(userId: string, prScore: number): Promise<DeveloperSkills> {
    const skills = this.createDefaultSkills(userId);
    
    // Adjust based on first PR score
    if (prScore > 80) {
      skills.overallScore = 60;
      Object.keys(skills.categoryScores).forEach(key => {
        skills.categoryScores[key as keyof typeof skills.categoryScores] = 60;
      });
    }
    
    this.skills.set(userId, skills);
    return skills;
  }
  
  async getCategoryLeaderboard(
    category: keyof DeveloperSkills['categoryScores'], 
    limit = 10
  ): Promise<DeveloperSkills[]> {
    const allSkills = Array.from(this.skills.values());
    return allSkills
      .sort((a, b) => (b.categoryScores[category] || 0) - (a.categoryScores[category] || 0))
      .slice(0, limit);
  }
  
  async archiveDeveloper(userId: string): Promise<void> {
    this.skills.delete(userId);
  }
  
  private createDefaultSkills(userId: string): DeveloperSkills {
    return {
      userId,
      username: `user_${userId}`,
      email: `${userId}@test.com`,
      overallScore: 50,
      categoryScores: {
        security: 50,
        performance: 50,
        codeQuality: 50,
        architecture: 50,
        dependencies: 50
      },
      level: {
        current: 'D',
        numeric: 50,
        title: 'Junior'
      },
      trend: {
        direction: 'stable',
        change: 0,
        period: 'new'
      },
      lastUpdated: new Date(),
      totalPRs: 0,
      issuesFixed: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      issuesIntroduced: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };
  }
}