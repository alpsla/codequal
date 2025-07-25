# Supabase Storage Migration Strategy

## Cost Comparison

### Current Setup (DigitalOcean)
- **Storage**: 30GB PostgreSQL
- **Cost**: $15/month ($0.50/GB)
- **Usage**: Shared between DeepWiki, vectors, and analysis data

### Supabase Pricing
- **Database**: $0.125/GB/month (75% cheaper than DO)
- **Object Storage**: $0.021/GB/month (96% cheaper than DO)
- **Vector Search**: Included with database

## Migration Strategy

### 1. Data Classification

#### Keep in DigitalOcean (Hot Data)
- Active DeepWiki repositories (last 7 days)
- Currently processing PR analyses
- Real-time vector search data
- **Target Size**: 5-10GB

#### Move to Supabase Database (Warm Data)
- Analysis results (JSON/JSONB)
- Vector embeddings for search
- Tool results and findings
- User data and auth
- **Target Size**: 15-20GB

#### Move to Supabase Storage (Cold Data)
- Archived repository analyses
- Historical PR reports
- Old vector chunks
- Completed analysis artifacts
- **Target Size**: Unlimited

### 2. Cost Savings Analysis

```
Current State (DigitalOcean Only):
- 30GB × $0.50 = $15/month

Optimized State:
- DigitalOcean: 10GB × $0.50 = $5/month
- Supabase DB: 15GB × $0.125 = $1.88/month
- Supabase Storage: 5GB × $0.021 = $0.11/month
- Total: $6.99/month (53% savings!)
```

### 3. Implementation Plan

#### Phase 1: Supabase Storage Setup
```typescript
// supabase-archive-service.ts
export class SupabaseArchiveService {
  private supabase: SupabaseClient;
  private readonly ARCHIVE_BUCKET = 'codequal-archives';
  
  async archiveAnalysis(analysisId: string, data: any): Promise<string> {
    // Compress data
    const compressed = await this.compress(data);
    
    // Upload to Supabase Storage
    const path = `analyses/${analysisId}/${Date.now()}.json.gz`;
    const { data: upload, error } = await this.supabase.storage
      .from(this.ARCHIVE_BUCKET)
      .upload(path, compressed, {
        contentType: 'application/gzip',
        metadata: {
          analysisId,
          originalSize: JSON.stringify(data).length,
          compressedSize: compressed.length,
          archivedAt: new Date().toISOString()
        }
      });
    
    // Update reference in database
    await this.updateAnalysisReference(analysisId, path);
    
    return path;
  }
  
  async retrieveAnalysis(analysisId: string): Promise<any> {
    // Get storage path from database
    const path = await this.getArchivePath(analysisId);
    
    // Download from Supabase Storage
    const { data, error } = await this.supabase.storage
      .from(this.ARCHIVE_BUCKET)
      .download(path);
    
    // Decompress and return
    return this.decompress(data);
  }
}
```

#### Phase 2: DeepWiki Integration
```typescript
// deepwiki-storage-optimizer.ts
export class DeepWikiStorageOptimizer {
  private supabaseArchive: SupabaseArchiveService;
  
  async optimizeStorage(): Promise<OptimizationResult> {
    // 1. Identify completed analyses
    const completed = await this.getCompletedAnalyses();
    
    // 2. Archive to Supabase
    for (const analysis of completed) {
      // Archive analysis data
      const archivePath = await this.supabaseArchive.archiveAnalysis(
        analysis.id, 
        analysis.data
      );
      
      // Archive repository if not needed
      if (await this.canArchiveRepository(analysis.repositoryPath)) {
        await this.archiveRepositoryToSupabase(analysis.repositoryPath);
        await this.removeLocalRepository(analysis.repositoryPath);
      }
      
      // Update local database to reference archive
      await this.updateToArchiveReference(analysis.id, archivePath);
    }
    
    return {
      archived: completed.length,
      spaceFreed: this.calculateSpaceFreed(completed),
      newStorageCost: this.calculateNewCost()
    };
  }
}
```

#### Phase 3: Retention Policies
```yaml
# retention-policy.yaml
policies:
  digitalocean:
    - name: active_deepwiki_repos
      retention: 7d
      condition: "last_accessed < 7 days OR in_active_job"
      
  supabase_database:
    - name: vector_embeddings
      retention: 90d
      indexes: true
      compression: true
      
    - name: analysis_results  
      retention: 30d
      archive_after: 7d
      
  supabase_storage:
    - name: archived_analyses
      retention: 1y
      lifecycle: STANDARD -> INFREQUENT_ACCESS after 30d
      
    - name: repository_archives
      retention: 6m
      compression: gzip
```

