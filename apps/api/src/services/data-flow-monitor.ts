import { createLogger } from '@codequal/core/utils';
import { EventEmitter } from 'events';

export interface DataFlowStep {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  data?: any;
  error?: Error;
  metadata?: Record<string, any>;
}

export interface DataFlowSession {
  sessionId: string;
  repositoryUrl: string;
  prNumber?: number;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  steps: DataFlowStep[];
  status: 'active' | 'completed' | 'failed';
  error?: Error;
  summary?: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    bottlenecks: string[];
    warnings: string[];
  };
}

export class DataFlowMonitor extends EventEmitter {
  private static instance: DataFlowMonitor;
  private logger = createLogger('DataFlowMonitor');
  private sessions = new Map<string, DataFlowSession>();
  private activeSteps = new Map<string, DataFlowStep>();
  private completedSessions: DataFlowSession[] = [];

  private constructor() {
    super();
    this.setupCleanup();
  }

  static getInstance(): DataFlowMonitor {
    if (!DataFlowMonitor.instance) {
      DataFlowMonitor.instance = new DataFlowMonitor();
    }
    return DataFlowMonitor.instance;
  }

  /**
   * Start a new monitoring session
   */
  startSession(sessionId: string, repositoryUrl: string, prNumber?: number): DataFlowSession {
    const session: DataFlowSession = {
      sessionId,
      repositoryUrl,
      prNumber,
      startTime: Date.now(),
      steps: [],
      status: 'active'
    };

    this.sessions.set(sessionId, session);
    this.logger.info('🚀 Data flow session started', {
      sessionId,
      repositoryUrl,
      prNumber
    });

    this.emit('session:start', session);
    return session;
  }

  /**
   * Start a new step in the data flow
   */
  startStep(sessionId: string, stepName: string, metadata?: Record<string, any>): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const stepId = `${sessionId}-${stepName}-${Date.now()}`;
    const step: DataFlowStep = {
      id: stepId,
      name: stepName,
      startTime: Date.now(),
      status: 'in_progress',
      metadata
    };

    session.steps.push(step);
    this.activeSteps.set(stepId, step);

    this.logger.info(`📍 Step started: ${stepName}`, {
      sessionId,
      stepId,
      metadata
    });

