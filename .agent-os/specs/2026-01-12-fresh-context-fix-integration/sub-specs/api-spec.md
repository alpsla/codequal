# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2026-01-12-fresh-context-fix-integration/spec.md

## Endpoints

No new endpoints required. Changes are internal to existing endpoint.

### POST /api/v9/analyze

**Existing endpoint - Internal behavior change for PRO tier**

**Request (unchanged):**
```json
{
  "repositoryUrl": "https://github.com/org/repo",
  "prNumber": 123,
  "language": "java",
  "userTier": "pro",
  "options": {
    "generateFixes": true,
    "maxIssuesForFix": 10
  }
}
```

**Response changes for PRO tier:**

```json
{
  "analysisId": "uuid",
  "status": "completed",
  "summary": {
    "totalIssues": 15,
    "fixed": 12,
    "fixStoriesProcessed": 5,
    "fixStoriesFailed": 1,
    "totalFixAttempts": 8
  },
  "fixSession": {
    "storiesCompleted": 4,
    "storiesFailed": 1,
    "learningsAccumulated": 6,
    "repositoryLearningsUsed": true
  }
}
```

## Internal API Changes

### Replace: generateFixesWithHybridAgents()

**Location:** `apps/api/src/routes/v9-analyze.ts` ~line 2031

**Current signature:**
```typescript
async function generateFixesWithHybridAgents(
  issues: any[],
  prInfo: any,
  options?: { maxIssuesForFix?: number }
): Promise<Map<string, FixResult>>
```

**New implementation using FreshContextFixService:**
```typescript
async function generateFixesWithFreshContext(
  issues: any[],
  prInfo: { repository: string; prNumber: number; language: string },
  options?: { maxIssuesForFix?: number; analysisId?: string }
): Promise<{
  fixes: Map<string, FixResult>;
  session: {
    completed: number;
    failed: number;
    totalAttempts: number;
    learningsSaved: number;
  };
}>
```

### Integration Point: ~line 711

**Current code:**
```typescript
if (generateFixes && toolResults.issues.length > 0) {
  const fixResponse = await generateFixesWithHybridAgents(
    toolResults.issues,
    { repository: repositoryUrl, prNumber, language },
    { maxIssuesForFix: options?.maxIssuesForFix }
  );
  // ...
}
```

**New code:**
```typescript
if (generateFixes && toolResults.issues.length > 0) {
  const { fixes, session } = await generateFixesWithFreshContext(
    toolResults.issues,
    { repository: repositoryUrl, prNumber, language },
    { maxIssuesForFix: options?.maxIssuesForFix, analysisId }
  );
  // Include session info in response
  // ...
}
```

## Error Response Changes

### New error codes for fix flow:

| Code | Message | When |
|------|---------|------|
| `FIX_SESSION_PARTIAL` | "Fix session completed with failures" | Some stories failed after max attempts |
| `FIX_SESSION_INTERRUPTED` | "Fix session was interrupted" | Service crashed, state saved |
| `FIX_KB_UNAVAILABLE` | "Knowledge base unavailable" | Supabase down, using fallback |

### Response with partial failure:

```json
{
  "status": "completed",
  "warnings": [
    {
      "code": "FIX_SESSION_PARTIAL",
      "message": "2 of 5 fix stories failed after 3 attempts each",
      "details": {
        "failedStories": [
          { "id": 3, "groupName": "CloseResource in ResourceManager.java", "attempts": 3 },
          { "id": 5, "groupName": "EmptyCatchBlock in ErrorHandler.java", "attempts": 3 }
        ]
      }
    }
  ]
}
```