### 4. API Endpoints for Migration

```typescript
// routes/storage-migration.ts
router.post('/migrate/archive-old-analyses', async (req, res) => {
  const { daysOld = 7 } = req.body;
  
  // Find analyses older than X days
  const oldAnalyses = await findOldAnalyses(daysOld);
  
  // Archive to Supabase Storage
  const results = await Promise.all(
    oldAnalyses.map(analysis => 
      supabaseArchive.archiveAnalysis(analysis.id, analysis.data)
    )
  );
  
  // Calculate savings
  const savedGB = calculateSpaceSaved(oldAnalyses);
  const monthlySavings = savedGB * (0.50 - 0.021); // DO cost - Supabase cost
  
  res.json({
    migrated: results.length,
    spaceFreedGB: savedGB,
    monthlySavings: `$${monthlySavings.toFixed(2)}`,
    annualSavings: `$${(monthlySavings * 12).toFixed(2)}`
  });
});

router.get('/retrieve/:analysisId', async (req, res) => {
  const { analysisId } = req.params;
  
  // Check if in hot storage (DigitalOcean)
  let data = await getFromHotStorage(analysisId);
  
  // If not found, check Supabase
  if (!data) {
    data = await supabaseArchive.retrieveAnalysis(analysisId);
  }
  
  res.json(data);
});
```

### 5. Automated Migration Script

```typescript
// scripts/migrate-to-supabase-storage.ts
async function migrateToSupabase() {
  const metrics = {
    migrated: 0,
    spaceSaved: 0,
    costSaved: 0
  };
  
  // 1. Archive old analyses
  console.log('📦 Archiving old analyses...');
  const analyses = await db.query(`
    SELECT * FROM repository_analyses 
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND status = 'completed'
  `);
  
  for (const analysis of analyses) {
    const archived = await archiveToSupabase(analysis);
    if (archived) {
      metrics.migrated++;
      metrics.spaceSaved += analysis.size_mb / 1024;
    }
  }
  
  // 2. Move vector embeddings
  console.log('🔄 Migrating vector embeddings...');
  await migrateVectorsToSupabase();
  
  // 3. Clean up DeepWiki repos
  console.log('🧹 Cleaning DeepWiki storage...');
  const cleaned = await cleanupDeepWikiRepos();
  metrics.spaceSaved += cleaned.freedGB;
  
  // Calculate savings
  metrics.costSaved = metrics.spaceSaved * (0.50 - 0.125);
  
  console.log(`
✅ Migration Complete!
- Migrated: ${metrics.migrated} items
- Space saved: ${metrics.spaceSaved.toFixed(2)}GB
- Monthly savings: $${metrics.costSaved.toFixed(2)}
- Annual savings: $${(metrics.costSaved * 12).toFixed(2)}
  `);
}
```

### 6. Real-time Cost Dashboard

```typescript
// services/storage-cost-tracker.ts
export class StorageCostTracker {
  async getCurrentCosts(): Promise<CostBreakdown> {
    const doStorage = await this.getDigitalOceanUsage();
    const supabaseDB = await this.getSupabaseDBUsage();
    const supabaseStorage = await this.getSupabaseStorageUsage();
    
    return {
      current: {
        digitalOcean: doStorage.gb * 0.50,
        supabaseDB: supabaseDB.gb * 0.125,
        supabaseStorage: supabaseStorage.gb * 0.021,
        total: (doStorage.gb * 0.50) + (supabaseDB.gb * 0.125) + (supabaseStorage.gb * 0.021)
      },
      optimal: {
        digitalOcean: 5 * 0.50,  // Only 5GB for active data
        supabaseDB: 20 * 0.125,  // 20GB for warm data
        supabaseStorage: 5 * 0.021,  // 5GB archived
        total: (5 * 0.50) + (20 * 0.125) + (5 * 0.021)
      },
      potentialSavings: this.calculatePotentialSavings()
    };
  }
}
```

## Benefits

1. **Cost Reduction**: 50-70% lower storage costs
2. **Scalability**: Supabase Storage has no hard limits
3. **Performance**: Keep only active data in expensive storage
4. **Flexibility**: Easy retrieval of archived data when needed

## Implementation Timeline

- **Week 1**: Set up Supabase Storage buckets and archival service
- **Week 2**: Implement migration APIs and test retrieval
- **Week 3**: Migrate historical data and monitor performance
- **Week 4**: Automate retention policies and cost tracking

## Monitoring

```bash
# Check migration progress
npm run migrate:status

# View cost savings
npm run costs:report

# Manual migration
npm run migrate:to-supabase --days-old=7
```