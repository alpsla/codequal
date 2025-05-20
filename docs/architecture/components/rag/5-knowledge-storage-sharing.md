# Knowledge Storage & Sharing

**Last Updated: May 11, 2025**

## Overview

The system implements a sophisticated multi-tiered storage strategy to balance performance, cost, and accessibility while enabling cross-team knowledge sharing. This approach ensures optimal resource usage while maintaining high availability of frequently accessed knowledge.

## Multi-Tiered Storage Strategy

```typescript
class MultiTieredKnowledgeManager {
  // Storage tier definitions
  private storageTiers = {
    hot: {
      description: 'Frequently accessed, high-performance storage',
      accessFrequencyThreshold: 5, // Accesses per week
      maxRetentionDays: 30,
      storageStrategy: 'in-memory-with-persistence',
      cachingStrategy: 'aggressive'
    },
    warm: {
      description: 'Moderately accessed, balanced storage',
      accessFrequencyThreshold: 1, // Accesses per week
      maxRetentionDays: 90,
      storageStrategy: 'standard-database',
      cachingStrategy: 'selective'
    },
    cold: {
      description: 'Rarely accessed, cost-effective storage',
      accessFrequencyThreshold: 0.25, // Accesses per week (once per month)
      maxRetentionDays: 365,
      storageStrategy: 'compressed-archive',
      cachingStrategy: 'minimal'
    },
    archive: {
      description: 'Historical data, lowest cost storage',
      accessFrequencyThreshold: 0, // Any less frequently accessed data
      maxRetentionDays: 730, // 2 years
      storageStrategy: 'deep-archive',
      cachingStrategy: 'none'
    }
  };

  async storeKnowledgeItem(item: KnowledgeItem): Promise<void> {
    // Determine initial storage tier based on predicted importance
    const initialTier = this.predictInitialTier(item);
    
    // Store with appropriate metadata
    await this.storeInTier(item, initialTier);
    
    // Schedule first tier re-evaluation
    this.scheduleReevaluation(item.id, initialTier);
  }
  
  private predictInitialTier(item: KnowledgeItem): StorageTier {
    // Analyze item characteristics to predict importance
    const importanceScore = this.calculateImportanceScore(item);
    
    if (importanceScore > 0.8) return 'hot';
    if (importanceScore > 0.5) return 'warm';
    return 'cold';
  }
  
  private calculateImportanceScore(item: KnowledgeItem): number {
    // Factors affecting importance:
    const recencyFactor = this.getRecencyScore(item.createdAt);
    const relevanceFactor = this.getRelevanceScore(item.content, item.metadata);
    const popularityFactor = item.initialPopularityEstimate || 0.5;
    const qualityFactor = item.qualityScore || 0.5;
    
    // Weighted combination
    return (
      recencyFactor * 0.3 +
      relevanceFactor * 0.3 +
      popularityFactor * 0.2 +
      qualityFactor * 0.2
    );
  }
  
  async reevaluateTier(itemId: string): Promise<void> {
    // Get item with usage statistics
    const item = await this.getItemWithStats(itemId);
    
    // Calculate appropriate tier based on actual usage
    const currentTier = item.currentTier;
    const appropriateTier = this.determineAppropriateTier(item);
    
    // If tier should change, migrate the item
    if (currentTier !== appropriateTier) {
      await this.migrateItemToTier(item, appropriateTier);
    }
    
    // Schedule next evaluation
    this.scheduleReevaluation(itemId, appropriateTier);
  }
  
  private determineAppropriateTier(item: KnowledgeItemWithStats): StorageTier {
    // Calculate weekly access frequency
    const weeklyAccessFrequency = this.calculateWeeklyAccessFrequency(item.accessHistory);
    
    // Find appropriate tier based on access frequency
    if (weeklyAccessFrequency >= this.storageTiers.hot.accessFrequencyThreshold) {
      return 'hot';
    } else if (weeklyAccessFrequency >= this.storageTiers.warm.accessFrequencyThreshold) {
      return 'warm';
    } else if (weeklyAccessFrequency >= this.storageTiers.cold.accessFrequencyThreshold) {
      return 'cold';
    } else {
      return 'archive';
    }
  }
  
  async purgeExpiredItems(): Promise<void> {
    for (const [tier, config] of Object.entries(this.storageTiers)) {
      // Find items older than maxRetentionDays in this tier
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - config.maxRetentionDays);
      
      const expiredItems = await this.findExpiredItemsInTier(tier as StorageTier, expirationDate);
      
      // For each expired item, either archive or delete
      for (const item of expiredItems) {
        if (tier === 'archive') {
          // Items expired from archive are permanently deleted unless marked as important
          if (!item.preserveIndefinitely) {
            await this.permanentlyDeleteItem(item.id);
          }
        } else {
          // Items expired from other tiers move to the next colder tier
          const nextTier = this.getNextColderTier(tier as StorageTier);
          await this.migrateItemToTier(item, nextTier);
        }
      }
    }
  }
  
  private getNextColderTier(tier: StorageTier): StorageTier {
    switch (tier) {
      case 'hot': return 'warm';
      case 'warm': return 'cold';
      case 'cold': return 'archive';
      case 'archive': return 'archive'; // Already at coldest tier
    }
  }
}
```

