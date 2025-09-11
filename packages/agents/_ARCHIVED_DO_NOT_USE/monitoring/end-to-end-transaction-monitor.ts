/**
 * End-to-End Transaction Monitoring System
 * 
 * Tracks the complete data flow chain from MCP tools through agents to final report
 * Provides distributed tracing, performance monitoring, and cost tracking across all layers
 */

import { UnifiedMonitoringService } from '../standard/monitoring/services/unified-monitoring.service';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface TransactionSpan {
  id: string;
  transactionId: string;
  parentId?: string;
  name: string;
  layer: 'mcp' | 'tool' | 'agent' | 'comparison' | 'orchestrator' | 'report' | 'storage';
  component: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'running' | 'success' | 'failed' | 'timeout';
  metadata?: Record<string, any>;
  children: TransactionSpan[];
  error?: string;
  cost?: number;
  memoryUsed?: number;
  dataSize?: number;
}

export interface Transaction {
  id: string;
  name: string;
  type: 'pr-analysis' | 'repository-scan' | 'two-branch-compare' | 'single-analysis';
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'running' | 'success' | 'failed' | 'partial';
  rootSpan: TransactionSpan;
  totalSpans: number;
  totalCost: number;
  metadata: {
    repositoryUrl?: string;
    prNumber?: string;
    mainBranch?: string;
    featureBranch?: string;
    language?: string;
    filesAnalyzed?: number;
    issuesFound?: number;
    userId?: string;
    sessionId?: string;
  };
  metrics: {
    mcpToolCalls: number;
    agentInvocations: number;
    apiCalls: number;
    cacheHits: number;
    cacheMisses: number;
    totalDataTransferred: number;
    peakMemoryUsage: number;
    cpuTime: number;
  };
}

export interface DataFlowNode {
  id: string;
  type: 'source' | 'processor' | 'transformer' | 'sink';
  name: string;
  layer: string;
  dataIn?: any;
  dataOut?: any;
  transformations?: string[];
  timestamp: number;
}

export class EndToEndTransactionMonitor extends EventEmitter {
  private static instance: EndToEndTransactionMonitor;
  private transactions: Map<string, Transaction> = new Map();
  private activeSpans: Map<string, TransactionSpan> = new Map();
  private monitoring: UnifiedMonitoringService;
  private dataFlow: Map<string, DataFlowNode[]> = new Map();
  
  // Layer-specific metrics
  private layerMetrics = {
    mcp: { calls: 0, errors: 0, totalTime: 0, avgTime: 0 },
    tool: { calls: 0, errors: 0, totalTime: 0, avgTime: 0 },
    agent: { calls: 0, errors: 0, totalTime: 0, avgTime: 0 },
    comparison: { calls: 0, errors: 0, totalTime: 0, avgTime: 0 },
    orchestrator: { calls: 0, errors: 0, totalTime: 0, avgTime: 0 },
    report: { calls: 0, errors: 0, totalTime: 0, avgTime: 0 },
    storage: { calls: 0, errors: 0, totalTime: 0, avgTime: 0 }
  };

  private constructor() {
    super();
    this.monitoring = UnifiedMonitoringService.getInstance();
    this.startMetricsCollection();
  }

  public static getInstance(): EndToEndTransactionMonitor {
    if (!EndToEndTransactionMonitor.instance) {
      EndToEndTransactionMonitor.instance = new EndToEndTransactionMonitor();
    }
    return EndToEndTransactionMonitor.instance;
  }

