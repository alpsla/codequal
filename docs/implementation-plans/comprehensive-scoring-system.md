# Comprehensive Scoring System Implementation Plan

## Phase 1: Foundation (Current Sprint)

### 1.1 Schema Updates for Multi-Repo Support
```sql
-- Add repository context to skills
ALTER TABLE developer_skills ADD COLUMN repository TEXT;
ALTER TABLE developer_skills ADD COLUMN is_global BOOLEAN DEFAULT true;

-- Create composite unique constraint
ALTER TABLE developer_skills 
DROP CONSTRAINT IF EXISTS developer_skills_user_id_category_id_key;

ALTER TABLE developer_skills 
ADD CONSTRAINT developer_skills_unique 
UNIQUE (user_id, category_id, repository);

-- Create repository skill aggregation view
CREATE VIEW user_global_skills AS
SELECT 
  user_id,
  category_id,
  AVG(level) as global_level,
  COUNT(DISTINCT repository) as repo_count,
  MAX(level) as highest_repo_level,
  MIN(level) as lowest_repo_level
FROM developer_skills
WHERE repository IS NOT NULL
GROUP BY user_id, category_id;
```

### 1.2 Belt System Implementation
```typescript
enum BeltLevel {
  WHITE = 'WHITE',        // 0-50
  YELLOW = 'YELLOW',      // 50-100
  GREEN = 'GREEN',        // 100-150
  BROWN = 'BROWN',        // 150-200
  BLACK = 'BLACK',        // 200-250
  BLACK_2DAN = 'BLACK_2DAN', // 250-300
  BLACK_3DAN = 'BLACK_3DAN'  // 300+
}

interface DeveloperScore {
  userId: string;
  globalScore: number;
  belt: BeltLevel;
  repoScores: Map<string, number>;
  developmentMode: 'TRADITIONAL' | 'AI_ASSISTED' | 'MIXED';
}
```

## Phase 2: Intelligent Scoring (Week 1-2)

### 2.1 Development Mode Detection
```typescript
class DevelopmentModeDetector {
  detectMode(prHistory: PRAnalysis[]): DevelopmentMode {
    const last30Days = prHistory.filter(pr => pr.date > thirtyDaysAgo);
    
    const metrics = {
      prFrequency: last30Days.length / 4, // per week
      avgLinesChanged: average(last30Days.map(pr => pr.linesChanged)),
      avgTimeToMerge: average(last30Days.map(pr => pr.mergeTime)),
      codePatternConsistency: this.analyzePatterns(last30Days)
    };
    
    if (metrics.prFrequency > 10 && metrics.avgLinesChanged < 200) {
      return 'AI_ASSISTED';
    } else if (metrics.prFrequency < 5 && metrics.avgLinesChanged > 300) {
      return 'TRADITIONAL';
    } else {
      return 'MIXED';
    }
  }
}
```

### 2.2 Adaptive Point Calculation
```typescript
class AdaptiveScoringEngine {
  calculatePoints(pr: PRAnalysis, developer: Developer): ScoreUpdate {
    const basePoints = this.getBasePoints(pr);
    const mode = this.detectMode(developer.prHistory);
    
    // Diminishing returns implementation
    const issueCount = developer.totalIssuesFixed;
    const diminishingFactor = this.getDiminishingFactor(issueCount);
    
    // Mode-specific multipliers
    const modeMultiplier = {
      'AI_ASSISTED': 0.7,
      'TRADITIONAL': 1.0,
      'MIXED': 0.85
    }[mode];
    
    // Size and complexity multipliers
    const sizeMultiplier = this.getSizeMultiplier(pr.linesChanged);
    const complexityMultiplier = this.getComplexityMultiplier(pr);
    
    const finalPoints = basePoints 
      * diminishingFactor 
      * modeMultiplier 
      * sizeMultiplier 
      * complexityMultiplier;
    
    return {
      points: finalPoints,
      breakdown: {
        base: basePoints,
        diminishing: diminishingFactor,
        mode: modeMultiplier,
        size: sizeMultiplier,
        complexity: complexityMultiplier
      }
    };
  }
  
  private getDiminishingFactor(totalFixed: number): number {
    if (totalFixed < 10) return 1.0;
    if (totalFixed < 50) return 0.75;
    if (totalFixed < 100) return 0.5;
    return 0.25;
  }
}
```

## Phase 3: Team Collaboration (Week 3-4)

### 3.1 Review Tracking Integration
```typescript
interface ReviewContribution {
  reviewerId: string;
  prId: string;
  repository: string;
  contributions: {
    bugsCaught: number;
    improvementsSuggested: number;
    knowledgeShared: number;
    reviewSpeed: 'FAST' | 'NORMAL' | 'SLOW';
  };
  pointsEarned: number;
}

class ReviewScoringService {
  async scoreReview(review: GitHubReview): Promise<ReviewContribution> {
    const comments = await this.fetchReviewComments(review);
    const analyzed = await this.aiAnalyzer.categorizeComments(comments);
    
    let points = 0;
    points += analyzed.bugsCaught * 2.0;
    points += analyzed.securityIssues * 3.0;
    points += analyzed.improvements * 0.5;
    points += analyzed.knowledgeSharing * 0.3;
    
    // Speed bonus
    const reviewTime = review.submittedAt - review.pr.createdAt;
    if (reviewTime < 2 * HOUR) points += 0.5;
    else if (reviewTime < 4 * HOUR) points += 0.3;
    
    return {
      reviewerId: review.userId,
      prId: review.prId,
      repository: review.repository,
      contributions: analyzed,
      pointsEarned: points
    };
  }
}
```