## Cross-Team Knowledge Sharing

The system enables knowledge sharing across teams, accounts, and users while maintaining appropriate access controls:

```typescript
class CrossTeamKnowledgeSharing {
  async searchAcrossTeams(
    query: string,
    options: CrossTeamSearchOptions
  ): Promise<SearchResult[]> {
    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Determine which teams' knowledge to include
    const teamsToSearch = this.determineSearchScope(options);
    
    // Execute cross-team search
    const results = await this.vectorSearchAcrossTeams({
      embedding: queryEmbedding,
      teams: teamsToSearch,
      threshold: options.threshold || 0.7,
      maxResults: options.maxResults || 20,
      includeGlobal: options.includeGlobal !== false
    });
    
    // Apply additional filters
    const filteredResults = this.applyFilters(results, options.filters);
    
    // Format and return results
    return this.formatResults(filteredResults, options.format);
  }
  
  private async vectorSearchAcrossTeams(params: {
    embedding: number[],
    teams: string[],
    threshold: number,
    maxResults: number,
    includeGlobal: boolean
  }): Promise<SearchResult[]> {
    // Build query including team access controls
    const queryClauses = params.teams.map(team => {
      return {
        vector: params.embedding,
        threshold: params.threshold,
        team_id: team
      };
    });
    
    // Add global knowledge if requested
    if (params.includeGlobal) {
      queryClauses.push({
        vector: params.embedding,
        threshold: params.threshold,
        is_global: true
      });
    }
    
    // Execute multi-team vector search
    const { data } = await this.supabaseClient.rpc('search_knowledge_across_teams', {
      query_clauses: JSON.stringify(queryClauses),
      max_results: params.maxResults
    });
    
    return data;
  }
  
  async shareKnowledgeWithTeams(
    knowledgeId: string,
    targetTeams: string[],
    sharingOptions: SharingOptions
  ): Promise<SharingResult> {
    // Get the knowledge item
    const item = await this.getKnowledgeItem(knowledgeId);
    
    // Check if current user has sharing permission
    await this.enforceSharePermission(item, targetTeams);
    
    // Handle different sharing modes
    if (sharingOptions.mode === 'reference') {
      // Share by reference - just update access permissions
      return await this.shareByReference(item, targetTeams, sharingOptions);
    } else {
      // Share by copy - create separate instances for target teams
      return await this.shareByCopy(item, targetTeams, sharingOptions);
    }
  }
}
```

## Deduplication Strategy

To prevent endless growth of the knowledge base, the system implements sophisticated deduplication at multiple levels:

