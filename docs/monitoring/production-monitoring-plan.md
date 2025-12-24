# CodeQual Production Monitoring & Observability Plan
**Last Updated: December 20, 2025**

## Overview

A comprehensive monitoring strategy for CodeQual to track performance, errors, resource usage, and enable efficient troubleshooting. This plan has been significantly updated to reflect the monitoring infrastructure implemented through December 2025.

## Current Status

### ✅ Completed (December 2025 - Session 63)
- **Fix Cost Tracking**: Real-time cost comparison between Corgea and AI-fixer
- **Supabase Cost Tables**: `corgea_subscription`, `corgea_usage_log`, `fix_cost_comparison` view
- **Manual/Automatic Routing Mode**: Switch between data collection (manual) and cost-optimized (automatic) modes
- **Routing Decision Logging**: `fix_routing_config`, `fix_routing_decisions` tables track all routing decisions
- **Dynamic Model Cost**: AI-fixer cost retrieved from Supabase `model_configurations` + `ai_fixer_research`
- **Multi-user Infrastructure**: Usage tracking, smart batching, fix caching, rate limiting
- **Existing Monitoring Reuse**: Integrated with `CostTrackerService`, `ModelUsageAnalytics`

### ✅ Completed (July 2025)
- DeepWiki monitoring infrastructure with real-time metrics
- Prometheus-format metrics export
- Grafana dashboard integration
- JWT-authenticated monitoring endpoints
- Public monitoring dashboard with auto-refresh
- Alert system with configurable thresholds
- Service authentication middleware
- Comprehensive monitoring documentation

### ✅ Completed (January 2025)
- Service Health Tracking for LSP/SARIF uploads and URL validation
- 404 error tracking and alerting
- Service availability metrics and dashboards
- Automatic fallback to error_logs table

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETED
**Status: Implemented July 2025**

These essential monitoring capabilities have been implemented for production operations.

#### 1.1 Structured Logging
```typescript
// Standardized log format across all services
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  service: string;
  traceId: string;      // For request tracing
  userId?: string;
  repositoryUrl?: string;
  action: string;
  duration?: number;
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

// Example implementation
class MonitoringLogger {
  log(entry: LogEntry) {
    // Send to multiple destinations
    this.sendToConsole(entry);
    this.sendToElasticsearch(entry);
    this.sendToGrafanaLoki(entry);
    
    // Critical errors trigger alerts
    if (entry.level === 'critical') {
      this.triggerAlert(entry);
    }
  }
}
```

#### 1.2 Error Tracking & Aggregation
```typescript
// Centralized error handling with Sentry or similar
class ErrorMonitor {
  captureException(error: Error, context: ErrorContext) {
    // Enrich error with context
    const enrichedError = {
      ...error,
      service: context.service,
      userId: context.userId,
      repositoryUrl: context.repositoryUrl,
      analysisId: context.analysisId,
      stackTrace: error.stack,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      release: process.env.APP_VERSION
    };
    
    // Send to error tracking service
    Sentry.captureException(enrichedError);
    
    // Log for correlation
    logger.error('Exception captured', enrichedError);
  }
}
```

#### 1.3 Basic Metrics Collection ✅ IMPLEMENTED

**DeepWiki Metrics Collector** is now operational, tracking:
- Real-time disk usage (total, used, available)
- Active repository count
- Analysis lifecycle (start/complete/fail)
- Cleanup operations

```typescript
// Implemented in deepwiki-metrics-collector.ts
interface CoreMetrics {
  // Analysis metrics
  analysisStarted: Counter;
  analysisCompleted: Counter;
  analysisFailed: Counter;
  analysisTime: Histogram;
  
  // Component health
  deepWikiAvailability: Gauge;
  vectorDBLatency: Histogram;
  agentExecutionTime: Histogram;
  
  // Resource usage
  memoryUsage: Gauge;
  cpuUsage: Gauge;
  activeAnalyses: Gauge;
}

// Prometheus-style metrics
const metrics = {
  analysisTime: new Histogram({
    name: 'codequal_analysis_duration_seconds',
    help: 'Time taken for complete PR analysis',
    labelNames: ['mode', 'repository_size', 'status'],
    buckets: [10, 30, 60, 120, 300, 600] // seconds
  }),
  
  deepWikiErrors: new Counter({
    name: 'codequal_deepwiki_errors_total',
    help: 'Total DeepWiki errors',
    labelNames: ['error_type', 'repository']
  })
};
```

