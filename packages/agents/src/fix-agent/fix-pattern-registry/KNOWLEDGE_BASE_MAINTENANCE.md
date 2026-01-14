# Fix Pattern Knowledge Base Maintenance Guide

**Created**: Session 81 (January 9, 2026)
**Last Updated**: Session 81

This guide explains how to maintain and extend the AI fix pattern knowledge base.

---

## Overview

The Knowledge Base (KB) helps the AI fixer avoid common mistakes when generating code fixes. It stores:
- **Anti-patterns**: Code patterns the AI should AVOID
- **Correct patterns**: Code patterns the AI should USE
- **Related rules**: Rules that often conflict when fixing an issue

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Fix Generation                         │
│                                                                   │
│  1. Issue comes in (e.g., CloseResource)                         │
│  2. Lookup KB guidance → formatGuidanceForPrompt()               │
│  3. Add guidance to system prompt                                │
│  4. AI generates fix with knowledge of anti-patterns             │
│  5. Tool re-validates fix                                        │
│  6. If regression detected → trackFixFailure()                   │
│  7. Failures accumulate → flagged for review at 3+ occurrences  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Tables

### 1. `fix_pattern_guidance` - The Knowledge Base

Stores guidance for AI fix generation.

| Column | Type | Description |
|--------|------|-------------|
| `rule_id` | VARCHAR(100) | Rule identifier (e.g., "CloseResource") |
| `language` | VARCHAR(50) | Programming language (e.g., "java") |
| `tool` | VARCHAR(50) | Validator tool (e.g., "pmd", "any") |
| `anti_patterns` | JSONB | Patterns to AVOID |
| `correct_patterns` | JSONB | Patterns to USE |
| `related_rules` | VARCHAR[] | Rules that may conflict |
| `guidance_text` | TEXT | Human-readable explanation |
| `prompt_additions` | TEXT | Text injected into AI prompt |
| `success_rate` | DECIMAL | Success percentage |
| `usage_count` | INTEGER | Times this guidance was used |

### 2. `fix_failure_tracking` - Learning Loop

Tracks fix failures to identify patterns needing guidance.

| Column | Type | Description |
|--------|------|-------------|
| `rule_id` | VARCHAR(100) | Rule that failed |
| `language` | VARCHAR(50) | Language |
| `tool` | VARCHAR(50) | Tool |
| `failure_type` | VARCHAR(50) | 'regression', 'validation_error', 'parse_error' |
| `regression_rules` | VARCHAR[] | Rules triggered by the fix |
| `failure_count` | INTEGER | Number of times this pattern failed |
| `review_status` | VARCHAR(20) | 'pending', 'reviewed', 'guidance_added', 'ignored' |
| `original_code` | TEXT | Code being fixed |
| `attempted_fix` | TEXT | The AI-generated fix that failed |

---

## Maintenance Workflows

### 1. Review Flagged Patterns (Weekly)

Patterns that fail 3+ times are flagged for human review.

```typescript
import { getFailuresNeedingReview, markFailureReviewed } from '@codequal/agents';

// Get patterns needing review
const failures = await getFailuresNeedingReview(20);

for (const failure of failures) {
  console.log(`
    Rule: ${failure.ruleId}
    Language: ${failure.language}
    Failure Count: ${failure.failureCount}
    Priority: ${failure.priority}
    Regression Rules: ${failure.regressionRules.join(', ')}

    Original Code:
    ${failure.originalCode}

    Attempted Fix:
    ${failure.attemptedFix}
  `);
}
```

### 2. Add New Guidance

After reviewing a failure, create guidance to prevent it:

```typescript
import { addFixGuidance, markFailureReviewed } from '@codequal/agents';

// Create guidance
await addFixGuidance({
  ruleId: 'MyRule',
  language: 'java',
  tool: 'pmd',
  antiPatterns: [
    { pattern: 'bad pattern', why: 'explanation' }
  ],
  correctPatterns: [
    { pattern: 'good pattern', example: 'code example' }
  ],
  relatedRules: ['RelatedRule1', 'RelatedRule2'],
  guidanceText: 'When fixing MyRule, always...',
  promptAdditions: 'CRITICAL for MyRule:\n- DO this\n- NEVER do that',
  successRate: 0,
  usageCount: 0
});

// Mark the failure as addressed
await markFailureReviewed(
  failure.id,
  'guidance_added',
  'your-name',
  'Added guidance to prevent empty catch blocks'
);
```

### 3. Generate Draft Guidance

The system can generate draft guidance from a failure:

```typescript
import { fixPatternGuidance } from '@codequal/agents';

const failure = failures[0];
const draft = fixPatternGuidance.generateGuidanceFromFailure(failure);

console.log('Draft guidance:', draft);
// Edit the draft, then:
await addFixGuidance({
  ...draft,
  // Fill in correct_patterns manually
  correctPatterns: [
    { pattern: 'proper handling', example: 'actual code' }
  ]
} as FixGuidance);
```

### 4. Ignore Known Issues

For patterns that can't be fixed or are false positives:

```typescript
await markFailureReviewed(
  failure.id,
  'ignored',
  'your-name',
  'False positive - this pattern is intentional'
);
```

---

## SQL Maintenance Commands

### View Patterns Needing Review

```sql
SELECT * FROM fix_failures_needing_review;
```

### View All Guidance Entries

```sql
SELECT
  rule_id,
  language,
  tool,
  success_rate,
  usage_count,
  jsonb_array_length(anti_patterns) as anti_pattern_count,
  jsonb_array_length(correct_patterns) as correct_pattern_count
FROM fix_pattern_guidance
ORDER BY usage_count DESC;
```