    this.emit('step:start', { session, step });
    return stepId;
  }

  /**
   * Complete a step with data
   */
  completeStep(stepId: string, data?: any): void {
    const step = this.activeSteps.get(stepId);
    if (!step) {
      this.logger.warn(`Step ${stepId} not found`);
      return;
    }

    step.endTime = Date.now();
    step.duration = step.endTime - step.startTime;
    step.status = 'completed';
    step.data = data;

    this.activeSteps.delete(stepId);

    // Log slow steps
    if (step.duration > 5000) {
      this.logger.warn(`⚠️ Slow step detected: ${step.name}`, {
        duration: `${step.duration}ms`,
        threshold: '5000ms'
      });
    }

    this.logger.info(`✅ Step completed: ${step.name}`, {
      stepId,
      duration: `${step.duration}ms`,
      dataSize: data ? JSON.stringify(data).length : 0
    });

    this.emit('step:complete', step);
  }

  /**
   * Fail a step with error
   */
  failStep(stepId: string, error: Error): void {
    const step = this.activeSteps.get(stepId);
    if (!step) {
      this.logger.warn(`Step ${stepId} not found`);
      return;
    }

    step.endTime = Date.now();
    step.duration = step.endTime - step.startTime;
    step.status = 'failed';
    step.error = error;

    this.activeSteps.delete(stepId);

    this.logger.error(`❌ Step failed: ${step.name}`, {
      stepId,
      duration: `${step.duration}ms`,
      error: error.message,
      stack: error.stack
    });

    this.emit('step:fail', step);
  }

  /**
   * Fail a session with error
   */
  failSession(sessionId: string, error: Error): DataFlowSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Session ${sessionId} not found`);
      return;
    }

    session.endTime = Date.now();
    session.totalDuration = session.endTime - session.startTime;
    session.status = 'failed';
    session.error = error;

    this.sessions.delete(sessionId);
    this.completedSessions.push(session);

    this.logger.error(`❌ Session failed: ${sessionId}`, {
      repositoryUrl: session.repositoryUrl,
      duration: `${session.totalDuration}ms`,
      error: error.message,
      completedSteps: session.steps.filter(s => s.status === 'completed').length,
      failedSteps: session.steps.filter(s => s.status === 'failed').length
    });

    this.emit('session:fail', session);
    return session;
  }

  /**
   * Complete a session
   */
  completeSession(sessionId: string): DataFlowSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Session ${sessionId} not found`);
      return;
    }

    session.endTime = Date.now();
    session.totalDuration = session.endTime - session.startTime;
    session.status = 'completed';

    // Generate summary
    const completedSteps = session.steps.filter(s => s.status === 'completed').length;
    const failedSteps = session.steps.filter(s => s.status === 'failed').length;
    const bottlenecks = session.steps
      .filter(s => s.duration && s.duration > 3000)
      .map(s => `${s.name} (${s.duration}ms)`);
    
    const warnings: string[] = [];

    // Check for missing DeepWiki data
    const deepWikiStep = session.steps.find(s => s.name.includes('DeepWiki'));
    if (deepWikiStep?.data?.empty) {
      warnings.push('DeepWiki data not found - repository may need analysis');
    }

    // Check for agent failures
    const agentSteps = session.steps.filter(s => s.name.includes('agent'));
    const failedAgents = agentSteps.filter(s => s.status === 'failed');
    if (failedAgents.length > 0) {
      warnings.push(`${failedAgents.length} agents failed during analysis`);
    }

    session.summary = {
      totalSteps: session.steps.length,
      completedSteps,
      failedSteps,
      bottlenecks,
      warnings
    };

    this.logger.info('🏁 Session completed', {
      sessionId,
      duration: `${session.totalDuration}ms`,
      summary: session.summary
    });

    this.emit('session:complete', session);
    return session;
  }

  /**
   * Get session details
   */
  getSession(sessionId: string): DataFlowSession | undefined {
    return this.sessions.get(sessionId) || 
           this.completedSessions.find(s => s.sessionId === sessionId);
  }
  
  /**
   * Get session by step ID
   */
  getSessionByStepId(stepId: string): DataFlowSession | undefined {
    // Check active sessions
    for (const session of this.sessions.values()) {
      if (session.steps.find(s => s.id === stepId)) {
        return session;
      }
    }
    
    // Check completed sessions
    for (const session of this.completedSessions) {
      if (session.steps.find(s => s.id === stepId)) {
        return session;
      }
    }
    
    return undefined;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): DataFlowSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(sessionId: string): any {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const stepMetrics = session.steps.map(step => ({
      name: step.name,
      duration: step.duration || 0,
      status: step.status,
      hasError: !!step.error
    }));

    const avgDuration = stepMetrics.reduce((sum, s) => sum + s.duration, 0) / stepMetrics.length;
    const slowestStep = stepMetrics.reduce((max, s) => s.duration > max.duration ? s : max);

    return {
      sessionId,
      totalDuration: session.totalDuration || Date.now() - session.startTime,
      stepCount: session.steps.length,
      avgStepDuration: avgDuration,
      slowestStep,
      errorRate: stepMetrics.filter(s => s.hasError).length / stepMetrics.length,
      stepMetrics
    };
  }

  /**
   * Generate data flow visualization
   */
  generateFlowVisualization(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) return 'Session not found';

    let flow = `\n📊 Data Flow Visualization for ${session.repositoryUrl}\n`;
    flow += `Session ID: ${sessionId}\n`;
    flow += `Duration: ${session.totalDuration || Date.now() - session.startTime}ms\n`;
    flow += `\n`;

    session.steps.forEach((step, idx) => {
      const icon = step.status === 'completed' ? '✅' : 
                   step.status === 'failed' ? '❌' : 
                   step.status === 'in_progress' ? '🔄' : '⏳';
      
      const duration = step.duration ? ` (${step.duration}ms)` : '';
      const error = step.error ? ` - ERROR: ${step.error.message}` : '';
      
      flow += `${idx + 1}. ${icon} ${step.name}${duration}${error}\n`;
      
      if (step.metadata) {
        Object.entries(step.metadata).forEach(([key, value]) => {
          flow += `   └─ ${key}: ${JSON.stringify(value)}\n`;
        });
      }
    });

    if (session.summary) {
      flow += `\n📈 Summary:\n`;
      flow += `   Total Steps: ${session.summary.totalSteps}\n`;
      flow += `   Completed: ${session.summary.completedSteps}\n`;
      flow += `   Failed: ${session.summary.failedSteps}\n`;
      
      if (session.summary.bottlenecks.length > 0) {
        flow += `   ⚠️ Bottlenecks:\n`;
        session.summary.bottlenecks.forEach(b => {
          flow += `      - ${b}\n`;
        });
      }
      
      if (session.summary.warnings.length > 0) {
        flow += `   ⚠️ Warnings:\n`;
        session.summary.warnings.forEach(w => {
          flow += `      - ${w}\n`;
        });
      }
    }

    return flow;
  }

  /**
   * Clean up old sessions
   */
  private setupCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);

      for (const [sessionId, session] of this.sessions) {
        if (session.startTime < oneHourAgo && session.status !== 'active') {
          this.sessions.delete(sessionId);
          this.logger.debug(`Cleaned up old session: ${sessionId}`);
        }
      }
    }, 10 * 60 * 1000); // Clean up every 10 minutes
  }

  /**
   * Export session data for analysis
   */
  exportSession(sessionId: string): any {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      ...session,
      metrics: this.getSessionMetrics(sessionId),
      visualization: this.generateFlowVisualization(sessionId)
    };
  }
}

// Export singleton instance
export const dataFlowMonitor = DataFlowMonitor.getInstance();