#### 1.4 Health Check Endpoints ✅ IMPLEMENTED

**Available Endpoints:**
- `/api/monitoring/health` - Overall system health
- `/api/monitoring/deepwiki/metrics` - DeepWiki metrics JSON
- `/api/monitoring/deepwiki/metrics-prometheus` - Prometheus format
- `/api/monitoring/public/dashboard` - Dashboard data

```typescript
// Implemented health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      vectorDB: await checkVectorDB(),
      deepWiki: await checkDeepWiki(),
      redis: await checkRedis()
    }
  };
  
  const isHealthy = Object.values(health.checks).every(c => c.status === 'ok');
  res.status(isHealthy ? 200 : 503).json(health);
});

// Kubernetes readiness/liveness probes
app.get('/ready', (req, res) => {
  // Check if service is ready to accept traffic
  res.status(serviceReady ? 200 : 503).send();
});
```

### Phase 2: Enhanced Observability 🔄 PARTIALLY COMPLETE
**Status: 70% Complete** (Updated January 2025)

#### 2.5 Service Health Tracking ✅ COMPLETED (January 2025)

**Service Health Monitoring** tracks critical service operations:
- LSP/SARIF file uploads to Supabase Storage
- URL validation (404 errors, timeouts)
- Service errors and unexpected states
- Upload success/failure rates

**Implementation:**
- `ServiceHealthTracker` class tracks all health events
- `service_health_events` table stores events in Supabase
- Automatic fallback to `error_logs` if table doesn't exist
- Grafana queries and dashboards ready for visualization

**Key Metrics:**
- Upload success rate by service (LSP, SARIF, GitLab)
- 404 error count and frequency
- Service availability percentage
- Recent failures timeline

**See:** [Service Health Tracking Documentation](./service-health-tracking.md)  
**Priority: HIGH**

Some components have been implemented, others are in progress.

#### 2.1 Distributed Tracing
```typescript
// OpenTelemetry integration
import { trace } from '@opentelemetry/api';

class TracedOrchestrator {
  async analyzePR(request: PRAnalysisRequest) {
    const tracer = trace.getTracer('orchestrator');
    const span = tracer.startSpan('analyze-pr', {
      attributes: {
        'repository.url': request.repositoryUrl,
        'pr.number': request.prNumber,
        'analysis.mode': request.analysisMode
      }
    });
    
    try {
      // Trace each major step
      const vectorDBSpan = tracer.startSpan('check-vector-db', { parent: span });
      const hasData = await this.checkVectorDB(request.repositoryUrl);
      vectorDBSpan.end();
      
      if (!hasData) {
        const deepWikiSpan = tracer.startSpan('trigger-deepwiki', { parent: span });
        await this.triggerDeepWiki(request.repositoryUrl);
        deepWikiSpan.end();
      }
      
      // Continue tracing through the flow...
    } finally {
      span.end();
    }
  }
}
```

#### 2.2 Performance Dashboards ✅ IMPLEMENTED

**Completed Dashboards:**
- DeepWiki real-time monitoring dashboard
- Disk usage visualization with progress bars
- Active analyses tracking
- 10-second auto-refresh
- JWT authentication

**Dashboard Locations:**
- `/testing/deepwiki-dashboard.html` - Public dashboard
- `/monitoring/codequal-alerts-dashboard.json` - Grafana import