  /**
   * Start a new transaction (top-level operation)
   */
  public startTransaction(
    name: string,
    type: Transaction['type'],
    metadata?: Transaction['metadata']
  ): string {
    const transactionId = uuidv4();
    
    const rootSpan: TransactionSpan = {
      id: uuidv4(),
      transactionId,
      name,
      layer: 'orchestrator',
      component: 'root',
      startTime: Date.now(),
      status: 'running',
      children: []
    };
    
    const transaction: Transaction = {
      id: transactionId,
      name,
      type,
      startTime: Date.now(),
      status: 'running',
      rootSpan,
      totalSpans: 1,
      totalCost: 0,
      metadata: metadata || {},
      metrics: {
        mcpToolCalls: 0,
        agentInvocations: 0,
        apiCalls: 0,
        cacheHits: 0,
        cacheMisses: 0,
        totalDataTransferred: 0,
        peakMemoryUsage: 0,
        cpuTime: 0
      }
    };
    
    this.transactions.set(transactionId, transaction);
    this.activeSpans.set(rootSpan.id, rootSpan);
    
    // Initialize data flow tracking
    this.dataFlow.set(transactionId, []);
    
    // Emit transaction start event
    this.emit('transaction:start', transaction);
    
    // Also track in UnifiedMonitoringService
    this.monitoring.startAnalysis(
      metadata?.repositoryUrl || name,
      metadata?.prNumber,
      metadata?.mainBranch
    );
    
    return transactionId;
  }

  /**
   * Start a span within a transaction
   */
  public startSpan(
    transactionId: string,
    name: string,
    layer: TransactionSpan['layer'],
    component: string,
    parentSpanId?: string,
    metadata?: Record<string, any>
  ): string {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    
    const spanId = uuidv4();
    const span: TransactionSpan = {
      id: spanId,
      transactionId,
      parentId: parentSpanId,
      name,
      layer,
      component,
      startTime: Date.now(),
      status: 'running',
      children: [],
      metadata
    };
    
    // Add to parent's children if parent exists
    if (parentSpanId) {
      const parentSpan = this.activeSpans.get(parentSpanId);
      if (parentSpan) {
        parentSpan.children.push(span);
      }
    } else {
      // Add to root span if no parent
      transaction.rootSpan.children.push(span);
    }
    
    this.activeSpans.set(spanId, span);
    transaction.totalSpans++;
    
    // Track layer metrics
    this.layerMetrics[layer].calls++;
    
    // Track specific metrics based on layer
    switch (layer) {
      case 'mcp':
        transaction.metrics.mcpToolCalls++;
        break;
      case 'agent':
        transaction.metrics.agentInvocations++;
        break;
    }
    
    this.emit('span:start', { transactionId, span });
    
    // Track in UnifiedMonitoringService
    this.monitoring.startPerformance(`${layer}.${component}.${name}`);
    
    return spanId;
  }

