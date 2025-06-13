# Tool Review Configuration Examples

## Overview
Different configurations for tool review based on your needs.

## Configuration Options

### 1. No Review (Default - Fast Feedback)
```typescript
const reviewConfig: ToolReviewConfiguration = {
  requireReview: false
};
```
**Use Case**: Development environments, trusted repositories, fast CI/CD

### 2. Auto-Approval with Thresholds
```typescript
const reviewConfig: ToolReviewConfiguration = {
  requireReview: true,
  autoApproveThresholds: {
    npmAudit: {
      maxCritical: 0,  // No critical vulnerabilities allowed
      maxHigh: 2       // Up to 2 high vulnerabilities auto-approved
    },
    licenseChecker: {
      maxRiskyLicenses: 0  // No GPL/AGPL licenses auto-approved
    },
    madge: {
      maxCircularDependencies: 5  // Up to 5 circular deps auto-approved
    },
    dependencyCruiser: {
      maxViolations: 10  // Up to 10 dependency violations auto-approved
    },
    npmOutdated: {
      maxMajorUpdates: 10  // Up to 10 major updates auto-approved
    }
  },
  reviewTimeoutHours: 24  // Auto-approve after 24 hours
};
```
**Use Case**: Production environments with safety thresholds

### 3. Strict Review (Everything Requires Approval)
```typescript
const reviewConfig: ToolReviewConfiguration = {
  requireReview: true,
  autoApproveThresholds: {
    npmAudit: { maxCritical: 0, maxHigh: 0 },
    licenseChecker: { maxRiskyLicenses: 0 },
    madge: { maxCircularDependencies: 0 },
    dependencyCruiser: { maxViolations: 0 },
    npmOutdated: { maxMajorUpdates: 0 }
  },
  reviewTimeoutHours: 48  // Longer timeout for manual review
};
```
**Use Case**: High-security environments, compliance requirements

### 4. Security-Focused Review
```typescript
const reviewConfig: ToolReviewConfiguration = {
  requireReview: true,
  autoApproveThresholds: {
    npmAudit: { maxCritical: 0, maxHigh: 0 },  // Strict security
    licenseChecker: { maxRiskyLicenses: 0 },   // Strict licensing
    madge: { maxCircularDependencies: 10 },    // Lenient architecture
    dependencyCruiser: { maxViolations: 20 },  // Lenient dependencies
    npmOutdated: { maxMajorUpdates: 50 }       // Lenient updates
  }
};
```
**Use Case**: Security-critical applications

### 5. Per-Repository Configuration
```typescript
function getReviewConfig(repositoryUrl: string): ToolReviewConfiguration {
  // Production repositories
  if (repositoryUrl.includes('production')) {
    return {
      requireReview: true,
      autoApproveThresholds: {
        npmAudit: { maxCritical: 0, maxHigh: 0 },
        licenseChecker: { maxRiskyLicenses: 0 },
        madge: { maxCircularDependencies: 3 },
        dependencyCruiser: { maxViolations: 5 },
        npmOutdated: { maxMajorUpdates: 5 }
      }
    };
  }
  
  // Development repositories
  if (repositoryUrl.includes('dev') || repositoryUrl.includes('test')) {
    return {
      requireReview: false  // No review for dev/test
    };
  }
  
  // Default: moderate review
  return {
    requireReview: true,
    autoApproveThresholds: {
      npmAudit: { maxCritical: 0, maxHigh: 2 },
      licenseChecker: { maxRiskyLicenses: 1 },
      madge: { maxCircularDependencies: 5 },
      dependencyCruiser: { maxViolations: 10 },
      npmOutdated: { maxMajorUpdates: 15 }
    }
  };
}
```

## Usage Examples

### 1. Initialize with Review Configuration
```typescript
const deepWikiManager = new EnhancedDeepWikiManager(
  authenticatedUser,
  vectorStorage,
  embeddingService,
  logger,
  reviewConfig  // Your chosen configuration
);
```

### 2. Trigger Analysis with Review
```typescript
// Scheduled analysis - might require review
const jobId = await deepWikiManager.triggerRepositoryAnalysisWithTools(
  'https://github.com/company/production-app',
  {
    runTools: true,
    scheduledRun: true,
    requireReview: true  // Override config for this run
  }
);

// PR analysis - skip review for faster feedback
const prJobId = await deepWikiManager.triggerRepositoryAnalysisWithTools(
  'https://github.com/company/feature-branch',
  {
    runTools: true,
    enabledTools: ['npm-audit'],  // Quick security check
    prNumber: 123,
    skipReview: true  // Override - no review for PRs
  }
);
```

### 3. Handle Review Required Response
```typescript
try {
  const results = await deepWikiManager.waitForAnalysisCompletion(repositoryUrl);
  console.log('Analysis completed:', results);
} catch (error) {
  if (error.message.includes('requires manual review')) {
    // Extract review URL
    const reviewUrl = error.message.match(/https:\/\/[^\s]+/)?.[0];
    console.log(`⚠️  Manual review required: ${reviewUrl}`);
    
    // Notify reviewers
    await notifyReviewers(reviewUrl);
  }
}
```

### 4. Complete Analysis After Review
```typescript
// Reviewer approves tools
await deepWikiManager.completeAnalysisAfterReview(
  jobId,
  ['npm-audit', 'license-checker'],  // Approved tools
  'reviewer@company.com'
);
```

### 5. Get Review Summary
```typescript
const summary = await deepWikiManager.getReviewSummary(jobId);

console.log(`Tools pending review: ${summary.pendingReview}`);
console.log(`Auto-approved tools: ${summary.autoApproved}`);

summary.details.forEach(tool => {
  if (tool.requiresAttention) {
    console.log(`⚠️  ${tool.toolId}: Requires attention`);
  }
});
```

## Review UI Integration

### Review Dashboard Components
```typescript
interface ReviewDashboard {
  // Pending reviews
  pendingReviews: {
    jobId: string;
    repository: string;
    submittedAt: Date;
    toolsRequiringReview: string[];
    criticalFindings: number;
  }[];
  
  // Review history
  reviewHistory: {
    jobId: string;
    reviewer: string;
    decision: 'approved' | 'rejected';
    timestamp: Date;
  }[];
  
  // Tool-specific views
  toolDetails: {
    [toolId: string]: {
      findings: any[];
      metrics: any;
      recommendation: 'approve' | 'reject' | 'review';
    };
  };
}
```

### Review API Endpoints
```typescript
// Get pending reviews
GET /api/reviews/pending

// Get review details
GET /api/reviews/:jobId

// Approve tools
POST /api/reviews/:jobId/approve
{
  "toolIds": ["npm-audit", "license-checker"],
  "comments": "Vulnerabilities are in dev dependencies only"
}

// Reject tools
POST /api/reviews/:jobId/reject
{
  "toolIds": ["madge"],
  "reason": "Too many circular dependencies, needs refactoring"
}
```

## Best Practices

1. **Start Permissive**: Begin with lenient thresholds and tighten based on experience
2. **Different Environments**: Use different configs for dev/staging/production
3. **Team Agreement**: Ensure team agrees on thresholds before enabling
4. **Monitor Patterns**: Track what gets auto-approved vs manual review
5. **Adjust Regularly**: Update thresholds based on false positives/negatives

## Metrics to Track

- **Auto-approval rate**: What percentage of analyses are auto-approved?
- **Review turnaround time**: How long do reviews take?
- **False positive rate**: How often do reviewers approve despite threshold breach?
- **Tool-specific patterns**: Which tools most often require review?
