# DeepWiki-Reporter Integration & User Performance Tracking Plan

## Current Architecture Analysis

### 1. DeepWiki Data Flow (Current State)
```
DeepWiki Analysis → DeepWikiManager → ResultOrchestrator → Recommendations/Educational
                                                         ↘️ Reporter (MISSING DeepWiki context!)
```

**Issue**: DeepWiki data is used for recommendations but NOT passed to Reporter Agent directly.

### 2. What's Working
- ✅ DeepWiki provides repository-wide analysis
- ✅ DeepWiki summary passed to RecommendationService
- ✅ Educational tools receive DeepWiki context
- ✅ Reports stored in Supabase database
- ✅ SkillService exists for tracking user performance

### 3. What's Missing/Broken
- ❌ DeepWiki summary has empty fields (suggestions, insights, patterns)
- ❌ Reporter doesn't receive repository-wide context
- ❌ Skill tracking not connected to report generation
- ❌ No scoring system in reports

## Implementation Plan

### 1. Fix DeepWiki Summary Extraction
**File**: `/apps/api/src/services/result-orchestrator.ts`

```typescript
private async getDeepWikiSummary(repositoryUrl: string): Promise<DeepWikiSummary> {
  const deepWikiReport = await this.deepWikiManager.waitForAnalysisCompletion(repositoryUrl);
  
  if (!deepWikiReport) {
    return { 
      repositoryHealth: { score: 0, trend: 'unknown' },
      existingIssues: { total: 0, byCategory: {} },
      codebasePatterns: [],
      architectureInsights: []
    };
  }

  // Extract meaningful data from DeepWiki analysis
  return {
    repositoryHealth: {
      score: this.calculateHealthScore(deepWikiReport.analysis),
      trend: 'improving', // Calculate from history
      breakdown: {
        security: this.scoreCategory(deepWikiReport.analysis.security),
        performance: this.scoreCategory(deepWikiReport.analysis.performance),
        codeQuality: this.scoreCategory(deepWikiReport.analysis.codeQuality),
        architecture: this.scoreCategory(deepWikiReport.analysis.architecture)
      }
    },
    existingIssues: {
      total: this.countAllIssues(deepWikiReport.analysis),
      critical: this.countByPriority(deepWikiReport.analysis, 'critical'),
      high: this.countByPriority(deepWikiReport.analysis, 'high'),
      byCategory: {
        security: this.countCategory(deepWikiReport.analysis.security),
        performance: this.countCategory(deepWikiReport.analysis.performance),
        // etc.
      }
    },
    codebasePatterns: this.extractPatterns(deepWikiReport.analysis),
    architectureInsights: deepWikiReport.analysis.architecture?.insights || [],
    lastFullAnalysis: deepWikiReport.metadata.analyzedAt
  };
}
```

### 2. Pass DeepWiki Context to Reporter
**File**: `/apps/api/src/services/result-orchestrator.ts`

```typescript
const standardReport = await this.reporterAgent.generateStandardReport(
  {
    ...processedResults,
    findings: processedResults?.findings || {},
    metrics: this.calculateMetrics(processedResults),
    deepWikiContext: deepWikiSummary // ADD THIS
  },
  compiledEducationalData,
  recommendationModule,
  reportFormat
);
```

### 3. Update Reporter to Include Repository Context
**File**: `/packages/agents/src/multi-agent/reporter-agent.ts`

Add to report generation:
```typescript
// Repository Health Section
report.repositoryHealth = {
  overallScore: deepWikiContext.repositoryHealth.score,
  trend: deepWikiContext.repositoryHealth.trend,
  categoryScores: deepWikiContext.repositoryHealth.breakdown
};

// Existing vs New Issues
report.issueAnalysis = {
  prImpact: {
    newIssues: findings.filter(f => !deepWikiContext.existingIssues.ids.includes(f.id)),
    resolvedIssues: deepWikiContext.existingIssues.resolved || [],
    affectedExisting: findings.filter(f => deepWikiContext.existingIssues.ids.includes(f.id))
  },
  repositoryTotal: deepWikiContext.existingIssues.total
};
```

### 4. Integrate Skill Tracking
**File**: `/apps/api/src/services/result-orchestrator.ts`

