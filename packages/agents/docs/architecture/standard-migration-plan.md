# Standard Directory Migration Plan

## Overview
Consolidate all active services, utilities, and components into the `standard` directory to maintain a clean, organized codebase.

## Current State vs Target State

### Current Structure (Scattered)
```
packages/agents/src/
├── services/           # Old services location
├── utils/             # Old utilities
├── monitoring/        # Old monitoring
├── logging/          # Old logging
├── security/         # Old security
├── auth/             # Old authentication
└── standard/         # New consolidated location
    ├── comparison/   # ✅ Already migrated
    ├── orchestrator/ # ✅ Already migrated
    └── services/     # ✅ Partially migrated
```

### Target Structure (Consolidated)
```
packages/agents/src/standard/
├── comparison/          # PR comparison and analysis
├── orchestrator/        # Workflow orchestration
├── services/           # All services
│   ├── deepwiki/       # DeepWiki integration
│   ├── model-research/ # AI model selection
│   ├── cache/          # Redis caching
│   └── database/       # Supabase integration
├── monitoring/         # Monitoring & telemetry
│   ├── metrics/        # Performance metrics
│   ├── alerts/         # Alert management
│   └── tracing/        # Distributed tracing
├── logging/            # Logging infrastructure
│   ├── formatters/     # Log formatters
│   ├── transports/     # Log destinations
│   └── middleware/     # Logging middleware
├── security/           # Security services
│   ├── validation/     # Input validation
│   ├── sanitization/   # Data sanitization
│   ├── encryption/     # Encryption utilities
│   └── audit/          # Audit logging
├── auth/               # Authentication & authorization
│   ├── providers/      # Auth providers
│   ├── middleware/     # Auth middleware
│   └── tokens/         # Token management
├── skills/             # Skill tracking system
│   ├── storage/        # Skill data storage
│   ├── calculation/    # Score calculation
│   ├── achievements/   # Awards & badges
│   └── analytics/      # Team analytics
├── utils/              # Utility functions
│   ├── validators/     # Data validators
│   ├── formatters/     # Data formatters
│   ├── helpers/        # Helper functions
│   └── constants/      # Constants & configs
├── types/              # TypeScript types
├── tests/              # Test suites
│   ├── unit/          # Unit tests
│   ├── integration/    # Integration tests
│   └── regression/     # Regression tests
└── infrastructure/     # Infrastructure code
    ├── supabase/      # Database schemas
    ├── redis/         # Cache configs
    └── kubernetes/    # K8s manifests
```

## Migration Tasks

### Phase 1: Core Services Migration
- [ ] Move monitoring services to `standard/monitoring/`
- [ ] Move logging services to `standard/logging/`
- [ ] Move security services to `standard/security/`
- [ ] Move authentication to `standard/auth/`
- [ ] Move all utilities to `standard/utils/`

### Phase 2: Skill System Enhancement
- [ ] Create `standard/skills/` directory structure
- [ ] Implement skill storage service
- [ ] Create achievement matrix system
- [ ] Build team analytics service
- [ ] Implement skill progression tracking

### Phase 3: Cleanup
- [ ] Remove old directories
- [ ] Update all import paths
- [ ] Fix TypeScript references
- [ ] Update documentation

## Skill System Architecture

### Database Schema
```sql
-- User Skills Table
CREATE TABLE user_skills (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  skill_category VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL,
  last_updated TIMESTAMP NOT NULL,
  trend VARCHAR(10), -- 'up', 'down', 'stable'
  UNIQUE(user_id, skill_category)
);

-- Achievements Table
CREATE TABLE achievements (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(50),
  points INTEGER,
  criteria JSONB
);

-- User Achievements Table
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL,
  earned_at TIMESTAMP NOT NULL,
  pr_id VARCHAR(100),
  UNIQUE(user_id, achievement_id)
);

-- Team Skills Table
CREATE TABLE team_skills (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL,
  skill_category VARCHAR(50) NOT NULL,
  average_score INTEGER NOT NULL,
  total_members INTEGER NOT NULL,
  last_calculated TIMESTAMP NOT NULL,
  UNIQUE(team_id, skill_category)
);

-- Skill History Table
CREATE TABLE skill_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  skill_category VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL,
  pr_id VARCHAR(100),
  recorded_at TIMESTAMP NOT NULL,
  INDEX idx_user_skill_time (user_id, skill_category, recorded_at)
);
```

