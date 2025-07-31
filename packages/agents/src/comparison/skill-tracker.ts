export interface SkillProfile {
  userId: string;
  skills: {
    security: SkillLevel;
    performance: SkillLevel;
    codeQuality: SkillLevel;
    architecture: SkillLevel;
    testing: SkillLevel;
    debugging: SkillLevel;
  };
  history: SkillHistory[];
  achievements: Achievement[];
  learningProgress: LearningProgress;
}

export interface SkillLevel {
  current: number; // 0-100
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: Date;
  issuesResolved: number;
  issuesIntroduced: number;
  experiencePoints: number;
}

export interface SkillHistory {
  date: Date;
  scores: Record<string, number>;
  prId: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedAt: Date;
  category: string;
  icon: string;
}

export interface LearningProgress {
  modulesCompleted: string[];
  currentModule?: {
    id: string;
    title: string;
    progress: number;
    estimatedTime: string;
  };
  totalLearningTime: number;
  streak: number;
}

export interface TeamSkillMetrics {
  teamId: string;
  averageScores: Record<string, number>;
  topPerformers: Array<{
    userId: string;
    name: string;
    score: number;
    specialty: string;
  }>;
  commonWeaknesses: string[];
  improvementRate: number;
}

export class SkillTracker {
  /**
   * Calculate skill impact based on PR analysis and remaining repository issues
   */
  static calculateSkillImpact(
    comparison: any,
    currentSkills: SkillProfile['skills'],
    mainAnalysis?: any,
    featureAnalysis?: any
  ): SkillProfile['skills'] {
    const updatedSkills = { ...currentSkills };
    
    // First, apply deductions for unresolved issues in the repository
    if (featureAnalysis) {
      const unresolvedIssues = featureAnalysis.issues || [];
      
      // Calculate deductions by category and severity
      const deductionMultipliers = {
        critical: -2.0,
        high: -1.5,
        medium: -1.0,
        low: -0.5
      };
      
      const categoryDeductions: Record<string, number> = {};
      
      unresolvedIssues.forEach((issue: any) => {
        const category = issue.category;
        const severity = issue.severity;
        const deduction = deductionMultipliers[severity as keyof typeof deductionMultipliers] || -0.5;
        
        if (!categoryDeductions[category]) {
          categoryDeductions[category] = 0;
        }
        categoryDeductions[category] += deduction;
      });
      
      // Apply deductions to skills
      if (categoryDeductions.security) {
        updatedSkills.security.current = Math.max(0, updatedSkills.security.current + categoryDeductions.security);
      }
      if (categoryDeductions.performance) {
        updatedSkills.performance.current = Math.max(0, updatedSkills.performance.current + categoryDeductions.performance);
      }
      if (categoryDeductions['code-quality'] || categoryDeductions.maintainability) {
        const deduction = (categoryDeductions['code-quality'] || 0) + (categoryDeductions.maintainability || 0);
        updatedSkills.codeQuality.current = Math.max(0, updatedSkills.codeQuality.current + deduction);
      }
      if (categoryDeductions.testing) {
        updatedSkills.testing.current = Math.max(0, updatedSkills.testing.current + categoryDeductions.testing);
      }
    }
    
    // Then apply bonuses for resolved issues
    const resolvedBonus = {
      critical: 2.0,
      high: 1.5,
      medium: 1.0,
      low: 0.5
    };
    
    // Security skill impact
    if (comparison.newIssues.critical.filter((i: any) => i.category === 'security').length > 0) {
      updatedSkills.security.current = Math.max(0, updatedSkills.security.current - 5);
      updatedSkills.security.trend = 'declining';
      updatedSkills.security.issuesIntroduced += comparison.securityImpact.vulnerabilitiesAdded;
    }
    
    // Apply bonuses for resolved security issues
    const resolvedSecurityIssues = [
      ...comparison.resolvedIssues.critical.filter((i: any) => i.category === 'security'),
      ...comparison.resolvedIssues.high.filter((i: any) => i.category === 'security'),
      ...comparison.resolvedIssues.medium.filter((i: any) => i.category === 'security')
    ];
    
    if (resolvedSecurityIssues.length > 0) {
      let totalBonus = 0;
      resolvedSecurityIssues.forEach((issue: any) => {
        totalBonus += resolvedBonus[issue.severity as keyof typeof resolvedBonus] || 0.5;
      });
      updatedSkills.security.current = Math.min(100, updatedSkills.security.current + totalBonus);
      updatedSkills.security.trend = 'improving';
      updatedSkills.security.issuesResolved += resolvedSecurityIssues.length;
      updatedSkills.security.experiencePoints += 50 * resolvedSecurityIssues.length;
    }
    
    // Performance skill impact
    if (comparison.performanceImpact.score > 0) {
      updatedSkills.performance.current = Math.min(100, updatedSkills.performance.current + 2);
      updatedSkills.performance.trend = 'improving';
      updatedSkills.performance.experiencePoints += 30;
    } else if (comparison.performanceImpact.regressions.length > 0) {
      updatedSkills.performance.current = Math.max(0, updatedSkills.performance.current - 3);
      updatedSkills.performance.trend = 'declining';
    }
    
    // Code quality skill impact
    const codeQualityChange = comparison.scoreChanges.maintainability?.change || 0;
    if (codeQualityChange > 0) {
      updatedSkills.codeQuality.current = Math.min(100, updatedSkills.codeQuality.current + 1);
      updatedSkills.codeQuality.trend = 'improving';
      updatedSkills.codeQuality.experiencePoints += 20;
    }
    
    // Testing skill impact
    const testingChange = comparison.scoreChanges.testing?.change || 0;
    if (testingChange > 5) {
      updatedSkills.testing.current = Math.min(100, updatedSkills.testing.current + 3);
      updatedSkills.testing.trend = 'improving';
      updatedSkills.testing.experiencePoints += 40;
    }
    
    // Architecture skill impact
    if (comparison.modifiedPatterns.added.length > 0) {
      updatedSkills.architecture.current = Math.min(100, updatedSkills.architecture.current + 2);
      updatedSkills.architecture.experiencePoints += 35;
    }
    
    // Update timestamps
    Object.keys(updatedSkills).forEach(skill => {
      updatedSkills[skill as keyof typeof updatedSkills].lastUpdated = new Date();
    });
    
    return updatedSkills;
  }

