/**
 * Transaction-aware agent wrapper that integrates with end-to-end monitoring
 * Automatically tracks all agent operations, tool calls, and data flows
 */

import { EndToEndTransactionMonitor } from './end-to-end-transaction-monitor';
import { UnifiedMonitoringService } from '../standard/monitoring/services/unified-monitoring.service';
import { BaseMultiToolAgent } from '../two-branch/agents/base-multi-tool-agent';

export interface TransactionContext {
  transactionId: string;
  parentSpanId?: string;
  agentName: string;
  operation: string;
}

export class TransactionAwareAgent<T extends BaseMultiToolAgent = BaseMultiToolAgent> {
  private transactionMonitor: EndToEndTransactionMonitor;
  private unifiedMonitoring: UnifiedMonitoringService;
  private activeContext: TransactionContext | null = null;

  constructor(
    private agent: T,
    private agentName: string,
    transactionMonitor?: EndToEndTransactionMonitor,
    unifiedMonitoring?: UnifiedMonitoringService
  ) {
    this.transactionMonitor = transactionMonitor || EndToEndTransactionMonitor.getInstance();
    this.unifiedMonitoring = unifiedMonitoring || UnifiedMonitoringService.getInstance();
    this.wrapAgentMethods();
  }

  /**
   * Set the current transaction context
   */
  setTransactionContext(context: TransactionContext): void {
    this.activeContext = context;
  }

  /**
   * Clear the transaction context
   */
  clearTransactionContext(): void {
    this.activeContext = null;
  }

  /**
   * Wrap all agent methods with monitoring
   */
  private wrapAgentMethods(): void {
    // Wrap analyzeBranch method
    if ('analyzeBranch' in this.agent) {
      const original = (this.agent as any).analyzeBranch.bind(this.agent);
      (this.agent as any).analyzeBranch = async (branch: string, files: any[]) => {
        return this.wrapMethod('analyzeBranch', original, { branch, fileCount: files.length });
      };
    }

    // Wrap analyze method
    if ('analyze' in this.agent) {
      const original = (this.agent as any).analyze.bind(this.agent);
      (this.agent as any).analyze = async (...args: any[]) => {
        return this.wrapMethod('analyze', original, { args });
      };
    }

    // Wrap executeTools method
    if ('executeTools' in this.agent) {
      const original = (this.agent as any).executeTools.bind(this.agent);
      (this.agent as any).executeTools = async (files: any[]) => {
        return this.wrapToolExecution(original, files);
      };
    }
  }

  /**
   * Generic method wrapper with monitoring
   */
  private async wrapMethod(
    methodName: string,
    originalMethod: Function,
    metadata: any
  ): Promise<any> {
    const spanName = `${this.agentName}.${methodName}`;
    let span: any;

    if (this.activeContext) {
      span = this.transactionMonitor.startSpan(
        this.activeContext.transactionId,
        spanName,
        'agent-operation',
        this.activeContext.parentSpanId
      );

      // Track data flow into agent
      this.transactionMonitor.trackDataFlow(
        this.activeContext.transactionId,
        'orchestrator',
        this.agentName,
        metadata,
        JSON.stringify(metadata).length
      );
    }

    // Start unified monitoring
    const monitoringId = this.unifiedMonitoring.startPerformance(spanName);

    try {
      // Execute original method
      const result = await originalMethod(...Object.values(metadata));

      // Track successful execution
      if (this.activeContext && span) {
        // Track data flow from agent
        this.transactionMonitor.trackDataFlow(
          this.activeContext.transactionId,
          this.agentName,
          'orchestrator',
          { resultSize: JSON.stringify(result).length },
          JSON.stringify(result).length
        );

        // Update metrics
        this.transactionMonitor.updateMetrics(this.activeContext.transactionId, {
          agentInvocations: 1
        });

        this.transactionMonitor.endSpan(
          this.activeContext.transactionId,
          span.id,
          'success'
        );
      }

      this.unifiedMonitoring.endPerformance(monitoringId, true);
      return result;
    } catch (error) {
      // Track error
      if (this.activeContext && span) {
        this.transactionMonitor.trackError(
          this.activeContext.transactionId,
          error as Error,
          { agent: this.agentName, method: methodName }
        );
        this.transactionMonitor.endSpan(
          this.activeContext.transactionId,
          span.id,
          'error',
          error
        );
      }

      this.unifiedMonitoring.endPerformance(monitoringId, false);
      throw error;
    }
  }