```yaml
# Implemented Grafana Dashboard Configuration
dashboards:
  - name: "CodeQual Overview"
    panels:
      - title: "Analysis Success Rate"
        query: |
          rate(codequal_analysis_completed_total[5m]) / 
          rate(codequal_analysis_started_total[5m])
      
      - title: "P95 Analysis Time by Mode"
        query: |
          histogram_quantile(0.95, 
            rate(codequal_analysis_duration_seconds_bucket[5m])
          ) by (mode)
      
      - title: "Active Analyses"
        query: "codequal_active_analyses"
      
      - title: "Error Rate by Component"
        query: |
          sum(rate(codequal_errors_total[5m])) by (service)
```

#### 2.3 Resource Usage Monitoring
```typescript
// Track resource usage per analysis
class ResourceMonitor {
  private analysisResources = new Map<string, ResourceUsage>();
  
  startTracking(analysisId: string) {
    this.analysisResources.set(analysisId, {
      startTime: Date.now(),
      startMemory: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    });
  }
  
  endTracking(analysisId: string) {
    const start = this.analysisResources.get(analysisId);
    if (!start) return;
    
    const duration = Date.now() - start.startTime;
    const memoryDelta = process.memoryUsage().heapUsed - start.startMemory.heapUsed;
    const cpuDelta = process.cpuUsage(start.cpuUsage);
    
    metrics.resourceUsage.observe({
      analysisId,
      duration,
      memoryMB: memoryDelta / 1024 / 1024,
      cpuSeconds: (cpuDelta.user + cpuDelta.system) / 1000000
    });
  }
}
```

#### 2.4 Business Metrics
```typescript
// Track business-relevant metrics
const businessMetrics = {
  repositoriesAnalyzed: new Counter({
    name: 'codequal_repositories_analyzed_total',
    help: 'Total unique repositories analyzed',
    labelNames: ['organization', 'language']
  }),
  
  criticalFindingsDetected: new Counter({
    name: 'codequal_critical_findings_total',
    help: 'Critical security/quality issues found',
    labelNames: ['type', 'repository']
  }),
  
  costPerAnalysis: new Histogram({
    name: 'codequal_analysis_cost_dollars',
    help: 'Cost of analysis in dollars',
    labelNames: ['mode', 'provider'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
  })
};
```

### Phase 2.6: Fix Cost Monitoring ✅ COMPLETED (December 2025)

**Purpose**: Track and optimize costs between Corgea (cloud fixer) and AI-fixer (OpenRouter).

#### Routing Modes

| Mode | Purpose | When to Use |
|------|---------|-------------|
| **Manual** | Data collection, testing | Start here - collect ~100 fixes from each source |
| **Automatic** | Cost-optimized routing | After analyzing data, switch to auto mode |

```bash
# Switch modes via CLI
npx ts-node tests/integration/test-routing-mode.ts --corgea     # Test Corgea
npx ts-node tests/integration/test-routing-mode.ts --ai-fixer   # Test AI-fixer
npx ts-node tests/integration/test-routing-mode.ts --automatic  # Enable auto mode
```

#### Supabase Schema