  /**
   * Generate personalized learning recommendations based on skill gaps
   */
  static generatePersonalizedLearning(
    skills: SkillProfile['skills'],
    issues: any,
    maxRecommendations = 3
  ): LearningRecommendation[] {
    const recommendations: LearningRecommendation[] = [];
    const skillGaps = this.identifySkillGaps(skills);
    
    // Priority 1: Critical security gaps
    if (skillGaps.security.gap > 30 && issues.critical.some((i: any) => i.category === 'security')) {
      recommendations.push({
        id: 'sec-critical-1',
        title: 'Critical Security Fundamentals',
        description: 'Master input validation and SQL injection prevention',
        priority: 'critical',
        skillArea: 'security',
        modules: [
          {
            title: 'Input Validation & Sanitization',
            duration: '45 minutes',
            topics: ['XSS Prevention', 'SQL Injection', 'CSRF Protection'],
            practiceCode: this.getSecurityPracticeCode('validation')
          },
          {
            title: 'Secure Authentication',
            duration: '30 minutes',
            topics: ['JWT Best Practices', 'Session Management', 'Password Hashing'],
            practiceCode: this.getSecurityPracticeCode('auth')
          }
        ],
        estimatedTime: '75 minutes',
        experienceReward: 150,
        badge: 'Security Guardian'
      });
    }
    
    // Priority 2: Performance issues
    if (skillGaps.performance.gap > 25 && issues.high.some((i: any) => i.category === 'performance')) {
      recommendations.push({
        id: 'perf-1',
        title: 'Performance Optimization Essentials',
        description: 'Learn to identify and fix performance bottlenecks',
        priority: 'high',
        skillArea: 'performance',
        modules: [
          {
            title: 'Database Query Optimization',
            duration: '30 minutes',
            topics: ['N+1 Queries', 'Indexing', 'Query Analysis'],
            practiceCode: this.getPerformancePracticeCode('database')
          },
          {
            title: 'Frontend Performance',
            duration: '25 minutes',
            topics: ['Bundle Optimization', 'Lazy Loading', 'Memory Leaks'],
            practiceCode: this.getPerformancePracticeCode('frontend')
          }
        ],
        estimatedTime: '55 minutes',
        experienceReward: 100,
        badge: 'Performance Pro'
      });
    }
    
    // Priority 3: Testing improvements
    if (skills.testing.current < 70) {
      recommendations.push({
        id: 'test-1',
        title: 'Effective Testing Strategies',
        description: 'Write tests that actually catch bugs',
        priority: 'medium',
        skillArea: 'testing',
        modules: [
          {
            title: 'Unit Testing Best Practices',
            duration: '20 minutes',
            topics: ['Test Structure', 'Mocking', 'Coverage'],
            practiceCode: this.getTestingPracticeCode('unit')
          }
        ],
        estimatedTime: '20 minutes',
        experienceReward: 75,
        badge: 'Test Master'
      });
    }
    
    return recommendations.slice(0, maxRecommendations);
  }

