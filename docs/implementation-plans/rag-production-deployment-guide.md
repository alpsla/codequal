# RAG Production Deployment Guide
**Priority: CRITICAL | Status: 95% → 100%**

## 🎯 **Deployment Overview**

The RAG framework is 95% complete with all code, tests, and schema ready. This guide covers the final 5% - production deployment and configuration.

## 📋 **Pre-Deployment Checklist**

### **✅ Already Complete:**
- [x] RAG database schema (`20250530_rag_schema_integration.sql`)
- [x] RAG services implementation (Query Analyzer, Selective RAG Service, etc.)
- [x] 37 RAG tests passing
- [x] Educational content seeding
- [x] Vector search functions

### **🔄 Needs Deployment:**
- [ ] Deploy schema to production Supabase
- [ ] Configure production environment variables
- [ ] Run end-to-end integration tests
- [ ] Verify embedding generation works
- [ ] Test authenticated RAG search

---

## 🚀 **Step 1: Environment Configuration**

### **Required Environment Variables:**

Create a `.env` file in the project root with:

```bash
# === CORE SERVICES ===
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PUBLIC_SUPABASE_ANON_KEY=eyJ...

# === AI PROVIDER APIs ===
OPENAI_API_KEY=sk-...           # For embeddings and ChatGPT
ANTHROPIC_API_KEY=sk-ant-...    # For Claude
DEEPSEEK_API_KEY=sk-...         # For DeepSeek
GEMINI_API_KEY=AI...            # For Gemini

# === PRODUCTION SETTINGS ===
NODE_ENV=production
LOG_LEVEL=info
COST_TRACKING_ENABLED=true

# === OPTIONAL: REPOSITORY ACCESS ===
GITHUB_TOKEN=ghp_...            # For private repos
GITLAB_TOKEN=glpat-...          # For GitLab repos
```

### **Supabase Project Setup:**

1. **Create Production Supabase Project** (if not exists)
2. **Enable Required Extensions:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE EXTENSION IF NOT EXISTS uuid-ossp;
   ```
3. **Configure Database Settings:**
   - Enable Row Level Security
   - Set up authentication policies
   - Configure vector index settings

---

## 🚀 **Step 2: Deploy RAG Schema**

### **Option A: Using Migration Script (Recommended)**

```bash
# 1. Ensure environment is configured
source .env

# 2. Run migration script
npm run migrate-database

# 3. Verify deployment
npm run test -- --testPathPattern="rag"
```

### **Option B: Manual SQL Deployment**

```bash
# 1. Connect to Supabase SQL Editor
# 2. Execute the migration file:
cat packages/database/migrations/20250530_rag_schema_integration.sql

# 3. Run in Supabase SQL Editor or psql:
psql "postgresql://postgres:password@db.project.supabase.co:5432/postgres" \
  -f packages/database/migrations/20250530_rag_schema_integration.sql
```

---

## 🚀 **Step 3: Verify RAG Deployment**

### **Database Verification:**

```sql
-- 1. Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'rag_%';

-- Expected results:
-- rag_educational_content
-- rag_query_patterns

-- 2. Verify views exist  
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE 'rag_%';

-- Expected results:
-- rag_document_embeddings
-- rag_repositories

-- 3. Verify functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'rag_%';

-- Expected results:
-- rag_search_documents
-- rag_search_educational_content
-- rag_cleanup_expired_embeddings
-- rag_maintain_vector_limits

-- 4. Verify educational content seeded
SELECT title, content_type, programming_language 
FROM rag_educational_content 
LIMIT 5;

-- Should show 3 seeded entries
```

### **Application Verification:**

```bash
# 1. Run RAG-specific tests
npm run test -- --testPathPattern="rag"

# 2. Run integration tests
npm run test -- --testPathPattern="integration"

# 3. Run full validation
npm run validate:strict
```

---

## 🚀 **Step 4: End-to-End Testing**

### **Test 1: RAG Search Functionality**

```typescript
// Test file: packages/core/src/services/rag/__tests__/e2e-rag-search.test.ts
import { SelectiveRAGService } from '../selective-rag-service';
import { QueryAnalyzer } from '../query-analyzer';