  /**
   * Wrap tool execution with detailed tracking
   */
  private async wrapToolExecution(
    originalMethod: Function,
    files: any[]
  ): Promise<any> {
    const spanName = `${this.agentName}.executeTools`;
    let span: any;

    if (this.activeContext) {
      span = this.transactionMonitor.startSpan(
        this.activeContext.transactionId,
        spanName,
        'tool-execution',
        this.activeContext.parentSpanId
      );
    }

    const monitoringId = this.unifiedMonitoring.startPerformance(spanName);

    try {
      // Track individual tool calls
      const toolResults: any[] = [];
      const tools = (this.agent as any).tools || [];

      for (const tool of tools) {
        const toolSpanName = `${this.agentName}.tool.${tool.name || tool.constructor.name}`;
        let toolSpan: any;

        if (this.activeContext) {
          toolSpan = this.transactionMonitor.startSpan(
            this.activeContext.transactionId,
            toolSpanName,
            'mcp-tool',
            span?.id
          );

          // Track MCP tool call
          this.transactionMonitor.updateMetrics(this.activeContext.transactionId, {
            mcpToolCalls: 1
          });
        }

        const toolMonitoringId = this.unifiedMonitoring.startPerformance(toolSpanName);

        try {
          // Execute tool
          const toolResult = await tool.execute(files);
          toolResults.push(toolResult);

          // Track tool cost if applicable
          const toolCost = this.getToolCost(tool.name);
          if (toolCost > 0) {
            this.unifiedMonitoring.trackCost({
              timestamp: Date.now(),
              service: tool.name as any,
              operation: 'execute',
              cost: toolCost,
              metadata: { agent: this.agentName }
            });
          }

          if (this.activeContext && toolSpan) {
            this.transactionMonitor.endSpan(
              this.activeContext.transactionId,
              toolSpan.id,
              'success'
            );
          }

          this.unifiedMonitoring.endPerformance(toolMonitoringId, true);
        } catch (toolError) {
          if (this.activeContext && toolSpan) {
            this.transactionMonitor.endSpan(
              this.activeContext.transactionId,
              toolSpan.id,
              'error',
              toolError
            );
          }

          this.unifiedMonitoring.endPerformance(toolMonitoringId, false);
          // Continue with other tools even if one fails
          console.error(`Tool ${tool.name} failed:`, toolError);
        }
      }

      if (this.activeContext && span) {
        this.transactionMonitor.endSpan(
          this.activeContext.transactionId,
          span.id,
          'success'
        );
      }

      this.unifiedMonitoring.endPerformance(monitoringId, true);
      return toolResults;
    } catch (error) {
      if (this.activeContext && span) {
        this.transactionMonitor.endSpan(
          this.activeContext.transactionId,
          span.id,
          'error',
          error
        );
      }

      this.unifiedMonitoring.endPerformance(monitoringId, false);
      throw error;
    }
  }

  /**
   * Get tool cost for tracking
   */
  private getToolCost(toolName: string): number {
    const costMap: Record<string, number> = {
      'snyk': 0.01,
      'sonarqube': 0.005,
      'veracode': 0.02,
      'checkmarx': 0.015,
      'semgrep': 0.003,
      'codeql': 0.008,
      'trivy': 0.002
    };

    return costMap[toolName.toLowerCase()] || 0;
  }

  /**
   * Track inter-agent communication
   */
  trackAgentCommunication(
    targetAgent: string,
    messageType: string,
    payload: any
  ): void {
    if (this.activeContext) {
      this.transactionMonitor.trackAgentCommunication(
        this.activeContext.transactionId,
        this.agentName,
        targetAgent,
        messageType,
        payload
      );
    }
  }

  /**
   * Get the wrapped agent instance
   */
  getAgent(): T {
    return this.agent;
  }

  /**
   * Get agent monitoring metrics
   */
  getMetrics(): any {
    return {
      agent: this.agentName,
      performanceMetrics: this.unifiedMonitoring.getPerformanceMetrics(),
      memoryMetrics: this.unifiedMonitoring.getMemoryMetrics(),
      costMetrics: this.unifiedMonitoring.getCostMetrics()
    };
  }
}