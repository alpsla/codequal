# CodeQual Production Monitoring & Observability Plan
**Last Updated: July 28, 2025**

## Overview

A comprehensive monitoring strategy for CodeQual to track performance, errors, resource usage, and enable efficient troubleshooting. This plan has been significantly updated to reflect the monitoring infrastructure implemented in July 2025.

## Current Status

### ✅ Completed (July 2025)
- DeepWiki monitoring infrastructure with real-time metrics
- Prometheus-format metrics export  
- Grafana dashboard integration
- JWT-authenticated monitoring endpoints
- Public monitoring dashboard with auto-refresh
- Alert system with configurable thresholds
- Service authentication middleware
- Comprehensive monitoring documentation

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
**Status: 60% Complete**  
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

## Next Steps (Updated July 2025)

### ✅ Completed
1. **DeepWiki Monitoring**: Real-time metrics collection and dashboards
2. **Basic Metrics**: Health checks, disk usage, analysis tracking
3. **Alert System**: Configurable thresholds for disk usage
4. **Authentication**: JWT-based secure access to metrics
5. **Documentation**: Comprehensive monitoring guides

### 🔄 In Progress
1. **Enhanced Error Tracking**: Integrate Sentry for detailed error aggregation
2. **Distributed Tracing**: OpenTelemetry implementation for request tracing
3. **Business Metrics**: Cost tracking, usage patterns, ROI metrics

### 📋 Still Needed
1. **Log Aggregation**: Centralized logging with Elasticsearch/Loki
2. **Advanced Alerts**: Anomaly detection, predictive alerts
3. **Performance Optimization**: Automated insights and recommendations
4. **Cost Analytics**: Detailed breakdown and optimization suggestions
5. **SLO/SLA Monitoring**: Service level objective tracking

### Immediate Priorities (Next 2 weeks)
1. **Production Deployment**: Deploy monitoring infrastructure to production
2. **Alert Channels**: Configure Slack/email/PagerDuty integrations
3. **Runbooks**: Create operational runbooks for common alerts
4. **Load Testing**: Validate monitoring under production load

This updated plan reflects the significant progress made in July 2025, with core monitoring infrastructure now in place and focus shifting to advanced observability features.
