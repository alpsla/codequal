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
        .eq('team_id', teamId)
        .order('overall_score', { ascending: false });

      if (membersError) throw membersError;

      const members = (membersData || []).map(data => this.mapToDeveloperSkills(data));
      
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
        .eq('user_id', userId)  // Changed from userId to user_id
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
        .in('user_id', userIds);

      if (error) throw error;

      return (data || []).map(d => this.mapToDeveloperSkills(d));
    } catch (error) {
      console.error('Error fetching batch user skills:', error);
      return [];
    }
  }

  async updateSkills(updates: SkillUpdate[]): Promise<void> {
    try {
      // Process each update
      for (const update of updates) {
        // Get current skills to determine previous score
        const existingSkills = await this.getUserSkills(update.userId);
        const isNewDeveloper = existingSkills.totalPRs === 0;
        
        // Calculate actual previous score (not from the update)
        const previousScore = isNewDeveloper ? 50 : existingSkills.overallScore;
        
        // Prepare category score updates (merge with existing)
        const updatedCategoryScores = {
          ...existingSkills.categoryScores,
          ...update.categoryChanges
        };
        
        // Calculate issues fixed/introduced from adjustments
        const issuesFixed = { critical: 0, high: 0, medium: 0, low: 0 };
        const issuesIntroduced = { critical: 0, high: 0, medium: 0, low: 0 };
        
        update.adjustments?.forEach(adj => {
          if (adj.reason.includes('Fixed') || adj.reason.includes('Resolved')) {
            const severity = this.extractSeverity(adj.reason);
            if (severity && issuesFixed[severity as keyof typeof issuesFixed] !== undefined) {
              issuesFixed[severity as keyof typeof issuesFixed]++;
            }
          } else if (adj.reason.includes('Introduced') || adj.reason.includes('New')) {
            const severity = this.extractSeverity(adj.reason);
            if (severity && issuesIntroduced[severity as keyof typeof issuesIntroduced] !== undefined) {
              issuesIntroduced[severity as keyof typeof issuesIntroduced]++;
            }
          }
        });
        
        // Merge with existing issue counts
        const totalIssuesFixed = {
          critical: existingSkills.issuesFixed.critical + issuesFixed.critical,
          high: existingSkills.issuesFixed.high + issuesFixed.high,
          medium: existingSkills.issuesFixed.medium + issuesFixed.medium,
          low: existingSkills.issuesFixed.low + issuesFixed.low
        };
        
        const totalIssuesIntroduced = {
          critical: existingSkills.issuesIntroduced.critical + issuesIntroduced.critical,
          high: existingSkills.issuesIntroduced.high + issuesIntroduced.high,
          medium: existingSkills.issuesIntroduced.medium + issuesIntroduced.medium,
          low: existingSkills.issuesIntroduced.low + issuesIntroduced.low
        };
        
        // Calculate trend
        const trend = {
          direction: update.newScore > previousScore ? 'up' : 
                    update.newScore < previousScore ? 'down' : 'stable',
          change: update.newScore - previousScore,
          period: 'recent'
        };
        
        // Upsert developer skills
        const { error: upsertError } = await this.supabase
          .from(this.skillsTable)
          .upsert({
            user_id: update.userId,  // Changed to snake_case
            category_id: '00000000-0000-0000-0000-000000000001',  // Default category UUID
            username: existingSkills.username || update.userId,
            email: existingSkills.email,
            overall_score: update.newScore,  // Changed to snake_case
            // Individual category scores
            security_score: updatedCategoryScores.security,
            performance_score: updatedCategoryScores.performance,
            code_quality_score: updatedCategoryScores.codeQuality,
            architecture_score: updatedCategoryScores.architecture,
            dependencies_score: updatedCategoryScores.dependencies,
            testing_score: updatedCategoryScores.testing || 50,
            // Level fields
            level_current: this.getGrade(update.newScore),
            level_numeric: update.newScore,
            level_title: this.getTitle(update.newScore),
            // Trend fields
            trend_direction: trend.direction,
            trend_change: trend.change,
            trend_period: trend.period,
            total_prs: existingSkills.totalPRs + 1,  // Changed to snake_case
            // Individual issue counts
            issues_fixed_critical: totalIssuesFixed.critical,
            issues_fixed_high: totalIssuesFixed.high,
            issues_fixed_medium: totalIssuesFixed.medium,
            issues_fixed_low: totalIssuesFixed.low,
            issues_introduced_critical: totalIssuesIntroduced.critical,
            issues_introduced_high: totalIssuesIntroduced.high,
            issues_introduced_medium: totalIssuesIntroduced.medium,
            issues_introduced_low: totalIssuesIntroduced.low,
            last_updated: update.timestamp.toISOString()  // Changed to snake_case
          }, {
            onConflict: 'user_id'  // Changed to snake_case
          });

        if (upsertError) {
          console.error('Error upserting developer skills:', upsertError);
          throw upsertError;
        }

        // Record in history
        const { error: historyError } = await this.supabase
          .from(this.historyTable)
          .insert({
            user_id: update.userId,  // Changed to snake_case
            pr_id: update.prId,  // Changed to snake_case
            timestamp: update.timestamp.toISOString(),
            previous_score: previousScore,  // Changed to snake_case
            new_score: update.newScore,  // Changed to snake_case
            adjustments: update.adjustments,
            category_changes: update.categoryChanges,  // Changed to snake_case
            pr_metadata: {  // Changed to snake_case
              isFirstPR: isNewDeveloper,
              scoreChange: update.newScore - previousScore
            }
          });

        if (historyError) {
          console.error('Error inserting skill history:', historyError);
          throw historyError;
        }
        
        // Log the update
        console.log(`Updated skills for ${update.userId}:`, {
          previousScore,
          newScore: update.newScore,
          change: update.newScore - previousScore,
          totalPRs: existingSkills.totalPRs + 1,
          isNewDeveloper
        });
      }
    } catch (error) {
      console.error('Error in updateSkills:', error);
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
        query = query.eq('user_id', params.userId);
      } else if (params.teamId) {
        query = query.eq('team_id', params.teamId);
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
    limit = 10
  ): Promise<DeveloperSkills[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.skillsTable)
        .select('*')
        .order(`${category}_score`, { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(d => this.mapToDeveloperSkills(d));
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
          archived_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error archiving developer:', error);
      throw error;
    }
  }

  // Helper methods
  private mapToDeveloperSkills(data: any): DeveloperSkills {
    return {
      userId: data.user_id,  // Changed from data.userId
      username: data.username,
      email: data.email,
      overallScore: data.overall_score,  // Changed from data.overallScore
      categoryScores: {
        security: data.security_score || 50,
        performance: data.performance_score || 50,
        codeQuality: data.code_quality_score || 50,
        architecture: data.architecture_score || 50,
        dependencies: data.dependencies_score || 50,
        testing: data.testing_score || 50
      },
      level: {
        current: data.level_current || this.getGrade(data.overall_score),
        numeric: data.level_numeric || data.overall_score,
        title: data.level_title || this.getTitle(data.overall_score)
      },
      trend: {
        direction: data.trend_direction || 'stable',
        change: data.trend_change || 0,
        period: data.trend_period || 'monthly'
      },
      lastUpdated: new Date(data.last_updated),  // Changed from data.lastUpdated
      totalPRs: data.total_prs,  // Changed from data.totalPRs
      issuesFixed: {
        critical: data.issues_fixed_critical || 0,
        high: data.issues_fixed_high || 0,
        medium: data.issues_fixed_medium || 0,
        low: data.issues_fixed_low || 0
      },
      issuesIntroduced: {
        critical: data.issues_introduced_critical || 0,
        high: data.issues_introduced_high || 0,
        medium: data.issues_introduced_medium || 0,
        low: data.issues_introduced_low || 0
      }
    };
  }

  private mapFromDeveloperSkills(skills: DeveloperSkills): any {
    return {
      user_id: skills.userId,  // Changed to snake_case
      category_id: '00000000-0000-0000-0000-000000000001',  // Default category UUID
      username: skills.username,
      email: skills.email,
      overall_score: skills.overallScore,  // Changed to snake_case
      // Individual category scores
      security_score: skills.categoryScores.security,
      performance_score: skills.categoryScores.performance,
      code_quality_score: skills.categoryScores.codeQuality,
      architecture_score: skills.categoryScores.architecture,
      dependencies_score: skills.categoryScores.dependencies,
      testing_score: skills.categoryScores.testing || 50,
      // Level fields
      level_current: skills.level.current,
      level_numeric: skills.level.numeric,
      level_title: skills.level.title,
      // Trend fields
      trend_direction: skills.trend.direction,
      trend_change: skills.trend.change,
      trend_period: skills.trend.period,
      last_updated: skills.lastUpdated.toISOString(),  // Changed to snake_case
      total_prs: skills.totalPRs,  // Changed to snake_case
      // Individual issue counts
      issues_fixed_critical: skills.issuesFixed.critical,
      issues_fixed_high: skills.issuesFixed.high,
      issues_fixed_medium: skills.issuesFixed.medium,
      issues_fixed_low: skills.issuesFixed.low,
      issues_introduced_critical: skills.issuesIntroduced.critical,
      issues_introduced_high: skills.issuesIntroduced.high,
      issues_introduced_medium: skills.issuesIntroduced.medium,
      issues_introduced_low: skills.issuesIntroduced.low
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

  private extractSeverity(reason: string): string | null {
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('critical')) return 'critical';
    if (lowerReason.includes('high')) return 'high';
    if (lowerReason.includes('medium')) return 'medium';
    if (lowerReason.includes('low')) return 'low';
    return null;
  }
}