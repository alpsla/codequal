import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  ISkillProvider, 
  DeveloperSkills, 
  TeamSkills, 
  SkillUpdate,
  HistoryParams,
  SkillHistory,
  CategoryScores 
} from '../../standard/orchestrator/interfaces/skill-provider.interface';

/**
 * Supabase implementation of the skill provider
 */
export class SupabaseSkillProvider implements ISkillProvider {
  private supabase: SupabaseClient;
  private skillsTable = 'developer_skills';
  private historyTable = 'skill_history';
  private teamsTable = 'teams';

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getTeamSkills(teamId: string): Promise<TeamSkills> {
    try {
      // Get team info
      const { data: teamData, error: teamError } = await this.supabase
        .from(this.teamsTable)
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;

      // Get all team members' skills
      const { data: membersData, error: membersError } = await this.supabase
        .from(this.skillsTable)
        .select('*')
        .eq('teamId', teamId)
        .order('overallScore', { ascending: false });

      if (membersError) throw membersError;

      const members = (membersData || []).map(this.mapToDeveloperSkills);
      
      // Calculate team metrics
      const averageScore = members.reduce((sum, m) => sum + m.overallScore, 0) / members.length || 0;
      const topPerformers = members.filter(m => m.overallScore >= 80);
      const needsImprovement = members.filter(m => m.overallScore < 60);

      return {
        teamId,
        teamName: teamData.name,
        averageScore,
        memberCount: members.length,
        members,
        topPerformers,
        needsImprovement,
        overallTrend: {
          direction: 'stable', // Would calculate from history
          change: 0,
          period: 'monthly'
        }
      };
    } catch (error) {
      console.error('Error fetching team skills:', error);
      throw error;
    }
  }

  async getUserSkills(userId: string): Promise<DeveloperSkills> {
    try {
      const { data, error } = await this.supabase
        .from(this.skillsTable)
        .select('*')
        .eq('userId', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        // Return default skills for new developer
        return this.getDefaultSkills(userId);
      }

      return this.mapToDeveloperSkills(data);
    } catch (error) {
      console.error('Error fetching user skills:', error);
      throw error;
    }
  }

  async getBatchUserSkills(userIds: string[]): Promise<DeveloperSkills[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.skillsTable)
        .select('*')
        .in('userId', userIds);

      if (error) throw error;

