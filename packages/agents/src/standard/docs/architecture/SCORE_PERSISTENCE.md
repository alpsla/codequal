# Score Persistence System

## Overview

The CodeQual Score Persistence System tracks developer skills and team performance over time. It provides:

- **Individual developer scores** that evolve based on PR analysis
- **Category-specific scores** (security, performance, code quality, architecture, dependencies)
- **Team aggregation** for organizational insights
- **Historical tracking** for trend analysis
- **Automatic score calculations** based on issues fixed/introduced

## Architecture

### Database Schema

The system uses three main tables in Supabase:

1. **developer_skills** - Current skill scores for each developer
2. **skill_history** - Historical record of all score changes
3. **teams** - Team information
4. **team_score_snapshots** - Daily team performance snapshots

### Key Components

```
┌─────────────────────┐
│  Orchestrator       │
│  (Triggers Updates) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ SupabaseSkillProvider│────▶│     Supabase DB     │
│  (Manages Scores)   │     │  (Stores Scores)    │
└─────────────────────┘     └─────────────────────┘
           │
           ▼
┌─────────────────────┐
│  Comparison Agent   │
│ (Calculates Changes)│
└─────────────────────┘
```

## How It Works

### 1. Initial Developer Setup

When a developer submits their first PR:
- System creates a new record with base score of 50
- All category scores start at 50
- Developer level starts at "D" (Beginner)

### 2. Score Calculation

For each PR analysis:

```typescript
// Starting from current score (not hardcoded 50)
const currentScore = await skillProvider.getUserSkills(userId);

// Apply adjustments based on PR quality
const adjustments = [
  { reason: 'Fixed 2 critical issues', value: +10 },
  { reason: 'Introduced 1 high issue', value: -5 },
  { reason: 'Good code quality', value: +5 }
];

// Update category scores
const categoryChanges = {
  security: 75,    // Updated based on security issues
  performance: 70, // Updated based on performance issues
  codeQuality: 72, // Updated based on code quality
  architecture: 70,
  dependencies: 68
};
```

### 3. Score Persistence

The system automatically:
- Retrieves current scores before each analysis
- Applies adjustments based on PR quality
- Stores updated scores in Supabase
- Records history for trend tracking

## Implementation Details

### SupabaseSkillProvider

Key methods:

```typescript
// Get current developer skills
async getUserSkills(userId: string): Promise<DeveloperSkills>

// Update skills after PR analysis
async updateSkills(updates: SkillUpdate[]): Promise<void>

// Get team aggregated skills
async getTeamSkills(teamId: string): Promise<TeamSkills>

// Get historical data for trends
async getHistoricalData(params: HistoryParams): Promise<SkillHistory>
```

### Score Update Flow

1. **Orchestrator** calls `getSkillData()` to retrieve current scores
2. **Comparison Agent** analyzes PR and calculates adjustments
3. **Orchestrator** calls `updateSkills()` with new scores
4. **SupabaseSkillProvider** performs upsert operation
5. **History** is automatically recorded

### Database Column Mapping

The system uses snake_case in the database:

| TypeScript Property | Database Column |
|-------------------|-----------------|
| userId | user_id |
| overallScore | overall_score |
| categoryScores | category_scores |
| totalPRs | total_prs |
| issuesFixed | issues_fixed |
| issuesIntroduced | issues_introduced |
| lastUpdated | last_updated |

## Configuration

### Environment Variables

```bash
# Required for score persistence
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
CACHE_ENABLED=true
CACHE_TTL=1800
```

### Supabase Setup

1. Run the schema SQL file to create tables
2. Enable Row Level Security (RLS)
3. Configure service role access

## Usage Examples

### 1. Retrieve Developer Skills

```typescript
const skillProvider = new SupabaseSkillProvider(supabaseUrl, supabaseKey);
const skills = await skillProvider.getUserSkills('john-doe');

console.log({
  score: skills.overallScore,        // e.g., 72
  level: skills.level.current,       // e.g., "B-"
  title: skills.level.title,         // e.g., "Experienced"
  totalPRs: skills.totalPRs,         // e.g., 15
  trend: skills.trend.direction      // e.g., "up"
});
```

### 2. Update Skills After PR

```typescript
const update: SkillUpdate = {
  userId: 'john-doe',
  prId: 'pr-123',
  timestamp: new Date(),
  previousScore: 72,  // Retrieved from DB
  newScore: 78,       // Calculated by analysis
  adjustments: [
    { reason: 'Fixed critical security issue', value: +5 },
    { reason: 'Excellent test coverage', value: +1 }
  ],
  categoryChanges: {
    security: 85,
    performance: 75,
    codeQuality: 80,
    architecture: 78,
    dependencies: 72
  }
};

await skillProvider.updateSkills([update]);
```

### 3. Get Team Performance

```typescript
const teamSkills = await skillProvider.getTeamSkills('engineering-team');

console.log({
  averageScore: teamSkills.averageScore,
  topPerformers: teamSkills.topPerformers.length,
  needsImprovement: teamSkills.needsImprovement.length
});
```

## Score Calculation Rules

### Positive Adjustments
- Fixing critical issues: +5 points each
- Fixing high issues: +3 points each
- Fixing medium issues: +1 point each
- Good code quality: +1 to +5 points
- First PR bonus: +5 to +10 points

### Negative Adjustments
- Introducing critical issues: -5 points each
- Introducing high issues: -3 points each
- Introducing medium issues: -1 point each
- Poor test coverage: -1 to -3 points
- Breaking changes without notice: -5 points

### Grade Mapping

| Score Range | Grade | Title |
|------------|-------|-------|
| 95-100 | A+ | Expert |
| 90-94 | A | Expert |
| 85-89 | A- | Expert |
| 80-84 | B+ | Senior |
| 75-79 | B | Senior |
| 70-74 | B- | Experienced |
| 65-69 | C+ | Experienced |
| 60-64 | C | Competent |
| 50-59 | D | Junior |
| 0-49 | F | Beginner |

## Testing

Run the score persistence test:

```bash
npm test src/standard/tests/integration/deepwiki/test-score-persistence.ts
```

This verifies:
- New developer initialization
- Score updates and persistence
- History tracking
- Team aggregation
- Proper use of current scores (not hardcoded values)

## Troubleshooting

### Common Issues

1. **"column does not exist" errors**
   - Ensure database uses snake_case columns
   - Check column mapping in SupabaseSkillProvider

2. **UUID type errors**
   - user_id should be TEXT, not UUID
   - Only skill_history.id uses UUID

3. **Score not updating**
   - Verify updateSkills is called with proper data
   - Check Supabase connection and permissions
   - Ensure RLS policies allow service role access

## Future Enhancements

1. **Skill Decay** - Gradually decrease scores for inactive developers
2. **Skill Badges** - Award achievements for milestones
3. **Peer Comparison** - Compare against team/org averages
4. **Skill Recommendations** - Suggest areas for improvement
5. **API Endpoints** - Expose skill data via REST API