# Skill Tracking & Competitive Analysis Design

## Overview

This document outlines how we track developer skills over time and handle competitive analysis in customer reports.

---

## 1. Skill Tracking System

### Data Model

```typescript
interface DeveloperSkillProfile {
  userId: string;
  skills: {
    [category: string]: {
      currentScore: number;      // 0-100
      history: SkillDataPoint[]; // Historical scores
      level: SkillLevel;         // Beginner|Intermediate|Advanced|Expert
      nextLevelPoints: number;   // Points to next level
      velocity: number;          // Rate of improvement
    };
  };
  totalExperience: number;       // Total XP earned
  achievements: Achievement[];
  learningStreak: number;        // Days of continuous improvement
}

interface SkillDataPoint {
  timestamp: Date;
  score: number;
  prId: string;
  issuesResolved: number;
  issuesIntroduced: number;
  contextualFactors: {
    complexity: 'low' | 'medium' | 'high';
    reviewedBy: string[];
    technologies: string[];
  };
}
```

### Skill Categories

```yaml
skill_categories:
  language_specific:
    - JavaScript/TypeScript
    - Python
    - Java
    - Go
    - Rust
    
  domain_skills:
    - Security
    - Performance
    - Architecture
    - Testing
    - Debugging
    - Code Quality
    
  soft_skills:
    - Documentation
    - Code Readability
    - API Design
    - Error Handling
    
  specialized:
    - Accessibility
    - Internationalization
    - DevOps/CI-CD
    - Database Design
```

### Scoring Algorithm

```typescript
function calculateSkillScore(
  category: string,
  prAnalysis: PRAnalysisResult
): number {
  const baseScore = currentSkillScores[category] || 50;
  
  // Issue-based adjustments
  const resolved = prAnalysis.resolvedIssues
    .filter(issue => issue.category === category);
  const introduced = prAnalysis.introducedIssues
    .filter(issue => issue.category === category);
  
  // Weighted by severity
  const scoreChange = 
    resolved.reduce((sum, issue) => 
      sum + SEVERITY_POINTS[issue.severity], 0) -
    introduced.reduce((sum, issue) => 
      sum + SEVERITY_POINTS[issue.severity] * 0.5, 0);
  
  // Consider code quality metrics
  const qualityBonus = calculateQualityBonus(prAnalysis);
  
  // Learning from feedback (PR comments addressed)
  const feedbackBonus = calculateFeedbackBonus(prAnalysis);
  
  return Math.min(100, Math.max(0, 
    baseScore + scoreChange + qualityBonus + feedbackBonus
  ));
}

const SEVERITY_POINTS = {
  critical: 2.0,
  high: 1.5,
  medium: 1.0,
  low: 0.5
};
```

### Trend Visualization

```typescript
interface SkillTrendData {
  timeRange: '1m' | '3m' | '6m' | '1y';
  dataPoints: {
    date: Date;
    scores: { [skill: string]: number };
    milestone?: string; // "First Security Fix", "100th PR"
  }[];
  projections: {
    [skill: string]: {
      nextLevel: Date;      // Estimated date to reach next level
      velocity: number;     // Points per week
      confidence: number;   // Statistical confidence
    };
  };
}
```

### First-Time User Handling

For users without history, we show:

```markdown
### 📊 Skill Tracking Started!

This is your first analyzed PR. Your initial skill scores are:

| Skill | Initial Score | Based On |
|-------|--------------|----------|
| Security | 75/100 | Resolved 1 high issue, clean implementation |
| Testing | 84/100 | 90% coverage maintained |
| React Patterns | 85/100 | Proper Context API usage |

**What happens next:**
- Each PR will update your scores
- Track progress over time
- Unlock achievements
- Get personalized learning paths

**Coming in your next report:**
- Trend graphs
- Velocity metrics
- Team comparisons (anonymous)
```

---

## 2. Competitive Analysis Design

### Data Sources

Instead of hardcoding competitors, we pull from:

```typescript
interface CompetitorAnalysisConfig {
  enabled: boolean;
  dataSources: {
    marketResearch?: {
      provider: 'internal' | 'gartner' | 'custom';
      updateFrequency: 'weekly' | 'monthly';
    };
    publicData?: {
      githubRepos: string[];
      techRadar: boolean;
      stackShare: boolean;
    };
    userProvided?: {
      competitors: CompetitorProfile[];
    };
  };
}

interface CompetitorProfile {
  name: string;
  displayName?: string; // Anonymized as "Competitor A"
  features: { [feature: string]: boolean };
  lastUpdated: Date;
  source: string;
}
```

### Implementation Options