      return (data || []).map(this.mapToDeveloperSkills);
    } catch (error) {
      console.error('Error fetching batch user skills:', error);
      return [];
    }
  }

  async updateSkills(updates: SkillUpdate[]): Promise<void> {
    try {
      // Update each user's skills
      for (const update of updates) {
        // Get existing skills first
        const existingSkills = await this.getUserSkills(update.userId);
        
        // Update current skills
        const { error: updateError } = await this.supabase
          .from(this.skillsTable)
          .update({
            overallScore: update.newScore,
            categoryScores: update.categoryChanges,
            lastUpdated: update.timestamp.toISOString(),
            totalPRs: existingSkills.totalPRs + 1
          })
          .eq('userId', update.userId);

        if (updateError) throw updateError;

        // Record in history
        const { error: historyError } = await this.supabase
          .from(this.historyTable)
          .insert({
            userId: update.userId,
            prId: update.prId,
            timestamp: update.timestamp.toISOString(),
            previousScore: update.previousScore,
            newScore: update.newScore,
            adjustments: update.adjustments,
            categoryChanges: update.categoryChanges
          });

        if (historyError) throw historyError;
      }
    } catch (error) {
      console.error('Error updating skills:', error);
      throw error;
    }
  }

  async getHistoricalData(params: HistoryParams): Promise<SkillHistory> {
    try {
      let query = this.supabase
        .from(this.historyTable)
        .select('*')
        .gte('timestamp', params.startDate.toISOString())
        .lte('timestamp', params.endDate.toISOString());

      if (params.userId) {
        query = query.eq('userId', params.userId);
      } else if (params.teamId) {
        query = query.eq('teamId', params.teamId);
      }

      const { data, error } = await query.order('timestamp', { ascending: true });

      if (error) throw error;

      // Process data into time series
      const dataPoints = this.processHistoricalData(data || [], params.granularity);
      const summary = this.calculateHistorySummary(dataPoints);

      return { dataPoints, summary };
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  }

  async initializeNewDeveloper(userId: string, prScore: number): Promise<DeveloperSkills> {
    try {
      // Calculate initial score based on first PR
      let initialScore = 50; // Base score
      if (prScore > 80) initialScore += 10;
      else if (prScore >= 60) initialScore += 5;

      const skills: DeveloperSkills = {
        userId,
        username: userId, // Would fetch from user service
        overallScore: initialScore,
        categoryScores: {
          security: initialScore,
          performance: initialScore,
          codeQuality: initialScore,
          architecture: initialScore,
          dependencies: initialScore
        },
        level: {
          current: this.getGrade(initialScore),
          numeric: initialScore,
          title: this.getTitle(initialScore)
        },
        trend: {
          direction: 'stable',
          change: 0,
          period: 'new'
        },
        lastUpdated: new Date(),
        totalPRs: 1,
        issuesFixed: { critical: 0, high: 0, medium: 0, low: 0 },
        issuesIntroduced: { critical: 0, high: 0, medium: 0, low: 0 }
      };

      // Save to database
      const { error } = await this.supabase
        .from(this.skillsTable)
        .insert(this.mapFromDeveloperSkills(skills));

      if (error) throw error;

      return skills;
    } catch (error) {
      console.error('Error initializing new developer:', error);
      throw error;
    }
  }

  async getCategoryLeaderboard(
    category: keyof CategoryScores, 
    limit: number = 10
  ): Promise<DeveloperSkills[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.skillsTable)
        .select('*')
        .order(`categoryScores->${category}`, { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(this.mapToDeveloperSkills);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  async archiveDeveloper(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.skillsTable)
        .update({ 
          archived: true,
          archivedAt: new Date().toISOString()
        })
        .eq('userId', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error archiving developer:', error);
      throw error;
    }
  }

  // Helper methods
  private mapToDeveloperSkills(data: any): DeveloperSkills {
    return {
      userId: data.userId,
      username: data.username,
      email: data.email,
      overallScore: data.overallScore,
      categoryScores: data.categoryScores,
      level: {
        current: this.getGrade(data.overallScore),
        numeric: data.overallScore,
        title: this.getTitle(data.overallScore)
      },
      trend: data.trend || {
        direction: 'stable',
        change: 0,
        period: 'monthly'
      },
      lastUpdated: new Date(data.lastUpdated),
      totalPRs: data.totalPRs,
      issuesFixed: data.issuesFixed,
      issuesIntroduced: data.issuesIntroduced
    };
  }

  private mapFromDeveloperSkills(skills: DeveloperSkills): any {
    return {
      userId: skills.userId,
      username: skills.username,
      email: skills.email,
      overallScore: skills.overallScore,
      categoryScores: skills.categoryScores,
      trend: skills.trend,
      lastUpdated: skills.lastUpdated.toISOString(),
      totalPRs: skills.totalPRs,
      issuesFixed: skills.issuesFixed,
      issuesIntroduced: skills.issuesIntroduced
    };
  }

  private getDefaultSkills(userId: string): DeveloperSkills {
    return {
      userId,
      username: userId,
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
        title: 'Beginner'
      },
      trend: {
        direction: 'stable',
        change: 0,
        period: 'new'
      },
      lastUpdated: new Date(),
      totalPRs: 0,
      issuesFixed: { critical: 0, high: 0, medium: 0, low: 0 },
      issuesIntroduced: { critical: 0, high: 0, medium: 0, low: 0 }
    };
  }

  private getGrade(score: number): string {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  private getTitle(score: number): string {
    if (score >= 90) return 'Expert';
    if (score >= 80) return 'Senior';
    if (score >= 70) return 'Experienced';
    if (score >= 60) return 'Competent';
    if (score >= 50) return 'Junior';
    return 'Beginner';
  }

  private processHistoricalData(data: any[], granularity?: string): any[] {
    // Implementation would aggregate data based on granularity
    return data;
  }

  private calculateHistorySummary(dataPoints: any[]): any {
    // Implementation would calculate summary statistics
    return {
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      totalPRs: 0,
      improvement: 0,
      mostImprovedCategory: '',
      leastImprovedCategory: ''
    };
  }
}