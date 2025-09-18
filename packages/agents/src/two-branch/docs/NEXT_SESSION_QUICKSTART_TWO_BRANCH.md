# Next Session Quick Start - Two Branch V9 Framework

## 🚀 Quick Environment Check

```bash
# 1. Navigate to project
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# 2. Check Redis is running
redis-cli ping
# If not running: redis-server

# 3. Verify environment variables
cat .env | grep -E "SUPABASE_URL|OPENROUTER_API_KEY" | head -2
```

## ✅ Current Working State (Sep 15, 2025)

### V9 Framework Status
- **Core System**: ✅ Operational
- **Model Resolution**: ✅ Fixed (code-quality vs code_quality issue resolved)  
- **Weight Configurations**: ✅ Updated (303 configs with role-specific weights)
- **Self-Healing**: ✅ Working (auto-research for missing configs)
- **Database**: ✅ Normalized (no duplicates)

### Recent Fixes Applied
1. Role name normalization (hyphen to underscore)
2. Role-specific weight configurations
3. Storage mapping for research results
4. TypeScript type safety in weight calculations

## 🧪 Test Commands & Language Testing Strategy

### 1. Primary Java Test (RECOMMENDED)
```bash
# Main test file for Java PRs - Most mature and tested
npx ts-node src/two-branch/tests/run-real-v9-java-analysis.ts

# Test PRs:
# - Apache Kafka: https://github.com/apache/kafka/pull/17620
# - Spring Boot: https://github.com/spring-projects/spring-boot/pull/[NUMBER]
# - Elasticsearch: https://github.com/elastic/elasticsearch/pull/[NUMBER]
```

### 2. Universal PR Test (Multi-Language)
```bash
# Can handle any language - auto-detects from repository
npx ts-node src/two-branch/tests/test-v9-universal-real-pr.ts

# Supports: JavaScript, TypeScript, Python, Java, Go, Ruby, Rust, PHP, C++
```

### 3. Language-Specific Test Plan

#### JavaScript/TypeScript (Well Tested)
```bash
# Test with popular JS/TS projects
# React: https://github.com/facebook/react/pull/28000
# Next.js: https://github.com/vercel/next.js/pull/82359
# Vue: https://github.com/vuejs/core/pull/[NUMBER]

npx ts-node src/two-branch/tests/test-v9-universal-real-pr.ts
```

#### Python (Needs Validation)
```bash
# Test with Python projects
# Django: https://github.com/django/django/pull/[NUMBER]
# FastAPI: https://github.com/tiangolo/fastapi/pull/[NUMBER]
# Pandas: https://github.com/pandas-dev/pandas/pull/[NUMBER]

# Use universal test with Python repo URL
```

#### Go (Limited Testing)
```bash
# Test with Go projects
# Kubernetes: https://github.com/kubernetes/kubernetes/pull/[NUMBER]
# Docker: https://github.com/moby/moby/pull/[NUMBER]
# Gin: https://github.com/gin-gonic/gin/pull/[NUMBER]
```

#### Ruby (Minimal Testing)
```bash
# Test with Ruby projects
# Rails: https://github.com/rails/rails/pull/[NUMBER]
# Sidekiq: https://github.com/sidekiq/sidekiq/pull/[NUMBER]
```

### 4. Verify Language Configurations
```bash
# Check which languages have configurations
npx ts-node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('model_configs')
  .select('language')
  .not('language', 'is', null)
  .then(({data}) => {
    const langs = [...new Set(data.map(d => d.language))];
    console.log('Configured languages:', langs);
  });
"
```

## 📊 Model Configuration Summary

### Current Model Assignments
| Role | Primary Model | Optimization |
|------|--------------|--------------|
| security | anthropic/claude-opus-4.1 | Quality (50%) |
| architecture | anthropic/claude-sonnet-4 | Quality (40%) |
| code_quality | google/gemini-2.5-flash | Cost (35%) |
| performance | deepseek/deepseek-chat-v3.1 | Balanced |
| location_finder | google/gemini-2.5-flash-lite | Speed (49%) |

### Weight Distribution Philosophy
- **Critical Analysis** (security, architecture): Quality > 40%
- **Routine Tasks** (code_quality, testing): Cost > 30%
- **Fast Operations** (location_finder, orchestrator): Speed > 40%

## 🔧 Common Issues & Solutions

### Issue 1: Model Not Found
```bash
# Error: No configuration found for role/language/size
# Solution: Check if role uses underscore vs hyphen
# The system now auto-normalizes, but check database

# Query Supabase directly
psql $DATABASE_URL -c "SELECT DISTINCT role FROM model_configurations ORDER BY role;"
```

### Issue 2: Self-Healing Fails
```bash
# Error: Error storing specific research
# Solution: Ensure model_research_tasks table exists

# Run migration if needed
psql $DATABASE_URL < database/migrations/create_model_research_tasks.sql
```

### Issue 3: Build/Lint Errors
```bash
# Fix all lint issues
npm run lint:fix

# Build the project
npm run build

# Clean and rebuild if needed
npm run clean && npm run build
```

## 🗂️ Project Structure

```
packages/agents/
├── src/
│   ├── standard/
│   │   └── orchestrator/
│   │       └── model-config-resolver.ts  # ✅ Fixed role normalization
│   └── two-branch/
│       ├── analyzers/
│       │   └── v9-*                      # V9 Framework (CURRENT)
│       ├── research-services/
│       │   └── model-researcher-service.ts # ✅ Fixed storage mapping
│       └── tests/
│           └── test-v9-universal-real-pr.ts # Main test file
├── database/
│   └── migrations/
│       └── create_model_research_tasks.sql # New table for urgent research
└── docs/
    └── SESSION_SUMMARY_2025_09_15.md     # Today's work summary
```

## 📝 Files to Archive/Clean

### Can Be Archived
```bash
# Old test reports (keep latest only)
src/two-branch/tests/reports/2025-09-*/

# Duplicate test files
test-*.ts  # Keep only essential ones

# Old session summaries
docs/SESSION_SUMMARY_2025_08_*.md
```

### Keep Active
```bash
# Core V9 Framework
src/two-branch/analyzers/v9-*
src/two-branch/tests/test-v9-universal-real-pr.ts

# Configuration management  
src/standard/orchestrator/model-config-resolver.ts
src/two-branch/scripts/clean-and-regenerate-models.ts

# Research services
src/two-branch/research-services/
```

## 🎯 Next Priorities

1. **Monitor Self-Healing**: Watch for missing configurations that trigger research
2. **Test Other Languages**: Verify Python, Go, Ruby configs work as well as Java
3. **Performance Metrics**: Track actual costs and response times with new models
4. **Clean Archive**: Move old tests/docs to _ARCHIVED_DO_NOT_USE

## 🚨 DO NOT MODIFY

These files are working correctly - do not change without careful review:
- `model-config-resolver.ts` - Core resolution logic
- `clean-and-regenerate-models.ts` - Has correct weight definitions
- Database schema - Unique constraints prevent duplicates

## 💡 Quick Wins for Next Session

1. Run full test suite with new weights
2. Compare cost/performance before and after weight updates
3. Document any missing language/role combinations
4. Set up automated monitoring for self-healing triggers

---

**Last Updated**: September 15, 2025
**Session Lead**: Model Configuration & Weight Optimization
**Status**: ✅ All Systems Operational