```sql
-- Subscription tracking
CREATE TABLE corgea_subscription (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
  plan_name VARCHAR(50) NOT NULL,        -- starter, growth, scale, enterprise
  monthly_cost_cents INTEGER NOT NULL,    -- e.g., 2900 for $29
  fixes_this_period INTEGER DEFAULT 0,
  effective_cost_per_fix_cents DECIMAL(10,2)  -- auto-calculated
);

-- Usage logging (triggers effective cost update)
CREATE TABLE corgea_usage_log (
  id UUID PRIMARY KEY,
  user_id VARCHAR(100),
  organization_id VARCHAR(100),
  issue_count INTEGER,
  fixes_generated INTEGER,
  estimated_cost_cents DECIMAL(10,2),
  success BOOLEAN,
  created_at TIMESTAMP
);

-- Routing configuration (manual/automatic mode)
CREATE TABLE fix_routing_config (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
  routing_mode VARCHAR(20) NOT NULL,          -- 'manual' | 'automatic'
  manual_preferred_source VARCHAR(20),         -- 'corgea' | 'ai_fixer'
  data_collection_target_fixes INTEGER,        -- e.g., 100
  data_collection_started_at TIMESTAMP
);

-- Routing decision logging (for analysis)
CREATE TABLE fix_routing_decisions (
  id UUID PRIMARY KEY,
  routing_mode VARCHAR(20),
  selected_source VARCHAR(20),
  decision_reason TEXT,
  corgea_cost_cents DECIMAL(10,2),
  ai_fixer_cost_cents DECIMAL(10,2),
  issue_severity VARCHAR(20),
  issue_category VARCHAR(50)
);

-- Real-time cost comparison view (respects routing mode)
CREATE VIEW fix_cost_comparison AS
SELECT
  corgea_cost_per_fix_cents,
  ai_fixer_cost_per_fix_cents,
  routing_mode,
  manual_preferred_source,
  CASE
    WHEN routing_mode = 'manual' THEN manual_preferred_source
    WHEN corgea_cost < ai_fixer_cost THEN 'corgea'
    ELSE 'ai_fixer'
  END AS recommended_source
FROM corgea_subscription, fix_routing_config, ai_fixer_research;
```

#### Key Metrics

| Metric | Source | Purpose |
|--------|--------|---------|
| `corgea_effective_cost` | `corgea_subscription.effective_cost_per_fix_cents` | Subscription / fixes used |
| `ai_fixer_cost` | `ai_fixer_research.avg_cost` | From quarterly research |
| `recommended_source` | `fix_cost_comparison` view | Which is cheaper |
| `corgea_fixes_used` | `corgea_subscription.fixes_this_period` | Usage this billing cycle |

#### Cost Decision Logic

```typescript
// In fix-cost-manager.ts
async getCheaperSource(): Promise<{ source: FixSource; costCents: number; reason: string }> {
  const comparison = await this.getSupabaseCostComparison();

  if (comparison.corgeaCostPerFixCents < comparison.aiFixerCostPerFixCents) {
    return { source: 'corgea', costCents: comparison.corgeaCostPerFixCents, ... };
  } else {
    return { source: 'ai_fixer', costCents: comparison.aiFixerCostPerFixCents, ... };
  }
}
```

#### Monitoring Dashboard Queries

```sql
-- Corgea plan efficiency
SELECT
  plan_name,
  monthly_cost_cents / 100.0 AS monthly_cost_dollars,
  fixes_this_period,
  effective_cost_per_fix_cents / 100.0 AS cost_per_fix_dollars
FROM corgea_subscription;

-- Usage trend (last 7 days)
SELECT
  DATE(created_at) AS date,
  SUM(fixes_generated) AS total_fixes,
  SUM(estimated_cost_cents) / 100.0 AS total_cost
FROM corgea_usage_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- Cost comparison history
SELECT
  DATE(created_at) AS date,
  AVG(estimated_cost_cents) AS avg_corgea_cost,
  (SELECT avg_cost * 100 FROM ai_fixer_research ORDER BY research_date DESC LIMIT 1) AS ai_fixer_cost
FROM corgea_usage_log
GROUP BY DATE(created_at);
```

#### Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| `CorgeaHighCost` | `effective_cost_per_fix > ai_fixer_cost * 2` | Warning |
| `CorgeaRateLimited` | Rate limit hit | Warning |
| `CorgeaPlanUpgrade` | `fixes_this_period > estimated_monthly_fix_limit * 0.8` | Info |
| `CostCeilingApproaching` | `daily_cost > max_daily_cost * 0.8` | Warning |

#### Existing Infrastructure Used

| Service | Location | Purpose |
|---------|----------|---------|
| `CostTrackerService` | `standard/monitoring/services/cost-tracker.service.ts` | Model pricing database |
| `ModelUsageAnalytics` | `standard/monitoring/services/model-usage-analytics.ts` | Usage patterns, optimization recommendations |
| `UnifiedMonitoringService` | `standard/monitoring/services/unified-monitoring.service.ts` | Centralized metrics collection |
| `SmartAgentTrackerService` | `standard/monitoring/services/smart-agent-tracker.service.ts` | Auto-detect primary vs fallback usage |

