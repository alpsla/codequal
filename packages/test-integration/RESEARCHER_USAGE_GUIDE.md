# Researcher Agent Usage Guide

## Overview

The Researcher agent is responsible for discovering and evaluating AI models to find the most cost-effective and performant options for each agent role in the CodeQual system.

## Quick Start

### 1. Simple Usage - Trigger Research

```typescript
import { ResearcherServiceFactory } from '@codequal/agents';
import { AuthenticatedUser } from '@codequal/core/types';

// Create a minimal user context
const user: AuthenticatedUser = {
  id: 'system',
  email: 'system@codequal.com'
} as AuthenticatedUser;

// Create the service
const researcher = ResearcherServiceFactory.createResearcherService(user);

// Trigger research
const operation = await researcher.triggerResearch();
console.log(`Research started: ${operation.operationId}`);
```

### 2. Advanced Usage - With Configuration

```typescript
const operation = await researcher.triggerResearch({
  researchDepth: 'comprehensive',    // 'shallow' | 'deep' | 'comprehensive'
  prioritizeCost: true,              // Optimize for cost over performance
  maxCostPerMillion: 10.0,           // Budget limit per million tokens
  minPerformanceThreshold: 7.5,      // Minimum performance score (0-10)
  providers: ['openai', 'anthropic'], // Specific providers to consider
  forceRefresh: true                 // Force new research even if recent exists
});
```

## API Reference

### ResearcherService Constructor

```typescript
new ResearcherService(
  authenticatedUser: AuthenticatedUser,
  vectorContextService?: VectorContextService
)
```

### Key Methods

#### 1. `triggerResearch(config?: ResearchConfig)`
Starts a research operation to discover optimal models.

**Returns:**
```typescript
{
  operationId: string;
  status: 'started';
  estimatedDuration: string;
}
```

#### 2. `getOperationStatus(operationId: string)`
Check the status of a research operation.

**Returns:** `ResearchOperation` object with:
- `status`: 'running' | 'completed' | 'failed'
- `configurationsUpdated`: Number of configs updated
- `totalCostSavings`: Percentage of cost savings achieved
- `performanceImprovements`: Number of performance improvements

#### 3. `generateConfigurationOverview()`
Get an overview of current model configurations.

**Returns:**
```typescript
{
  totalConfigurations: number;
  configurationsByProvider: Record<string, number>;
  configurationsByRole: Record<string, number>;
  averageCostPerMillion: number;
  lastUpdated: Date | null;
}
```

#### 4. `getRecommendedOptimizations()`
Get recommendations for cost and performance optimizations.

**Returns:**
```typescript
{
  costOptimizations: Array<{
    context: string;
    currentCost: number;
    recommendedCost: number;
    savings: number;
  }>;
  performanceOptimizations: Array<{
    context: string;
    currentPerformance: number;
    recommendedPerformance: number;
    improvement: number;
  }>;
  outdatedConfigurations: Array<{
    context: string;
    currentModel: string;
    lastUpdated: Date;
    recommendedUpdate: string;
  }>;
}
```

#### 5. `startScheduledResearch(intervalHours: number)`
Start automatic periodic research operations.

```typescript
await researcher.startScheduledResearch(24); // Run daily
```

## Research Configuration Options

```typescript
interface ResearchConfig {
  researchDepth?: 'shallow' | 'deep' | 'comprehensive';
  prioritizeCost?: boolean;
  maxCostPerMillion?: number;
  minPerformanceThreshold?: number;
  providers?: string[];
  forceRefresh?: boolean;
  customPrompt?: string;
}
```

### Research Depth Levels

- **shallow**: Quick evaluation of top models (3-5 minutes)
- **deep**: Thorough analysis with benchmarks (5-10 minutes)  
- **comprehensive**: Full evaluation including edge cases (10-15 minutes)

## Usage Patterns

### Pattern 1: One-time Model Discovery

```typescript
// Run once to discover and configure all models
const researcher = ResearcherServiceFactory.createResearcherService(user);
const op = await researcher.triggerResearch({ researchDepth: 'comprehensive' });

// Wait for completion
let status;
do {
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s
  status = await researcher.getOperationStatus(op.operationId);
} while (status?.status === 'running');

console.log(`Research complete! Updated ${status.configurationsUpdated} configs`);
```

### Pattern 2: Cost Optimization Focus

```typescript
const operation = await researcher.triggerResearch({
  prioritizeCost: true,
  maxCostPerMillion: 5.0,  // Very tight budget
  minPerformanceThreshold: 6.0  // Accept lower performance
});
```

### Pattern 3: Performance Optimization Focus

```typescript
const operation = await researcher.triggerResearch({
  prioritizeCost: false,
  minPerformanceThreshold: 9.0,  // Demand high performance
  providers: ['anthropic', 'openai']  // Premium providers only
});
```

### Pattern 4: Automated Scheduled Research

```typescript
// Set up automatic research updates
const researcher = ResearcherServiceFactory.createResearcherService(user);

// Run research every 24 hours
await researcher.startScheduledResearch(24);

// The service will now automatically discover new models daily
```

## Complete Example Scripts

### Script 1: Basic Research Run
See: `run-researcher-simple.ts`

### Script 2: Full Research with Monitoring
See: `run-researcher.ts`

### Script 3: Multi-Agent Research (from e2e test)
See: `src/e2e/trigger-researcher-for-all-agents.ts`

## Environment Requirements

Required environment variables:
```bash
OPENROUTER_API_KEY=your_api_key
SUPABASE_URL=your_supabase_url        # Optional
SUPABASE_SERVICE_ROLE_KEY=your_key    # Optional
```

## Common Use Cases

### 1. Initial System Setup
Run comprehensive research to configure all agents with optimal models.

### 2. Cost Reduction Initiative
Run with `prioritizeCost: true` to find cheaper alternatives.

### 3. Performance Upgrade
Run with high `minPerformanceThreshold` to find better models.

### 4. New Model Discovery
Run periodically to discover newly released models.

### 5. Provider Migration
Use `providers` filter to evaluate specific provider options.

## Notes

- The ResearcherAgent currently uses placeholder implementations
- Research operations run asynchronously in the background
- Results are stored in Vector DB if configured
- The service maintains operation history for tracking
- Cost savings are calculated as percentages
- Performance scores use a 0-10 scale

## Troubleshooting

### Research fails immediately
- Check OPENROUTER_API_KEY is set
- Verify network connectivity

### No configurations updated
- Research may have found current configs are already optimal
- Try `forceRefresh: true` to force updates

### Takes too long
- Use 'shallow' research depth for faster results
- Check if previous operations are still running

## Integration with Other Services

The Researcher service can be integrated with:
- Educational Service - for finding models for content generation
- Reporting Service - for finding models for report generation  
- Vector Context Service - for storing research results