```typescript
class KnowledgeDeduplication {
  async detectAndDeduplicate(newItem: KnowledgeItem): Promise<DeduplicationResult> {
    // Deduplication strategies applied in sequence
    const exactDuplicates = await this.findExactDuplicates(newItem);
    if (exactDuplicates.length > 0) {
      return this.handleExactDuplicates(newItem, exactDuplicates);
    }
    
    const semanticDuplicates = await this.findSemanticDuplicates(newItem);
    if (semanticDuplicates.length > 0) {
      return this.handleSemanticDuplicates(newItem, semanticDuplicates);
    }
    
    const partialOverlaps = await this.findPartialOverlaps(newItem);
    if (partialOverlaps.length > 0) {
      return this.handlePartialOverlaps(newItem, partialOverlaps);
    }
    
    // No duplicates found, store as new
    return { 
      deduplicationApplied: false,
      storedItemId: await this.storeAsNew(newItem),
      relatedItems: []
    };
  }
  
  private async findExactDuplicates(item: KnowledgeItem): Promise<KnowledgeItem[]> {
    // Use content hash for exact matching
    const contentHash = this.generateContentHash(item.content);
    
    const { data } = await this.supabaseClient
      .from('knowledge_items')
      .select('*')
      .eq('content_hash', contentHash);
      
    return data || [];
  }
  
  private async findSemanticDuplicates(item: KnowledgeItem): Promise<KnowledgeItem[]> {
    // Generate embedding for semantic matching
    const embedding = await this.generateEmbedding(item.content);
    
    // Find items with very high similarity
    const { data } = await this.supabaseClient.rpc('find_semantic_duplicates', {
      query_embedding: embedding,
      similarity_threshold: 0.95, // Very high threshold for duplicates
      max_results: 5
    });
    
    return data || [];
  }
  
  private async findPartialOverlaps(item: KnowledgeItem): Promise<PartialOverlap[]> {
    // Find items that have significant content overlap
    const embedding = await this.generateEmbedding(item.content);
    
    // Get potential overlaps with moderate similarity
    const { data } = await this.supabaseClient.rpc('find_semantic_duplicates', {
      query_embedding: embedding,
      similarity_threshold: 0.85, // Lower threshold for partial overlaps
      max_results: 10
    });
    
    // Analyze overlaps in more detail
    const overlaps = await Promise.all(
      data.map(async potential => {
        const overlapDetails = await this.analyzeOverlap(item.content, potential.content);
        return {
          item: potential,
          overlapPercentage: overlapDetails.percentage,
          overlapSections: overlapDetails.sections
        };
      })
    );
    
    // Filter to significant overlaps
    return overlaps.filter(overlap => overlap.overlapPercentage > 30);
  }
  
  private async handleExactDuplicates(
    newItem: KnowledgeItem, 
    duplicates: KnowledgeItem[]
  ): Promise<DeduplicationResult> {
    // For exact duplicates, update access count and merge metadata
    const primary = duplicates[0]; // Use first match as primary
    
    // Update access information
    await this.updateItemAccessCount(primary.id);
    
    // Merge any new metadata
    await this.mergeItemMetadata(primary.id, newItem.metadata);
    
    return {
      deduplicationApplied: true,
      deduplicationType: 'exact',
      storedItemId: primary.id,
      relatedItems: []
    };
  }
  
  private async handleSemanticDuplicates(
    newItem: KnowledgeItem,
    duplicates: KnowledgeItem[]
  ): Promise<DeduplicationResult> {
    // For semantic duplicates, either update or create reference
    const bestMatch = duplicates[0]; // Use best match
    
    // Determine if the new item adds significant value
    const comparison = await this.compareContentValue(newItem, bestMatch);
    
    if (comparison.newItemIsBetter) {
      // New item is better, replace or merge
      const updatedId = await this.replaceOrMergeItem(bestMatch.id, newItem, comparison);
      return {
        deduplicationApplied: true,
        deduplicationType: 'semantic_update',
        storedItemId: updatedId,
        relatedItems: duplicates.slice(1).map(d => d.id)
      };
    } else {
      // Existing item is better, just update metadata and references
      await this.updateItemAccessCount(bestMatch.id);
      await this.mergeItemMetadata(bestMatch.id, newItem.metadata);
      
      return {
        deduplicationApplied: true,
        deduplicationType: 'semantic_reference',
        storedItemId: bestMatch.id,
        relatedItems: duplicates.slice(1).map(d => d.id)
      };
    }
  }

  private async storeWithDeduplicationMetadata(
    item: KnowledgeItem, 
    metadata: DeduplicationMetadata
  ): Promise<string> {
    // Store item with deduplication information
    const { data } = await this.supabaseClient
      .from('knowledge_items')
      .insert({
        ...this.prepareItemForStorage(item),
        deduplication_metadata: metadata
      })
      .select('id')
      .single();
      
    return data?.id;
  }
}
```

## Content Population Sources

The system populates the knowledge base from multiple sources:

### 1. Internal Repository Analysis
- Code patterns from analyzed repositories
- Documentation extracted from codebases
- API usage examples
- Architecture diagrams and relationships

### 2. User Educational Interactions
- Issues and PRs with educational feedback
- Code review comments with explanations
- Tutorial completion data
- User questions and answers

### 3. External Sources
- Documentation from official sources
- Technical blogs and articles
- Academic papers and research
- Open source examples

### 4. Generated Content
- AI-generated tutorials and examples
- Synthesized explanations
- Comparative analyses
- Best practice recommendations

## Knowledge Access Controls

