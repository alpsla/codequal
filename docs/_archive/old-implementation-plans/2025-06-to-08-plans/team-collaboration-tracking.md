# Team Collaboration Tracking Implementation Plan

## Overview
To support team subscriptions and collaborative scoring, we need to collect and analyze PR review data.

## 1. GitHub API Integration Extensions

### Required API Endpoints
```javascript
// In PRContextService, add these calls:

// Get PR reviews
GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews

// Get review comments
GET /repos/{owner}/{repo}/pulls/{pull_number}/comments

// Get requested reviewers
GET /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers

// Get review requests
GET /repos/{owner}/{repo}/pulls/{pull_number}/review_requests
```

## 2. Database Schema Additions

### New Tables Needed

```sql
-- PR Review Metadata
CREATE TABLE pr_review_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_review_id UUID REFERENCES pr_reviews(id),
  reviewer_github_id TEXT NOT NULL,
  reviewer_username TEXT NOT NULL,
  review_state TEXT CHECK (review_state IN ('APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED')),
  submitted_at TIMESTAMPTZ,
  review_duration_minutes INTEGER, -- Time from PR opened to review submitted
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review Comments Analysis
CREATE TABLE review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_review_id UUID REFERENCES pr_reviews(id),
  reviewer_id TEXT NOT NULL,
  comment_type TEXT CHECK (comment_type IN ('BUG_FOUND', 'IMPROVEMENT', 'QUESTION', 'KNOWLEDGE_SHARE', 'SECURITY_ISSUE')),
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  line_number INTEGER,
  file_path TEXT,
  comment_body TEXT,
  was_addressed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Collaboration Metrics
CREATE TABLE team_collaboration_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  week_start DATE NOT NULL,
  prs_authored INTEGER DEFAULT 0,
  prs_reviewed INTEGER DEFAULT 0,
  bugs_caught INTEGER DEFAULT 0,
  improvements_suggested INTEGER DEFAULT 0,
  avg_review_time_hours DECIMAL(5,2),
  collaboration_score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id, week_start)
);
```

## 3. Service Implementation

### PRReviewDataCollector Service
```typescript
export class PRReviewDataCollector {
  async collectReviewData(prUrl: string) {
    // 1. Fetch PR reviews from GitHub
    const reviews = await this.githubApi.getPRReviews(prUrl);
    
    // 2. Fetch review comments
    const comments = await this.githubApi.getPRComments(prUrl);
    
    // 3. Analyze comment types using AI
    const analyzedComments = await this.analyzeComments(comments);
    
    // 4. Calculate review metrics
    const metrics = this.calculateReviewMetrics(reviews, analyzedComments);
    
    // 5. Store in database
    await this.storeReviewData(metrics);
    
    return metrics;
  }
  
  private async analyzeComments(comments: GitHubComment[]) {
    // Use AI to categorize comments
    return this.aiService.categorizeReviewComments(comments);
  }
}
```

### Team Scoring Service
```typescript
export class TeamScoringService {
  calculateReviewerPoints(reviewData: ReviewData): number {
    let points = 0;
    
    // Points for catching issues
    points += reviewData.bugsCaught * 2.0;
    points += reviewData.securityIssuesCaught * 3.0;
    points += reviewData.improvementsSuggested * 0.5;
    
    // Speed bonus
    if (reviewData.reviewTimeHours < 2) points += 0.5;
    else if (reviewData.reviewTimeHours < 4) points += 0.3;
    
    // Collaboration bonus
    points += reviewData.knowledgeShared * 0.3;
    
    return points;
  }
}
```

## 4. API Response Updates

### Enhanced PR Analysis Response
```json
{
  "analysis": { /* existing */ },
  "teamMetrics": {
    "reviewers": [
      {
        "username": "john_doe",
        "role": "REVIEWER",
        "contributions": {
          "issuesCaught": 3,
          "improvements": 5,
          "reviewTime": "1.5 hours",
          "pointsEarned": 4.5
        }
      }
    ],
    "collaborationScore": 85,
    "teamEfficiency": "HIGH"
  }
}
```

## 5. Implementation Timeline

### Phase 1: Data Collection (Week 1-2)
- Extend GitHub API integration
- Create database schema
- Build review data collector

### Phase 2: Analysis (Week 3-4)
- Implement comment categorization
- Build team metrics calculator
- Create scoring algorithms

### Phase 3: Integration (Week 5-6)
- Update API responses
- Add team dashboard endpoints
- Create team leaderboards

## 6. Privacy Considerations

- Store only necessary reviewer data
- Allow users to opt-out of team tracking
- Anonymize data for team-wide metrics
- Comply with GDPR for EU users

## 7. Monitoring & Analytics

Track:
- Review participation rates
- Average review times
- Team collaboration patterns
- Point distribution fairness