### 3.2 Team Metrics Dashboard
```typescript
interface TeamMetrics {
  teamId: string;
  period: DateRange;
  members: TeamMember[];
  aggregates: {
    totalPRs: number;
    totalReviews: number;
    avgReviewTime: number;
    knowledgeSharingScore: number;
    collaborationIndex: number;
  };
  leaderboards: {
    topContributors: Developer[];
    topReviewers: Developer[];
    mostImproved: Developer[];
    bestCollaborators: Developer[];
  };
}
```

## Phase 4: Gamification & Motivation (Week 5-6)

### 4.1 Achievement System
```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  criteria: AchievementCriteria;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
}

const achievements: Achievement[] = [
  {
    id: 'bug_hunter',
    name: 'Bug Hunter',
    description: 'Caught 10 bugs in code reviews',
    icon: '🐛',
    points: 10,
    criteria: { reviewBugsCaught: 10 },
    rarity: 'COMMON'
  },
  {
    id: 'security_champion',
    name: 'Security Champion',
    description: 'Fixed 50 security issues',
    icon: '🛡️',
    points: 50,
    criteria: { securityIssuesFixed: 50 },
    rarity: 'EPIC'
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: '20 PRs in one week (AI-assisted)',
    icon: '⚡',
    points: 30,
    criteria: { weeklyPRs: 20, mode: 'AI_ASSISTED' },
    rarity: 'RARE'
  }
];
```

### 4.2 Streak & Bonus System
```typescript
class StreakManager {
  calculateStreakBonus(developer: Developer): number {
    const streaks = {
      dailyPR: this.getDailyPRStreak(developer),
      weeklyPerfect: this.getPerfectPRStreak(developer),
      monthlyImprovement: this.getImprovementStreak(developer)
    };
    
    let bonus = 0;
    if (streaks.dailyPR >= 5) bonus += 2;
    if (streaks.dailyPR >= 10) bonus += 3;
    if (streaks.weeklyPerfect >= 4) bonus += 5;
    if (streaks.monthlyImprovement >= 3) bonus += 10;
    
    return bonus;
  }
}
```

## Phase 5: Long-term Engagement (Month 2+)

### 5.1 Skill Decay Prevention
```typescript
class SkillMaintenanceSystem {
  applySkillDecay(skills: DeveloperSkills): DeveloperSkills {
    const updatedSkills = { ...skills };
    const now = Date.now();
    
    Object.entries(skills).forEach(([category, skill]) => {
      const daysSinceUse = (now - skill.lastUsed) / DAY;
      
      if (daysSinceUse > 14) {
        // Slow decay after 2 weeks of inactivity
        const decayRate = 0.01 * (daysSinceUse - 14);
        skill.level = Math.max(30, skill.level - decayRate);
      }
    });
    
    return updatedSkills;
  }
}
```

### 5.2 Prestige System
```typescript
interface PrestigeLevel {
  level: number;
  title: string;
  perks: string[];
  bonusMultiplier: number;
}

const prestigeLevels: PrestigeLevel[] = [
  {
    level: 1,
    title: 'Elite Developer',
    perks: ['Custom badge', '1.1x point multiplier'],
    bonusMultiplier: 1.1
  },
  {
    level: 2,
    title: 'Master Craftsman',
    perks: ['Mentor badge', '1.2x multiplier', 'Review priority'],
    bonusMultiplier: 1.2
  },
  {
    level: 3,
    title: 'Code Sage',
    perks: ['Legendary badge', '1.5x multiplier', 'Architecture reviews'],
    bonusMultiplier: 1.5
  }
];
```

## Implementation Timeline

### Week 1-2: Core Scoring
- [ ] Update database schema for multi-repo support
- [ ] Implement belt system
- [ ] Build adaptive scoring engine
- [ ] Add development mode detection

### Week 3-4: Team Features
- [ ] GitHub review API integration
- [ ] Review scoring system
- [ ] Team metrics calculation
- [ ] Basic team dashboard

### Week 5-6: Engagement
- [ ] Achievement system
- [ ] Streak tracking
- [ ] Bonus calculations
- [ ] Gamification UI elements

### Month 2: Polish & Scale
- [ ] Skill decay system
- [ ] Prestige levels
- [ ] Advanced analytics
- [ ] Performance optimization

## Success Metrics

1. **Engagement**: 80% of users check score weekly
2. **Retention**: 60% active after 3 months
3. **Progression**: Average user reaches Yellow belt in 2 months
4. **Team Adoption**: 40% upgrade to team subscriptions
5. **Fair Scoring**: <5% variance between AI-assisted and traditional developers reaching same belt level

## Next Steps

1. Review and approve plan
2. Create detailed technical specifications
3. Set up tracking for success metrics
4. Begin Phase 1 implementation