The system implements fine-grained access controls for knowledge:

```typescript
class KnowledgeAccessControl {
  async enforceAccessPolicy(
    userId: string,
    knowledgeId: string,
    accessType: 'read' | 'write' | 'share' | 'delete'
  ): Promise<boolean> {
    // Get the knowledge item
    const item = await this.getKnowledgeItemWithAccess(knowledgeId);
    
    // Get user's permissions
    const userPermissions = await this.getUserPermissions(userId);
    
    // Check if the item is publicly accessible
    if (item.accessLevel === 'public' && accessType === 'read') {
      return true;
    }
    
    // Check if the user is the owner
    if (item.ownerId === userId) {
      return true;
    }
    
    // Check team membership
    if (item.teamId && userPermissions.teams.includes(item.teamId)) {
      // Check team permission level
      const teamPermissionLevel = await this.getTeamPermissionLevel(
        userId, 
        item.teamId
      );
      
      return this.checkPermissionLevel(teamPermissionLevel, accessType);
    }
    
    // Check organization-level access
    if (item.organizationId && userPermissions.organizationId === item.organizationId) {
      // Check organization permission level
      return this.checkPermissionLevel(userPermissions.organizationRole, accessType);
    }
    
    // Check explicit grants
    if (item.explicitGrants && item.explicitGrants[userId]) {
      return this.checkPermissionLevel(item.explicitGrants[userId], accessType);
    }
    
    // Default deny
    return false;
  }
  
  private checkPermissionLevel(
    level: 'viewer' | 'contributor' | 'admin' | 'owner',
    accessType: 'read' | 'write' | 'share' | 'delete'
  ): boolean {
    switch (accessType) {
      case 'read':
        return ['viewer', 'contributor', 'admin', 'owner'].includes(level);
      case 'write':
        return ['contributor', 'admin', 'owner'].includes(level);
      case 'share':
        return ['admin', 'owner'].includes(level);
      case 'delete':
        return ['owner'].includes(level);
      default:
        return false;
    }
  }
}
```

## Federated Knowledge Sharing

The system enables federated knowledge sharing across organizations:

```typescript
class FederatedKnowledgeSharing {
  async federateWithExternalOrganization(
    targetOrgId: string,
    sharingConfiguration: FederationConfig
  ): Promise<FederationResult> {
    // 1. Validate organization exists and federation is allowed
    await this.validateFederationTarget(targetOrgId);
    
    // 2. Create federation agreement
    const agreement = await this.createFederationAgreement(
      targetOrgId,
      sharingConfiguration
    );
    
    // 3. Set up knowledge sharing rules
    await this.configureSharingRules(
      agreement.id,
      sharingConfiguration.sharingRules
    );
    
    // 4. Initialize federation sync
    await this.initializeFederationSync(agreement.id);
    
    // 5. Return federation status
    return {
      federationId: agreement.id,
      status: 'active',
      targetOrganization: targetOrgId,
      sharingConfiguration: sharingConfiguration,
      createdAt: new Date().toISOString()
    };
  }
  
  async syncFederatedKnowledge(federationId: string): Promise<SyncResult> {
    // 1. Get federation agreement
    const agreement = await this.getFederationAgreement(federationId);
    
    // 2. Find knowledge items to sync based on rules
    const itemsToSync = await this.findItemsToSync(
      agreement.sourceOrgId,
      agreement.targetOrgId,
      agreement.sharingRules
    );
    
    // 3. Perform knowledge sync
    const syncResults = await this.performKnowledgeSync(
      itemsToSync,
      agreement
    );
    
    // 4. Update last sync timestamp
    await this.updateLastSyncTimestamp(federationId);
    
    // 5. Return sync results
    return {
      federationId,
      syncedItemCount: syncResults.length,
      newItems: syncResults.filter(r => r.isNew).length,
      updatedItems: syncResults.filter(r => !r.isNew).length,
      failedItems: syncResults.filter(r => r.error).length,
      timestamp: new Date().toISOString()
    };
  }
}
```

## Benefits of Multi-Tiered Storage

The multi-tiered storage approach provides several key benefits:

1. **Cost Optimization**: Rarely accessed data is stored in lower-cost tiers
2. **Performance Optimization**: Frequently accessed data is kept in high-performance storage
3. **Automatic Management**: Items automatically migrate between tiers based on usage
4. **Intelligent Retention**: Data retention periods adjust based on importance
5. **Balanced Resources**: Storage resources are allocated based on actual usage patterns