### Phase 3: Advanced Analytics (Implement Later) 🔬
**Timeline: 1-2 months**
**Priority: MEDIUM**

These provide predictive insights and advanced troubleshooting.

#### 3.1 Anomaly Detection
```typescript
// Detect unusual patterns
class AnomalyDetector {
  async checkForAnomalies() {
    // Sudden spike in failures
    const failureRate = await this.getFailureRate('5m');
    if (failureRate > this.baseline * 2) {
      this.alert('High failure rate detected', { rate: failureRate });
    }
    
    // Unusual analysis duration
    const p99Duration = await this.getP99Duration('5m');
    if (p99Duration > this.expectedP99 * 1.5) {
      this.alert('Analysis taking longer than usual', { p99: p99Duration });
    }
    
    // Resource exhaustion prediction
    const memoryTrend = await this.getMemoryTrend('1h');
    if (this.predictExhaustion(memoryTrend) < 30) { // minutes
      this.alert('Memory exhaustion predicted', { minutesRemaining: 30 });
    }
  }
}
```

#### 3.2 Performance Optimization Insights
```typescript
// Identify optimization opportunities
class PerformanceAnalyzer {
  async generateInsights() {
    return {
      slowestAgents: await this.getSlowertAgents(),
      bottlenecks: await this.identifyBottlenecks(),
      cacheMissRate: await this.getCacheMissRate(),
      recommendations: [
        'Consider caching DeepWiki results for repos with <5 commits/week',
        'Security agent taking 45% of total time - investigate parallelization',
        'Vector DB queries averaging 250ms - add index on repository_url'
      ]
    };
  }
}
```

#### 3.3 Cost Optimization
```typescript
// Track and optimize costs
class CostMonitor {
  async analyzeCosts(period: string) {
    const costs = await this.getCostBreakdown(period);
    
    return {
      total: costs.total,
      breakdown: {
        deepWiki: costs.deepWiki,
        llmProviders: costs.llmProviders,
        infrastructure: costs.infrastructure
      },
      optimizations: [
        {
          action: 'Use lighter models for simple PRs',
          potentialSaving: '$500/month',
          implementation: 'Detect PR complexity and route accordingly'
        }
      ]
    };
  }
}
```

## Implementation Guide

### Quick Start (Week 1)
```bash
# 1. Add monitoring dependencies
npm install @opentelemetry/api @opentelemetry/node prom-client winston

# 2. Set up basic logging
export LOG_LEVEL=info
export LOG_FORMAT=json

# 3. Add health checks to all services
# 4. Configure Prometheus metrics endpoint
# 5. Set up Grafana with basic dashboards
```

### Monitoring Stack Setup
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
    ports:
      - "3000:3000"
  
  loki:
    image: grafana/loki
    ports:
      - "3100:3100"
  
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"
```

### Alert Configuration
```yaml
# Critical alerts to set up immediately
alerts:
  - name: HighFailureRate
    condition: rate(analysis_failed) > 0.1  # >10% failure
    severity: critical
    notify: ["pager", "slack"]
  
  - name: DeepWikiDown
    condition: deepwiki_availability < 1
    severity: critical
    notify: ["pager", "slack", "email"]
  
  - name: HighMemoryUsage
    condition: memory_usage_percent > 90
    severity: warning
    notify: ["slack"]
  
  - name: SlowAnalysis
    condition: p95_analysis_time > 300  # >5 minutes
    severity: warning
    notify: ["slack"]