describe('RAG E2E Search', () => {
  test('should perform end-to-end RAG search', async () => {
    const ragService = new SelectiveRAGService(mockEmbeddingService, supabaseClient);
    
    const response = await ragService.search(
      'React best practices for components',
      { skillLevel: 'intermediate', preferredLanguages: ['typescript'] },
      { repositoryId: 1, primaryLanguage: 'typescript' }
    );
    
    expect(response.results).toBeDefined();
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.searchInsights).toBeDefined();
  });
});
```

### **Test 2: Educational Content Retrieval**

```bash
# Run educational content search test
curl -X POST "https://your-project.supabase.co/rest/v1/rpc/rag_search_educational_content" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query_embedding": "[0.1, 0.2, 0.3, ...]",
    "language_filter": "typescript",
    "difficulty_filter": "intermediate"
  }'
```

### **Test 3: Vector Similarity Search**

```bash
# Test document search
curl -X POST "https://your-project.supabase.co/rest/v1/rpc/rag_search_documents" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query_embedding": "[0.1, 0.2, 0.3, ...]",
    "content_type_filter": "code",
    "language_filter": "typescript",
    "match_count": 10
  }'
```

---

## 🚀 **Step 5: Performance Testing**

### **Vector Search Performance:**

```sql
-- Test vector search performance
EXPLAIN ANALYZE
SELECT * FROM rag_search_documents(
  '[0.1, 0.2, 0.3, 0.4]'::vector(1536),
  repository_filter := 1,
  content_type_filter := 'code',
  language_filter := 'typescript',
  match_count := 10
);

-- Should complete in < 100ms for typical dataset
```

### **Index Optimization:**

```sql
-- Check vector index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE indexname LIKE '%embedding%';

-- Recreate indexes if needed
DROP INDEX IF EXISTS idx_rag_educational_content_embedding;
CREATE INDEX idx_rag_educational_content_embedding 
  ON rag_educational_content 
  USING ivfflat (content_embedding vector_cosine_ops) 
  WITH (lists = 100);
```

---

## 🚀 **Step 6: Production Monitoring**

### **Set Up Monitoring:**

1. **Supabase Dashboard Monitoring:**
   - Database performance metrics
   - Query execution times
   - Index usage statistics

2. **Application-Level Monitoring:**
   ```typescript
   // Add to RAG service
   private logSearchMetrics(query: string, resultCount: number, duration: number) {
     this.logger.info('RAG search completed', {
       query,
       resultCount,
       duration,
       timestamp: new Date().toISOString()
     });
   }
   ```

3. **Set Up Alerts:**
   - RAG search response time > 2 seconds
   - Vector index rebuild needed
   - Educational content low usage

---

## 🚀 **Step 7: Post-Deployment Verification**

### **Success Criteria:**

- [ ] ✅ All RAG tables and views accessible
- [ ] ✅ Educational content searchable
- [ ] ✅ Vector similarity search functional  
- [ ] ✅ Query analysis working correctly
- [ ] ✅ All 37 RAG tests passing
- [ ] ✅ Search response time < 2 seconds
- [ ] ✅ Embedding generation working
- [ ] ✅ Authentication integration functional

### **Performance Benchmarks:**

| Metric | Target | Actual |
|--------|--------|--------|
| Search Response Time | < 2 seconds | _____ |
| Vector Index Query | < 100ms | _____ |
| Educational Content Load | < 500ms | _____ |
| Test Suite Completion | < 30 seconds | _____ |

---

## 🚨 **Troubleshooting**

### **Common Issues:**

**1. Vector Extension Not Enabled:**
```sql
-- Fix: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

**2. Missing Environment Variables:**
```bash
# Fix: Verify all required variables
echo $SUPABASE_URL
echo $OPENAI_API_KEY
```

**3. Permission Issues:**
```sql
-- Fix: Grant proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON rag_educational_content TO authenticated;
GRANT EXECUTE ON FUNCTION rag_search_documents TO authenticated;
```

**4. Vector Index Performance:**
```sql
-- Fix: Recreate with optimal settings
DROP INDEX idx_rag_educational_content_embedding;
CREATE INDEX idx_rag_educational_content_embedding 
  ON rag_educational_content 
  USING ivfflat (content_embedding vector_cosine_ops) 
  WITH (lists = 50);
```

---

## ✅ **Deployment Complete**

Once all steps are complete, the RAG framework will be:

- ✅ **Production Ready** - Deployed and tested
- ✅ **Scalable** - Optimized vector indexes
- ✅ **Monitored** - Performance tracking enabled
- ✅ **Secure** - Row-level security configured
- ✅ **Educational** - Content seeded and searchable

**Next Step**: Move to Multi-Agent Executor implementation with RAG integration.

---

**🎯 Estimated Completion Time: 4-6 hours**
**📅 Target Completion: Within 1-2 days**