  /**
   * Calculate team metrics and comparisons
   */
  static calculateTeamMetrics(
    teamProfiles: SkillProfile[],
    currentUserId: string
  ): TeamComparison {
    const avgScores = this.calculateAverageScores(teamProfiles);
    const userProfile = teamProfiles.find(p => p.userId === currentUserId);
    
    if (!userProfile) {
      // If user not in team, return default metrics
      return {
        userRank: teamProfiles.length + 1,
        totalMembers: teamProfiles.length,
        percentile: 0,
        comparisonToAverage: {},
        strongestSkill: 'codeQuality',
        improvementSuggestion: 'Join the team to track your progress'
      };
    }
    
    const userRank = this.calculateUserRank(userProfile, teamProfiles);
    const percentile = Math.round((1 - userRank / teamProfiles.length) * 100);
    
    return {
      userRank,
      totalMembers: teamProfiles.length,
      percentile,
      comparisonToAverage: {
        security: userProfile.skills.security.current - avgScores.security,
        performance: userProfile.skills.performance.current - avgScores.performance,
        codeQuality: userProfile.skills.codeQuality.current - avgScores.codeQuality,
        architecture: userProfile.skills.architecture.current - avgScores.architecture,
        testing: userProfile.skills.testing.current - avgScores.testing
      },
      strongestSkill: this.getStrongestSkill(userProfile.skills),
      improvementSuggestion: this.getImprovementSuggestion(userProfile.skills, avgScores)
    };
  }