### Achievement Matrix
```typescript
export const ACHIEVEMENT_MATRIX = {
  // Security Achievements
  security: {
    'Security Novice': { threshold: 10, description: 'Fixed 10 security issues' },
    'Security Guardian': { threshold: 50, description: 'Fixed 50 security issues' },
    'Security Expert': { threshold: 100, description: 'Fixed 100 security issues' },
    'Zero Vulnerability': { special: true, description: 'PR with no security issues' }
  },
  
  // Performance Achievements
  performance: {
    'Speed Demon': { threshold: 10, description: 'Fixed 10 performance issues' },
    'Performance Ninja': { threshold: 50, description: 'Fixed 50 performance issues' },
    'Optimization Master': { threshold: 100, description: 'Fixed 100 performance issues' }
  },
  
  // Code Quality Achievements
  quality: {
    'Clean Coder': { threshold: 10, description: '10 PRs with quality score > 80' },
    'Quality Champion': { threshold: 50, description: '50 PRs with quality score > 80' },
    'Perfectionist': { special: true, description: 'PR with 100/100 quality score' }
  },
  
  // Team Achievements
  team: {
    'Team Player': { threshold: 5, description: 'Helped 5 team members' },
    'Mentor': { threshold: 20, description: 'Mentored 20 PRs' },
    'Leadership': { special: true, description: 'Top team contributor for a month' }
  },
  
  // Streak Achievements
  streaks: {
    'Consistent': { threshold: 7, description: '7-day improvement streak' },
    'Dedicated': { threshold: 30, description: '30-day improvement streak' },
    'Unstoppable': { threshold: 100, description: '100-day improvement streak' }
  }
};
```

### Skill Categories
```typescript
export interface SkillCategories {
  security: number;      // 0-100
  performance: number;    // 0-100
  codeQuality: number;   // 0-100
  testing: number;       // 0-100
  architecture: number;  // 0-100
  documentation: number; // 0-100
  collaboration: number; // 0-100
}

export interface TeamSkills {
  teamId: string;
  teamName: string;
  averageSkills: SkillCategories;
  topPerformers: UserSkill[];
  improvementAreas: string[];
  rank: number;
}

export interface SkillProgression {
  userId: string;
  currentLevel: number;
  currentXP: number;
  nextLevelXP: number;
  recentAchievements: Achievement[];
  skillTrends: SkillTrend[];
  recommendations: SkillRecommendation[];
}
```

## Implementation Priority

### High Priority (Week 1)
1. Migrate monitoring to standard/monitoring
2. Migrate logging to standard/logging
3. Create skill storage service
4. Implement achievement system

### Medium Priority (Week 2)
1. Migrate security services
2. Migrate authentication
3. Create team analytics
4. Build skill progression system

### Low Priority (Week 3)
1. Create gamification features
2. Build skill visualization
3. Implement skill decay
4. Create portfolio export

## Testing Strategy

### Unit Tests
- Test skill calculation algorithms
- Test achievement criteria evaluation
- Test team score aggregation

### Integration Tests
- Test skill storage and retrieval
- Test achievement notifications
- Test team leaderboard updates

### E2E Tests
- Test complete PR analysis with skill updates
- Test achievement unlocking flow
- Test team analytics generation

## Success Metrics

1. **Code Organization**
   - 100% of active code in standard directory
   - 0 files in deprecated directories
   - All imports using standard paths

2. **Skill System**
   - < 100ms skill calculation time
   - < 50ms achievement check time
   - 100% skill data persistence

3. **Team Analytics**
   - Real-time team score updates
   - Historical trend tracking
   - Cross-team comparisons

## Rollback Plan

If migration causes issues:
1. Keep old directories intact initially
2. Use feature flags for new skill system
3. Maintain backward compatibility
4. Gradual rollout with monitoring

## Timeline

- **Week 1**: Core service migration
- **Week 2**: Skill system implementation
- **Week 3**: Testing and optimization
- **Week 4**: Full deployment and cleanup

## Dependencies

- Supabase schema updates
- Redis configuration for caching
- Frontend updates for skill display
- API changes for skill endpoints