  /**
   * Complete a span
   */
  public endSpan(
    spanId: string,
    status: 'success' | 'failed' | 'timeout',
    result?: {
      error?: string;
      cost?: number;
      dataSize?: number;
      cacheHit?: boolean;
      metadata?: Record<string, any>;
    }
  ): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      console.warn(`Span ${spanId} not found`);
      return;
    }
    
    const transaction = this.transactions.get(span.transactionId);
    if (!transaction) {
      return;
    }
    
    // Update span
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
    
    if (result) {
      span.error = result.error;
      span.cost = result.cost;
      span.dataSize = result.dataSize;
      if (result.metadata) {
        span.metadata = { ...span.metadata, ...result.metadata };
      }
      
      // Update transaction metrics
      if (result.cost) {
        transaction.totalCost += result.cost;
      }
      if (result.cacheHit !== undefined) {
        if (result.cacheHit) {
          transaction.metrics.cacheHits++;
        } else {
          transaction.metrics.cacheMisses++;
        }
      }
      if (result.dataSize) {
        transaction.metrics.totalDataTransferred += result.dataSize;
      }
    }
    
    // Update layer metrics
    this.layerMetrics[span.layer].totalTime += span.duration;
    if (status === 'failed') {
      this.layerMetrics[span.layer].errors++;
    }
    this.layerMetrics[span.layer].avgTime = 
      this.layerMetrics[span.layer].totalTime / this.layerMetrics[span.layer].calls;
    
    // Track memory usage
    const memoryUsage = process.memoryUsage();
    span.memoryUsed = memoryUsage.heapUsed;
    if (memoryUsage.heapUsed > transaction.metrics.peakMemoryUsage) {
      transaction.metrics.peakMemoryUsage = memoryUsage.heapUsed;
    }
    
    this.emit('span:end', { transactionId: span.transactionId, span });
    
    // Track in UnifiedMonitoringService
    this.monitoring.endPerformance(
      `${span.layer}.${span.component}.${span.name}`,
      status === 'success',
      span.error
    );
    
    // Remove from active spans
    this.activeSpans.delete(spanId);
  }

  /**
   * Track data flow through the system
   */
  public trackDataFlow(
    transactionId: string,
    node: {
      type: DataFlowNode['type'];
      name: string;
      layer: string;
      dataIn?: any;
      dataOut?: any;
      transformations?: string[];
    }
  ): void {
    const dataFlowNode: DataFlowNode = {
      id: uuidv4(),
      timestamp: Date.now(),
      ...node
    };
    
    const flow = this.dataFlow.get(transactionId);
    if (flow) {
      flow.push(dataFlowNode);
      
      // Track data size
      const transaction = this.transactions.get(transactionId);
      if (transaction && node.dataOut) {
        const dataSize = JSON.stringify(node.dataOut).length;
        transaction.metrics.totalDataTransferred += dataSize;
      }
    }
    
    this.emit('dataflow:node', { transactionId, node: dataFlowNode });
  }

  /**
   * Track inter-agent communication
   */
  public trackAgentCommunication(
    transactionId: string,
    fromAgent: string,
    toAgent: string,
    data: any,
    metadata?: Record<string, any>
  ): void {
    const commNode: DataFlowNode = {
      id: uuidv4(),
      type: 'transformer',
      name: `${fromAgent} -> ${toAgent}`,
      layer: 'agent',
      dataIn: { from: fromAgent },
      dataOut: { to: toAgent, data },
      transformations: ['agent-communication'],
      timestamp: Date.now()
    };
    
    const flow = this.dataFlow.get(transactionId);
    if (flow) {
      flow.push(commNode);
    }
    
    this.emit('agent:communication', {
      transactionId,
      fromAgent,
      toAgent,
      dataSize: JSON.stringify(data).length,
      metadata
    });
  }

  /**
   * Complete a transaction
   */
  public endTransaction(
    transactionId: string,
    status: 'success' | 'failed' | 'partial',
    result?: {
      issuesFound?: number;
      filesAnalyzed?: number;
      error?: string;
    }
  ): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      console.warn(`Transaction ${transactionId} not found`);
      return;
    }
    
    // Complete root span
    if (transaction.rootSpan.status === 'running') {
      transaction.rootSpan.endTime = Date.now();
      transaction.rootSpan.duration = transaction.rootSpan.endTime - transaction.rootSpan.startTime;
      transaction.rootSpan.status = status === 'success' ? 'success' : 'failed';
    }
    
    // Update transaction
    transaction.endTime = Date.now();
    transaction.duration = transaction.endTime - transaction.startTime;
    transaction.status = status;
    
    if (result) {
      if (result.issuesFound !== undefined) {
        transaction.metadata.issuesFound = result.issuesFound;
      }
      if (result.filesAnalyzed !== undefined) {
        transaction.metadata.filesAnalyzed = result.filesAnalyzed;
      }
    }
    
    // Calculate CPU time
    const cpuUsage = process.cpuUsage();
    transaction.metrics.cpuTime = (cpuUsage.user + cpuUsage.system) / 1000; // Convert to ms
    
    this.emit('transaction:end', transaction);
    
    // Track in UnifiedMonitoringService
    this.monitoring.endAnalysis(
      transaction.metadata.repositoryUrl || transaction.name,
      status === 'success',
      {
        issuesFound: result?.issuesFound,
        error: result?.error
      }
    );
    
    // Generate transaction report
    this.generateTransactionReport(transaction);
    
    // Clean up active spans for this transaction
    for (const [spanId, span] of this.activeSpans.entries()) {
      if (span.transactionId === transactionId) {
        this.activeSpans.delete(spanId);
      }
    }
  }

  /**
   * Generate a detailed transaction report
   */
  private generateTransactionReport(transaction: Transaction): TransactionReport {
    const dataFlowNodes = this.dataFlow.get(transaction.id) || [];
    
    const report: TransactionReport = {
      transactionId: transaction.id,
      summary: {
        name: transaction.name,
        type: transaction.type,
        status: transaction.status,
        duration: transaction.duration || 0,
        totalCost: transaction.totalCost,
        issuesFound: transaction.metadata.issuesFound || 0,
        filesAnalyzed: transaction.metadata.filesAnalyzed || 0
      },
      metrics: transaction.metrics,
      layerBreakdown: this.calculateLayerBreakdown(transaction.rootSpan),
      criticalPath: this.findCriticalPath(transaction.rootSpan),
      dataFlow: dataFlowNodes,
      bottlenecks: this.identifyBottlenecks(transaction.rootSpan),
      errors: this.collectErrors(transaction.rootSpan),
      recommendations: this.generateRecommendations(transaction)
    };
    
    this.emit('report:generated', report);
    return report;
  }

  /**
   * Calculate time spent in each layer
   */
  private calculateLayerBreakdown(rootSpan: TransactionSpan): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    const processSpan = (span: TransactionSpan) => {
      if (span.duration) {
        breakdown[span.layer] = (breakdown[span.layer] || 0) + span.duration;
      }
      span.children.forEach(processSpan);
    };
    
    processSpan(rootSpan);
    return breakdown;
  }

  /**
   * Find the critical path (longest execution path)
   */
  private findCriticalPath(rootSpan: TransactionSpan): TransactionSpan[] {
    const path: TransactionSpan[] = [];
    
    const findLongestPath = (span: TransactionSpan): number => {
      if (span.children.length === 0) {
        return span.duration || 0;
      }
      
      let maxChildDuration = 0;
      let criticalChild: TransactionSpan | null = null;
      
      for (const child of span.children) {
        const childDuration = findLongestPath(child);
        if (childDuration > maxChildDuration) {
          maxChildDuration = childDuration;
          criticalChild = child;
        }
      }
      
      if (criticalChild) {
        path.push(criticalChild);
      }
      
      return (span.duration || 0) + maxChildDuration;
    };
    
    findLongestPath(rootSpan);
    return [rootSpan, ...path];
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(rootSpan: TransactionSpan): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    const threshold = 1000; // 1 second
    
    const checkSpan = (span: TransactionSpan) => {
      if (span.duration && span.duration > threshold) {
        bottlenecks.push({
          spanId: span.id,
          name: span.name,
          layer: span.layer,
          component: span.component,
          duration: span.duration,
          impact: 'high',
          suggestion: this.getBottleneckSuggestion(span)
        });
      }
      span.children.forEach(checkSpan);
    };
    
    checkSpan(rootSpan);
    return bottlenecks.sort((a, b) => b.duration - a.duration).slice(0, 5);
  }

  /**
   * Get suggestion for bottleneck
   */
  private getBottleneckSuggestion(span: TransactionSpan): string {
    switch (span.layer) {
      case 'mcp':
        return 'Consider caching MCP tool results or using batch operations';
      case 'agent':
        return 'Optimize agent logic or use parallel processing';
      case 'comparison':
        return 'Reduce comparison complexity or implement incremental comparison';
      case 'report':
        return 'Optimize report generation or use streaming';
      default:
        return 'Review implementation for optimization opportunities';
    }
  }

  /**
   * Collect all errors from the transaction
   */
  private collectErrors(rootSpan: TransactionSpan): TransactionError[] {
    const errors: TransactionError[] = [];
    
    const collectFromSpan = (span: TransactionSpan) => {
      if (span.error) {
        errors.push({
          spanId: span.id,
          name: span.name,
          layer: span.layer,
          component: span.component,
          error: span.error,
          timestamp: span.startTime
        });
      }
      span.children.forEach(collectFromSpan);
    };
    
    collectFromSpan(rootSpan);
    return errors;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(transaction: Transaction): string[] {
    const recommendations: string[] = [];
    
    // Check cache hit rate
    const cacheHitRate = transaction.metrics.cacheHits / 
      (transaction.metrics.cacheHits + transaction.metrics.cacheMisses);
    if (cacheHitRate < 0.5) {
      recommendations.push('Low cache hit rate detected. Consider improving caching strategy.');
    }
    
    // Check memory usage
    if (transaction.metrics.peakMemoryUsage > 500 * 1024 * 1024) { // 500MB
      recommendations.push('High memory usage detected. Consider optimizing data structures.');
    }
    
    // Check layer performance
    for (const [layer, metrics] of Object.entries(this.layerMetrics)) {
      if (metrics.errors > 0) {
        recommendations.push(`Errors detected in ${layer} layer. Review error handling.`);
      }
      if (metrics.avgTime > 2000) {
        recommendations.push(`${layer} layer is slow (avg ${metrics.avgTime}ms). Consider optimization.`);
      }
    }
    
    return recommendations;
  }

  /**
   * Get transaction by ID
   */
  public getTransaction(transactionId: string): Transaction | undefined {
    return this.transactions.get(transactionId);
  }

  /**
   * Get all transactions
   */
  public getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values());
  }

  /**
   * Get layer metrics
   */
  public getLayerMetrics(): typeof this.layerMetrics {
    return this.layerMetrics;
  }

  /**
   * Export transaction data for visualization
   */
  public exportForVisualization(transactionId: string): any {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return null;
    
    const dataFlow = this.dataFlow.get(transactionId) || [];
    
    return {
      transaction: {
        id: transaction.id,
        name: transaction.name,
        type: transaction.type,
        duration: transaction.duration,
        status: transaction.status
      },
      spans: this.flattenSpans(transaction.rootSpan),
      dataFlow,
      metrics: transaction.metrics,
      layerMetrics: this.layerMetrics
    };
  }

  /**
   * Flatten span tree for visualization
   */
  private flattenSpans(rootSpan: TransactionSpan): any[] {
    const spans: any[] = [];
    
    const addSpan = (span: TransactionSpan, level = 0) => {
      spans.push({
        id: span.id,
        parentId: span.parentId,
        name: span.name,
        layer: span.layer,
        component: span.component,
        startTime: span.startTime,
        endTime: span.endTime,
        duration: span.duration,
        status: span.status,
        level,
        hasError: !!span.error,
        cost: span.cost
      });
      
      span.children.forEach(child => addSpan(child, level + 1));
    };
    
    addSpan(rootSpan);
    return spans;
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.emit('metrics:snapshot', {
        activeTransactions: this.transactions.size,
        activeSpans: this.activeSpans.size,
        layerMetrics: this.layerMetrics,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      });
    }, 10000); // Every 10 seconds
  }

  /**
   * Clear old transactions (cleanup)
   */
  public clearOldTransactions(olderThanMs = 3600000): void {
    const now = Date.now();
    for (const [id, transaction] of this.transactions.entries()) {
      if (transaction.endTime && (now - transaction.endTime > olderThanMs)) {
        this.transactions.delete(id);
        this.dataFlow.delete(id);
      }
    }
  }
}

// Type definitions
interface TransactionReport {
  transactionId: string;
  summary: {
    name: string;
    type: string;
    status: string;
    duration: number;
    totalCost: number;
    issuesFound: number;
    filesAnalyzed: number;
  };
  metrics: Transaction['metrics'];
  layerBreakdown: Record<string, number>;
  criticalPath: TransactionSpan[];
  dataFlow: DataFlowNode[];
  bottlenecks: Bottleneck[];
  errors: TransactionError[];
  recommendations: string[];
}

interface Bottleneck {
  spanId: string;
  name: string;
  layer: string;
  component: string;
  duration: number;
  impact: 'high' | 'medium' | 'low';
  suggestion: string;
}

interface TransactionError {
  spanId: string;
  name: string;
  layer: string;
  component: string;
  error: string;
  timestamp: number;
}

// Export singleton instance
export const transactionMonitor = EndToEndTransactionMonitor.getInstance();