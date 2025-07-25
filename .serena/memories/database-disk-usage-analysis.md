# Database Disk Usage Analysis for CodeQual

## Overview
CodeQual uses PostgreSQL with pgvector extension on a 30GB DigitalOcean instance. The database stores various types of data, with vector embeddings likely being the largest consumer of disk space.

## Major Disk Space Consumers

### 1. Vector Embeddings (Largest Consumer)
- **Table**: `analysis_chunks`
- **Vector Dimensions**: 1536 (OpenAI text-embedding-3-large)
- **Storage per vector**: ~6KB (1536 * 4 bytes)
- **Additional data**: content text, metadata JSONB, timestamps
- **Indexes**: IVFFlat index for similarity search
- **Storage types**: permanent, cached (7-day TTL), temporary (1-day TTL)

### 2. DeepWiki Analysis Results
- **Tables**: 
  - `repository_analyses`: Complete repository analysis (JSONB content)
  - `pr_analyses`: Pull request analysis
  - `perspective_analyses`: Individual perspective analysis
- **Major fields**: Large JSONB content fields storing complete analysis results
- **Indexed by**: repository, timestamp, provider/model

### 3. Tool Results Storage
- **Table**: `tool_results_vectors` (referenced but not in migrations)
- **Storage**: Tool execution findings with embeddings
- **Per entry**: tool metadata, finding details, embedding vector

### 4. Educational & Knowledge Content
- **Tables**:
  - `educational_patterns`: Best practices with embeddings
  - `knowledge_items`: Accumulated insights with embeddings
  - `rag_educational_content`: Educational materials
- **Each contains**: Content text + vector embeddings

### 5. User & Organization Data
- **Tables**:
  - `user_profiles`: User information
  - `organizations`: Team data
  - `user_skills`: Skill tracking with embeddings
  - `api_keys`, `billing_events`: API and billing data

### 6. Caching & Performance
- **Tables**:
  - `search_cache`: Cached search results with embeddings
  - `repository_cache_status`: Repository analysis cache tracking
  - `chunk_relationships`: Relationships between chunks

## Storage Management Features

### Automatic Cleanup
- TTL-based expiration for cached/temporary content
- `clean_expired_content()` function removes expired data
- Cleanup functions in vector storage service

### Storage Types
1. **Permanent**: No expiration
2. **Cached**: 7-day TTL
3. **Temporary**: 1-day TTL

### Optimization Strategies
- Batch processing (100 records per batch)
- IVFFlat indexing for efficient vector search
- JSONB indexing for metadata queries
- Row-level security (RLS) enabled

## Monitoring Recommendations

### 1. Table Size Monitoring
```sql
-- Monitor largest tables
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

### 2. Vector Data Growth
```sql
-- Monitor vector storage growth
SELECT 
  COUNT(*) as total_chunks,
  storage_type,
  COUNT(*) FILTER (WHERE ttl < NOW()) as expired_chunks
FROM analysis_chunks
GROUP BY storage_type;
```

### 3. Implement Monitoring Dashboard
- Track database size trends
- Monitor vector chunk growth rate
- Alert on rapid growth (>1GB/day)
- Track cleanup effectiveness

### 4. Retention Policy Enforcement
- Regular execution of cleanup functions
- Archive old permanent data
- Compress JSONB content where possible
- Consider partitioning large tables

## Estimated Storage Requirements
- **Per Repository Analysis**: 10-50MB (depending on size)
- **Per PR Analysis**: 5-20MB
- **Vector chunks per analysis**: 100-1000 chunks × 10KB = 1-10MB
- **Growth rate**: Depends on analysis frequency

## Risk Mitigation
1. Set up automated cleanup jobs
2. Monitor disk usage alerts at 70%, 80%, 90%
3. Implement data archival strategy
4. Consider upgrading to larger instance if growth exceeds expectations
5. Optimize embedding dimensions if needed (reduce from 1536)