### Add Guidance via SQL

```sql
INSERT INTO fix_pattern_guidance (
  rule_id, language, tool,
  anti_patterns, correct_patterns, related_rules,
  guidance_text, prompt_additions
) VALUES (
  'NewRule', 'java', 'any',
  '[{"pattern": "bad", "why": "because"}]'::jsonb,
  '[{"pattern": "good", "example": "code"}]'::jsonb,
  ARRAY['RelatedRule'],
  'Explanation text',
  'CRITICAL: Instructions for AI'
) ON CONFLICT (rule_id, language, tool) DO UPDATE SET
  anti_patterns = EXCLUDED.anti_patterns,
  correct_patterns = EXCLUDED.correct_patterns,
  updated_at = NOW();
```

### Mark Failures as Reviewed

```sql
UPDATE fix_failure_tracking
SET
  review_status = 'reviewed',
  reviewed_by = 'your-name',
  reviewed_at = NOW(),
  review_notes = 'Your notes here'
WHERE id = 'failure-uuid';
```

### View Success Rates

```sql
SELECT
  rule_id,
  language,
  success_rate,
  usage_count,
  ROUND(success_rate * usage_count / 100) as successful_fixes
FROM fix_pattern_guidance
WHERE usage_count > 0
ORDER BY success_rate ASC;
```

---

## Best Practices

### 1. Writing Anti-Patterns

Be specific about what to avoid:

```json
{
  "pattern": "empty catch block",
  "why": "Swallows exceptions silently, making debugging impossible"
}
```

NOT:
```json
{
  "pattern": "bad code",
  "why": "it's wrong"
}
```

### 2. Writing Correct Patterns

Include working code examples:

```json
{
  "pattern": "log and rethrow",
  "example": "catch(IOException e) { log.error(\"Failed\", e); throw new RuntimeException(e); }"
}
```

### 3. Prompt Additions

Format for maximum AI clarity:

```
CRITICAL for CloseResource:
- MUST use try-with-resources: try (var x = new Resource()) { }
- NEVER generate empty catch blocks
- NEVER catch Throwable - catch specific exceptions

CORRECT EXAMPLE:
try (var stream = new FileInputStream(file)) {
    // use stream
} catch (IOException e) {
    log.error("Failed to read file", e);
    throw new RuntimeException(e);
}
```

### 4. Related Rules

List rules that commonly conflict:
- For `CloseResource` → `EmptyCatchBlock`, `AvoidCatchingThrowable`
- For `EmptyCatchBlock` → `CloseResource`, `AvoidCatchingGenericException`

This helps the AI avoid fixing one issue while creating another.

---

## Monitoring

### Key Metrics to Track

1. **Failure rate by rule**: Which rules fail most often?
2. **Success rate after guidance**: Did adding guidance help?
3. **Review queue size**: How many patterns need review?

### Sample Monitoring Query

```sql
-- Rules with worst success rates (needing guidance improvement)
SELECT
  rule_id,
  language,
  success_rate,
  usage_count,
  (SELECT COUNT(*) FROM fix_failure_tracking f
   WHERE f.rule_id = g.rule_id
   AND f.language = g.language
   AND f.review_status = 'pending') as pending_failures
FROM fix_pattern_guidance g
WHERE usage_count >= 5
ORDER BY success_rate ASC
LIMIT 10;
```

---

## Troubleshooting

### Guidance Not Being Used

1. Check rule_id matches exactly (case-sensitive)
2. Check language matches (lowercase: "java" not "Java")
3. Check Supabase connection is working
4. Look for logs: `[FixGuidance] Found knowledge base guidance for X`

### Failures Not Being Tracked

1. Check Supabase connection
2. Check `fix_failure_tracking` table exists
3. Look for logs: `[AI-Fixer] Failed to track failure:`

### Low Success Rate

1. Review the anti-patterns - are they specific enough?
2. Add more correct patterns with examples
3. Check if related_rules is complete
4. Review actual failure cases for patterns

---

## File Locations

- **Service**: `packages/agents/src/fix-agent/fix-pattern-registry/fix-pattern-guidance.ts`
- **Types**: `packages/agents/src/fix-agent/fix-pattern-registry/fix-pattern-guidance.ts`
- **Exports**: `packages/agents/src/fix-agent/fix-pattern-registry/index.ts`
- **Migrations**: `database/migrations/20260109_fix_pattern_guidance.sql`
- **Seed data**: `database/migrations/20260109_seed_fix_pattern_guidance.sql`
- **Failure tracking**: `database/migrations/20260109_fix_failure_tracking.sql`

---

## Quick Reference

```typescript
// Import
import {
  getFixGuidance,
  addFixGuidance,
  formatGuidanceForPrompt,
  trackFixFailure,
  getFailuresNeedingReview,
  markFailureReviewed,
} from '@codequal/agents';

// Get guidance
const guidance = await getFixGuidance('CloseResource', 'java');

// Format for AI prompt
const promptText = await formatGuidanceForPrompt('CloseResource', 'java', 'pmd');

// Add new guidance
await addFixGuidance({ ... });

// Track a failure (called automatically by AI fixer)
await trackFixFailure({ ruleId: '...', language: '...', ... });

// Review failures
const failures = await getFailuresNeedingReview();

// Mark as reviewed
await markFailureReviewed(id, 'guidance_added', 'reviewer', 'notes');
```