#### Option 1: User Configuration
```typescript
// User provides competitor data during onboarding
{
  "competitors": [
    {
      "name": "Internal System v1",
      "features": {
        "darkMode": false,
        "responsive": true,
        "offline": false
      }
    }
  ]
}
```

#### Option 2: Feature Database
```typescript
// We maintain a feature comparison database
interface FeatureComparison {
  category: string; // "authentication", "ui", "performance"
  feature: string;
  adoption: {
    percentage: number; // 78% of similar apps have this
    trend: 'increasing' | 'stable' | 'decreasing';
  };
  yourApp: boolean;
  industryBest: string; // Description of best implementation
}
```

#### Option 3: Remove Section
If no competitive data is available, omit the section entirely rather than show fake data.

---

## 3. Database Schema

### Skill Tracking Tables

```sql
-- Developer skills over time
CREATE TABLE developer_skills (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  skill_category VARCHAR(50),
  score INTEGER CHECK (score >= 0 AND score <= 100),
  level VARCHAR(20),
  recorded_at TIMESTAMP,
  pr_analysis_id UUID REFERENCES pr_analyses(id),
  
  INDEX idx_user_skill_time (user_id, skill_category, recorded_at)
);

-- Skill achievements
CREATE TABLE skill_achievements (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  achievement_type VARCHAR(50),
  skill_category VARCHAR(50),
  earned_at TIMESTAMP,
  pr_analysis_id UUID,
  metadata JSONB
);

-- Learning recommendations
CREATE TABLE learning_recommendations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  skill_category VARCHAR(50),
  recommendation_type VARCHAR(50),
  resource_url TEXT,
  estimated_time INTEGER, -- minutes
  potential_points INTEGER,
  priority INTEGER,
  created_at TIMESTAMP
);
```

---

## 4. API Endpoints

```typescript
// Get developer skill history
GET /api/developers/:userId/skills
Response: {
  current: { [skill: string]: SkillScore },
  history: SkillDataPoint[],
  trends: TrendData,
  achievements: Achievement[]
}

// Get skill projections
GET /api/developers/:userId/skills/projections
Response: {
  projections: { [skill: string]: Projection },
  recommendations: LearningPath[]
}

// Get team skill analytics (anonymized)
GET /api/teams/:teamId/skills/analytics
Response: {
  averages: { [skill: string]: number },
  distribution: { [skill: string]: Histogram },
  topPerformers: { skill: string, percentile: number }[]
}
```

---

## 5. Report Generation Logic

### With History
```typescript
if (userSkillHistory.length > 0) {
  report.addSection('skillTrends', {
    currentScores: calculateCurrentScores(),
    trends: generateTrendGraphs(),
    velocity: calculateImprovement velocity(),
    projections: projectFutureProgress(),
    achievements: getRecentAchievements()
  });
}
```

### Without History (First Analysis)
```typescript
else {
  report.addSection('skillBaseline', {
    initialScores: calculateInitialScores(prAnalysis),
    explanation: 'This is your starting point',
    whatToExpect: 'Future reports will show trends',
    immediateRecommendations: getQuickWins(prAnalysis)
  });
}
```

---

## 6. Privacy & Ethics

### Data Handling
- Skills data is private to the user
- Team comparisons are always anonymized
- No individual data shared without consent
- Right to delete skill history

### Fair Scoring
- Adjust for PR complexity
- Consider external factors
- No penalties for learning/experimentation
- Focus on growth, not absolute scores

---

## 7. Future Enhancements

### ML-Powered Insights
```typescript
interface MLSkillInsights {
  similarDevelopers: {
    skillProfile: 'similar to yours',
    averageProgressionTime: '6 months to Expert',
    successfulLearningPaths: LearningPath[]
  };
  predictedChallenges: string[];
  personalizedTips: string[];
}
```

### Gamification Elements
- Skill badges and certifications
- Team leaderboards (opt-in)
- Learning challenges
- Peer recognition system

### Integration with Learning Platforms
- Direct links to courses
- Progress tracking
- Completion certificates
- Skill verification

---

## 8. Implementation Timeline

### Phase 1: Basic Tracking (Current)
- Store scores per PR
- Show current levels
- Basic recommendations

### Phase 2: Trends & History (Q2 2025)
- Historical graphs
- Velocity calculations
- Projections

### Phase 3: Team Analytics (Q3 2025)
- Anonymous comparisons
- Team skill maps
- Hiring insights

### Phase 4: ML Enhancement (Q4 2025)
- Personalized learning paths
- Predictive analytics
- Smart recommendations

---

This design ensures we provide valuable skill tracking without fake data, respect privacy, and build features incrementally based on actual user data.