```

## Benefits of This Approach

1. **Immediate Troubleshooting**: Phase 1 gives you logs and errors for debugging
2. **Performance Visibility**: Phase 2 shows where time is spent
3. **Proactive Monitoring**: Alerts before issues impact users
4. **Cost Control**: Track and optimize expenses
5. **Data-Driven Improvements**: Identify what to optimize based on real usage

## Next Steps (Updated December 2025)

### ✅ Completed
1. **DeepWiki Monitoring**: Real-time metrics collection and dashboards
2. **Basic Metrics**: Health checks, disk usage, analysis tracking
3. **Alert System**: Configurable thresholds for disk usage
4. **Authentication**: JWT-based secure access to metrics
5. **Documentation**: Comprehensive monitoring guides
6. **Fix Cost Tracking**: Corgea vs AI-fixer cost comparison (Session 63)
7. **Multi-user Infrastructure**: Usage tracking, batching, caching, rate limiting
8. **Intelligent Routing**: Auto-select cheaper fix source based on real data
9. **Manual/Automatic Mode**: Routing mode switch for data collection phase
10. **Dynamic Model Cost**: AI-fixer cost from Supabase (no hardcoded models)
11. **Routing Decision Logging**: Track all routing decisions for analysis

### 🔄 In Progress
1. **E2E Testing with Cost Collection**: Run full V9 pipeline to collect cost data
2. **Corgea Fix Flow**: Complete scan polling and fix retrieval implementation

### 📋 Still Needed
1. **Enhanced Error Tracking**: Integrate Sentry for detailed error aggregation
2. **Distributed Tracing**: OpenTelemetry implementation for request tracing
3. **Log Aggregation**: Centralized logging with Elasticsearch/Loki
4. **Advanced Alerts**: Anomaly detection, predictive alerts
5. **Performance Optimization**: Automated insights and recommendations
6. **SLO/SLA Monitoring**: Service level objective tracking
7. **Cost Dashboard UI**: Visual dashboard for cost comparison metrics

### Immediate Priorities (Current Session)
1. **E2E Test All Tools**: Run V9 pipeline with all available scanner tools
2. **Collect Cost Data**: Log fix costs from both AI-fixer and Corgea
3. **Analyze Routing Decisions**: Review `fix_routing_decisions` table
4. **Determine Corgea Tier**: Based on fix volume, select optimal plan

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/two-branch/tools/cloud-api/fix-cost-manager.ts` | Cost tracking, routing mode, decisions |
| `src/two-branch/tools/cloud-api/intelligent-fix-router.ts` | Smart fix source selection |
| `src/two-branch/tools/cloud-api/corgea-usage-tracker.ts` | Per-user usage tracking |
| `src/two-branch/tools/cloud-api/corgea-fix-cache.ts` | Fix caching (7-day TTL) |
| `src/two-branch/tools/cloud-api/corgea-request-queue.ts` | Rate-limited queue |
| `src/two-branch/tools/cloud-api/corgea-analytics.ts` | Dashboard and alerts |
| `src/standard/monitoring/services/cost-tracker.service.ts` | Model pricing database |
| `src/standard/monitoring/services/model-usage-analytics.ts` | Usage optimization |
| `src/infrastructure/supabase/migrations/20251220_corgea_cost_tracking.sql` | Cost tables schema |
| `src/infrastructure/supabase/migrations/20251220_fix_routing_config.sql` | Routing mode schema |
| `tests/integration/test-routing-mode.ts` | CLI for switching routing modes |
| `tests/integration/update-ai-fixer-cost.ts` | Update AI-fixer cost from model config |
| `tests/integration/verify-cost-tables.ts` | Verify Supabase tables exist |

## Supabase Tables Reference

| Table | Purpose |
|-------|---------|
| `corgea_subscription` | Current plan, monthly cost, fixes used, effective cost |
| `corgea_usage_log` | Individual fix requests, triggers cost update |
| `fix_routing_config` | Manual/automatic mode, preferred source |
| `fix_routing_decisions` | Log of all routing decisions for analysis |
| `ai_fixer_research` | AI-fixer avg cost from quarterly research |
| `model_configurations` | Current AI models per role/language |
| `fix_cost_comparison` | View: real-time cost comparison |

This updated plan reflects progress through December 2025, with comprehensive fix cost monitoring and routing mode control now in place.