  /**
   * Generate motivational insights based on progress
   */
  static generateMotivationalInsights(
    currentSkills: SkillProfile['skills'],
    previousSkills: SkillProfile['skills'],
    achievements: Achievement[]
  ): MotivationalInsight[] {
    const insights: MotivationalInsight[] = [];
    
    // Check for improvements
    Object.keys(currentSkills).forEach(skill => {
      const current = currentSkills[skill as keyof typeof currentSkills];
      const previous = previousSkills[skill as keyof typeof previousSkills];
      
      if (current.current > previous.current) {
        insights.push({
          type: 'improvement',
          message: `Great job! Your ${skill} skills improved by ${current.current - previous.current} points! 🎉`,
          icon: '📈'
        });
      }
      
      // Milestone achievements
      if (current.current >= 80 && previous.current < 80) {
        insights.push({
          type: 'milestone',
          message: `You've reached Expert level in ${skill}! You're now in the top 20% of developers! 🏆`,
          icon: '🌟'
        });
      }
    });
    
    // Streak recognition
    const recentAchievements = achievements.filter(a => 
      new Date(a.earnedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    if (recentAchievements.length >= 3) {
      insights.push({
        type: 'streak',
        message: `You're on fire! ${recentAchievements.length} achievements this week! Keep it up! 🔥`,
        icon: '🔥'
      });
    }
    
    return insights;
  }

  // Helper methods
  private static identifySkillGaps(skills: SkillProfile['skills']): Record<string, { gap: number, priority: string }> {
    const targetLevels = {
      security: 85,
      performance: 80,
      codeQuality: 80,
      architecture: 75,
      testing: 80,
      debugging: 75
    };
    
    const gaps: Record<string, { gap: number, priority: string }> = {};
    
    Object.keys(skills).forEach(skill => {
      const current = skills[skill as keyof typeof skills].current;
      const target = targetLevels[skill as keyof typeof targetLevels];
      const gap = target - current;
      
      gaps[skill] = {
        gap: Math.max(0, gap),
        priority: gap > 30 ? 'critical' : gap > 20 ? 'high' : gap > 10 ? 'medium' : 'low'
      };
    });
    
    return gaps;
  }

  private static getSecurityPracticeCode(type: string): string {
    const examples = {
      validation: `// ❌ Vulnerable Code
const query = \`SELECT * FROM users WHERE id = \${userId}\`;

// ✅ Secure Code
const query = 'SELECT * FROM users WHERE id = $1';
const result = await db.query(query, [userId]);

// Practice: Fix this XSS vulnerability
function displayComment(comment) {
  // TODO: Make this secure
  document.getElementById('output').innerHTML = comment;
}`,
      auth: `// Implement secure password hashing
async function hashPassword(password) {
  // TODO: Use bcrypt or argon2
}

// Validate JWT tokens
function validateToken(token) {
  // TODO: Implement proper validation
}`
    };
    
    return examples[type as keyof typeof examples] || '';
  }

  private static getPerformancePracticeCode(type: string): string {
    const examples = {
      database: `// ❌ N+1 Query Problem
const users = await User.findAll();
for (const user of users) {
  user.posts = await Post.findByUserId(user.id);
}

// ✅ Optimized with eager loading
const users = await User.findAll({
  include: [{ model: Post }]
});

// Practice: Optimize this query
async function getOrdersWithProducts() {
  // TODO: Fix the N+1 problem here
  const orders = await Order.findAll();
  for (const order of orders) {
    order.products = await Product.findByOrderId(order.id);
  }
  return orders;
}`,
      frontend: `// Practice: Optimize React rendering
function ProductList({ products }) {
  // TODO: Add memoization
  const expensiveCalculation = products.map(p => 
    calculateComplexMetric(p)
  );
  
  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} {...product} />
      ))}
    </div>
  );
}`
    };
    
    return examples[type as keyof typeof examples] || '';
  }

  private static getTestingPracticeCode(type: string): string {
    return `// Practice: Write a test for this function
function calculateDiscount(price, userType) {
  if (userType === 'premium') {
    return price * 0.8;
  }
  return price;
}

// TODO: Write comprehensive tests
describe('calculateDiscount', () => {
  it('should apply 20% discount for premium users', () => {
    // Your test here
  });
  
  // Add more test cases
});`;
  }

  private static calculateAverageScores(profiles: SkillProfile[]): Record<string, number> {
    const sums: Record<string, number> = {
      security: 0,
      performance: 0,
      codeQuality: 0,
      architecture: 0,
      testing: 0
    };
    
    profiles.forEach(profile => {
      Object.keys(sums).forEach(skill => {
        sums[skill] += profile.skills[skill as keyof typeof profile.skills].current;
      });
    });
    
    const averages: Record<string, number> = {};
    Object.keys(sums).forEach(skill => {
      averages[skill] = Math.round(sums[skill] / profiles.length);
    });
    
    return averages;
  }

  private static calculateUserRank(userProfile: SkillProfile, teamProfiles: SkillProfile[]): number {
    const userTotal = Object.values(userProfile.skills).reduce((sum, skill) => sum + skill.current, 0);
    const sorted = teamProfiles
      .map(p => ({
        userId: p.userId,
        total: Object.values(p.skills).reduce((sum, skill) => sum + skill.current, 0)
      }))
      .sort((a, b) => b.total - a.total);
    
    return sorted.findIndex(p => p.userId === userProfile.userId) + 1;
  }

  private static getStrongestSkill(skills: SkillProfile['skills']): string {
    let strongest = '';
    let highestScore = 0;
    
    Object.entries(skills).forEach(([skill, data]) => {
      if (data.current > highestScore) {
        highestScore = data.current;
        strongest = skill;
      }
    });
    
    return strongest;
  }

  private static getImprovementSuggestion(
    userSkills: SkillProfile['skills'],
    teamAverages: Record<string, number>
  ): string {
    let biggestGap = 0;
    let skillToImprove = '';
    
    Object.keys(userSkills).forEach(skill => {
      const gap = teamAverages[skill] - userSkills[skill as keyof typeof userSkills].current;
      if (gap > biggestGap) {
        biggestGap = gap;
        skillToImprove = skill;
      }
    });
    
    if (biggestGap > 10) {
      return `Focus on improving your ${skillToImprove} skills to match the team average`;
    }
    
    return 'You\'re performing above team average! Help mentor others.';
  }
}

// Type definitions
export interface LearningRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  skillArea: string;
  modules: LearningModule[];
  estimatedTime: string;
  experienceReward: number;
  badge?: string;
}

export interface LearningModule {
  title: string;
  duration: string;
  topics: string[];
  practiceCode: string;
}

export interface TeamComparison {
  userRank: number;
  totalMembers: number;
  percentile: number;
  comparisonToAverage: Record<string, number>;
  strongestSkill: string;
  improvementSuggestion: string;
}

export interface MotivationalInsight {
  type: 'improvement' | 'milestone' | 'streak' | 'comparison';
  message: string;
  icon: string;
}