After report generation:
```typescript
// Update user skills based on findings
await this.updateUserSkills(
  request.authenticatedUser.id,
  processedResults.findings,
  deepWikiSummary.repositoryHealth
);

private async updateUserSkills(userId: string, findings: any[], repoHealth: any) {
  const skillUpdates = this.calculateSkillImpact(findings);
  
  for (const [category, impact] of Object.entries(skillUpdates)) {
    await this.skillService.updateSkillsForInsights(
      userId,
      [{
        type: 'analysis-result',
        metadata: {
          severity: impact.severity,
          category: category,
          findingCount: impact.count,
          repositoryHealth: repoHealth.score
        }
      }]
    );
  }
  
  // Store skill trend in report metadata
  return await this.skillService.getSkillTrends(userId);
}
```

### 5. Enhanced Report Format
```typescript
interface EnhancedReport {
  // Repository Overview (NEW)
  repositoryHealth: {
    score: number; // 0-10
    trend: 'improving' | 'declining' | 'stable';
    lastFullAnalysis: Date;
    categoryScores: {
      security: number;
      codeQuality: number;
      performance: number;
      architecture: number;
    };
  };
  
  // Issue Context (NEW)
  issueContext: {
    prSpecific: {
      new: number;
      affectsExisting: number;
      resolved: number;
    };
    repositoryWide: {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  
  // Existing sections...
  findings: Finding[];
  recommendations: Recommendation[];
  
  // User Progress (NEW)
  developerProgress: {
    skillImprovements: string[];
    areasNeedingWork: string[];
    learningPathProgress: number; // percentage
  };
}
```

### 6. Database Schema Updates
```sql
-- Add to analysis_reports table
ALTER TABLE analysis_reports ADD COLUMN repository_health_score DECIMAL(3,1);
ALTER TABLE analysis_reports ADD COLUMN existing_issues_count INTEGER;
ALTER TABLE analysis_reports ADD COLUMN new_issues_count INTEGER;
ALTER TABLE analysis_reports ADD COLUMN skill_impact JSONB;

-- New table for tracking repository health over time
CREATE TABLE repository_health_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_url TEXT NOT NULL,
  health_score DECIMAL(3,1) NOT NULL,
  category_scores JSONB NOT NULL,
  total_issues INTEGER NOT NULL,
  analyzed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_repo_health_url_date ON repository_health_history(repository_url, analyzed_at DESC);
```

## Testing Plan

1. **Mock DeepWiki Data**: Create comprehensive mock data that includes:
   - Repository-wide issue counts
   - Historical trends
   - Architecture insights
   - Code patterns

2. **Verify Data Flow**:
   - DeepWiki summary contains all fields
   - Reporter receives and uses DeepWiki context
   - Database stores enhanced report data
   - Skill tracking updates on report generation

3. **UI Validation**:
   - Repository health score displayed
   - Issue context (new vs existing) shown
   - Developer progress tracked

## Sample Output Structure

```json
{
  "repositoryHealth": {
    "score": 7.5,
    "trend": "improving",
    "breakdown": {
      "security": 6.0,
      "codeQuality": 8.0,
      "performance": 7.5,
      "architecture": 8.5
    }
  },
  "issueAnalysis": {
    "thispr": {
      "newIntroduced": 2,
      "existingAffected": 1,
      "resolved": 0
    },
    "repository": {
      "totalOpen": 47,
      "bySeverity": {
        "critical": 3,
        "high": 12,
        "medium": 20,
        "low": 12
      }
    }
  },
  "findings": [...],
  "recommendations": [...],
  "developerMetrics": {
    "skillChanges": {
      "security": -0.2,
      "codeQuality": +0.1
    },
    "learningProgress": "15% complete on Security Best Practices path"
  }
}
```

## Priority Order

1. **HIGH**: Fix DeepWiki summary extraction (empty fields)
2. **HIGH**: Pass DeepWiki context to Reporter
3. **HIGH**: Add scoring system to reports
4. **MEDIUM**: Connect skill tracking to report generation
5. **MEDIUM**: Update database schema
6. **LOW**: Add historical trend analysis