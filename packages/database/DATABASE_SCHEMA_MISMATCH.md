# Database Schema Mismatch - Discovered 2025-10-09

## Issue Summary

While attempting to fix TypeScript errors in the `@codequal/database` package, we discovered that **the model layer is out of sync with the actual Supabase database schema**.

## Current State

### ✅ Quick Fix Applied (2025-10-09)
- Reverted to **untyped Supabase client** to unblock builds
- Generated types preserved in `database.types.ts` (5,005 lines)
- Database package builds successfully
- Models are functional at runtime (dynamic queries work)
- **No type safety** currently

### ❌ Schema Mismatches Found

#### 1. `repositories` Table

| Model Field       | Actual DB Field    | Issue |
|-------------------|-------------------|-------|
| `provider`        | `platform`        | Field name mismatch |
| `private`         | `is_private`      | Field name mismatch |
| `url` (string)    | `url` (string \| null) | Nullability mismatch |
| `languages` (Record) | `languages` (Json) | Type mismatch |
| ❌ Missing        | `github_id` (number) | **Required field not in model** |

#### 2. `skill_history` Table

| Model Field       | Actual DB Field    | Issue |
|-------------------|-------------------|-------|
| `skill_id`        | `skill_id` (nullable) | Different semantics |
| `level`           | `score_change`, `new_score` | Field structure different |
| `evidence_type`   | ❌ Not in DB       | Field doesn't exist |
| `evidence_id`     | `pr_id`, `pr_metadata` | Different structure |

#### 3. Other Tables
- Similar mismatches likely exist in other tables
- Not fully audited yet

## Files to Fix

### Models to Update
1. `src/models/repository.ts` - Update field names and add `github_id`
2. `src/models/skill.ts` - Restructure to match actual schema
3. `src/models/pr-review.ts` - Verify field names
4. `src/models/calibration.ts` - Verify field names
5. `src/models/repository-analysis.ts` - Verify field names

### Client to Update
1. `src/supabase/client.ts` - Re-enable typed client after models fixed

## How to Fix Properly

### Step 1: Use Generated Types
```typescript
// packages/database/src/supabase/database.types.ts already exists!
// Generated from actual Supabase schema on 2025-10-09
```

### Step 2: Update Models
For each model file:
1. Check `database.types.ts` for actual table structure
2. Update field names to match
3. Add missing fields
4. Update Insert/Update logic
5. Fix TypeScript errors

### Step 3: Re-enable Typed Client
```typescript
// src/supabase/client.ts
import type { Database } from './database.types';

export type TypedSupabaseClient = SupabaseClient<Database>;

export function getSupabase(): TypedSupabaseClient {
  return createClient<Database>(url, key);
}
```

### Step 4: Test Thoroughly
```bash
# Run all tests
npm test

# Check for runtime errors
npm run build
```

## Estimated Effort
- **Time**: 4-6 hours
- **Risk**: Medium (may break existing code)
- **Priority**: High (needed before production)

## Why This Happened

1. **Manual type definitions** in `client.ts` were created without checking actual DB schema
2. **Database evolved** over time without updating models
3. **No type generation** workflow in place until now
4. **Runtime queries** (e.g., `.from('table_name')`) work without types, hiding mismatches

## Prevention

### Future Workflow
1. **Always generate types** from database schema:
   ```bash
   npx supabase gen types typescript --project-id PROJECT_REF > src/supabase/database.types.ts
   ```

2. **Add to CI/CD**: Check if types are up-to-date

3. **Use TypeScript strict mode**: Catch type mismatches early

4. **Document schema changes**: Update models when DB schema changes

## Resources

- Generated types: `packages/database/src/supabase/database.types.ts`
- Supabase CLI docs: https://supabase.com/docs/guides/cli
- Type generation: https://supabase.com/docs/guides/api/generating-types

## Status

- ✅ **Immediate blocker resolved** - Build passes
- ⏳ **Proper fix needed** - Before production release
- 📝 **Documented** - This file
- 🔖 **Tracked** - Added to TODO list (database-schema-alignment)

## Related

- PR: `fix/dependabot-security-alerts-2025-10-09`
- Commit: `9649ce12` - "fix(database): Temporarily use untyped Supabase client"
- Issue discovered during: Dependabot security fix



