/**
 * Unified Progress Tracer Service
 * Bridges DataFlowMonitor (comprehensive internal monitoring) with ProgressTracker (user-facing progress)
 */

import { EventEmitter } from 'events';
import { createLogger } from '@codequal/core/utils';
import { getProgressTracker, ProgressTracker, AnalysisProgress } from '@codequal/agents/services/progress-tracker';
import { dataFlowMonitor, DataFlowMonitor } from './data-flow-monitor';

type AnalysisPhase = keyof AnalysisProgress['phases'];

interface PhaseMapping {
  phase: AnalysisPhase;
  percentage: number;
}

export class UnifiedProgressTracer extends EventEmitter {
  private logger = createLogger('UnifiedProgressTracer');
  private progressTracker: ProgressTracker;
  private dataFlowMonitor: DataFlowMonitor;
  private sessionToAnalysisMap = new Map<string, string>();
  
  constructor() {
    super();
    this.progressTracker = getProgressTracker();
    this.dataFlowMonitor = dataFlowMonitor;
    
    // Set up event bridges
    this.setupEventBridges();
  }
  
  /**
   * Start tracking a PR analysis
   */
  startAnalysis(
    repositoryUrl: string,
    prNumber: number,
    analysisMode: string,
    totalAgents = 5,
    totalTools = 5
  ): { analysisId: string; sessionId: string } {
    // Generate IDs
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionId = `pr-analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Map session to analysis for event bridging
    this.sessionToAnalysisMap.set(sessionId, analysisId);
    
    // Start in both systems
    this.progressTracker.startAnalysis(analysisId, repositoryUrl, prNumber, totalAgents, totalTools);
    this.dataFlowMonitor.startSession(sessionId, repositoryUrl, prNumber);
    
    this.logger.info('Started unified analysis tracking', {
      analysisId,
      sessionId,
      repositoryUrl,
      prNumber
    });
    
    return { analysisId, sessionId };
  }
  
  /**
   * Set up event bridges between DataFlowMonitor and ProgressTracker
   */
  private setupEventBridges(): void {
    // Bridge step events to phase updates
    this.dataFlowMonitor.on('step:start', (data) => {
      const analysisId = this.sessionToAnalysisMap.get(data.session.sessionId);
      if (!analysisId) return;
      
      // Map step names to phases
      const phaseMapping = this.mapStepToPhase(data.step.name);
      if (phaseMapping) {
        this.progressTracker.updatePhase(
          analysisId,
          phaseMapping.phase,
          'in_progress',
          phaseMapping.percentage,
          data.step.name
        );
      }
      
      // Handle agent-specific steps
      if (data.step.name.includes('Agent')) {
        const agentMatch = data.step.name.match(/(\w+) Agent/);
        if (agentMatch) {
          this.progressTracker.updateAgent(
            analysisId,
            agentMatch[1].toLowerCase(),
            'running',
            0
          );
        }
      }
      
      // Handle tool-specific steps
      if (data.step.name.includes('MCP Tool')) {
        this.progressTracker.updatePhase(
          analysisId,
          'toolExecution',
          'in_progress',
          30,
          'Executing MCP tools'
        );
      }
    });
    
    // Bridge step completion
    this.dataFlowMonitor.on('step:complete', (step) => {
      const session = this.dataFlowMonitor.getSessionByStepId(step.id);
      if (!session) return;
      
      const analysisId = this.sessionToAnalysisMap.get(session.sessionId);
      if (!analysisId) return;
      
      // Update phase progress
      const phaseMapping = this.mapStepToPhase(step.name);
      if (phaseMapping) {
        this.progressTracker.updatePhase(
          analysisId,
          phaseMapping.phase,
          'completed',
          100,
          `${step.name} completed`
        );
      }
      
      // Handle agent completion
      if (step.name.includes('Agent') && step.data) {
        const agentMatch = step.name.match(/(\w+) Agent/);
        if (agentMatch) {
          this.progressTracker.updateAgent(
            analysisId,
            agentMatch[1].toLowerCase(),
            'completed',
            100,
            {
              findings: step.data.findings || 0,
              endTime: new Date()
            }
          );
        }
      }
    });
    
    // Bridge session completion
    this.dataFlowMonitor.on('session:complete', (session) => {
      const analysisId = this.sessionToAnalysisMap.get(session.sessionId);
      if (!analysisId) return;
      
      this.progressTracker.completeAnalysis(analysisId, true);
      this.sessionToAnalysisMap.delete(session.sessionId);
    });
    
    // Bridge session failure
    this.dataFlowMonitor.on('session:fail', (session) => {
      const analysisId = this.sessionToAnalysisMap.get(session.sessionId);
      if (!analysisId) return;
      
      this.progressTracker.completeAnalysis(analysisId, false);
      this.sessionToAnalysisMap.delete(session.sessionId);
    });
  }
  
  /**
   * Map DataFlowMonitor step names to ProgressTracker phases
   */
  private mapStepToPhase(stepName: string): PhaseMapping | null {
    const mappings: Record<string, PhaseMapping> = {
      'Extract PR Context': { phase: 'initialization', percentage: 50 },
      'Check Repository Status': { phase: 'initialization', percentage: 100 },
      'Retrieve MCP Tool Results': { phase: 'toolExecution', percentage: 50 },
      'Coordinate Multi-Agent Analysis': { phase: 'agentAnalysis', percentage: 20 },
      'Process Results': { phase: 'resultProcessing', percentage: 50 },
      'Generate Recommendations': { phase: 'resultProcessing', percentage: 80 },
      'Reporter Agent Processing': { phase: 'reportGeneration', percentage: 50 },
      'Store Report': { phase: 'reportGeneration', percentage: 90 }
    };
    
    const mapping = mappings[stepName];
    return mapping || null;
  }
  
  /**
   * Get comprehensive progress data
   */
  getProgress(analysisId: string): {
    userProgress: ReturnType<ProgressTracker['getProgress']>;
    debugProgress: ReturnType<DataFlowMonitor['getSession']>;
    visualization?: string;
  } | null {
    // Get user-facing progress
    const userProgress = this.progressTracker.getProgress(analysisId);
    if (!userProgress) return null;
    
    // Find corresponding session
    let sessionId: string | undefined;
    for (const [sid, aid] of this.sessionToAnalysisMap.entries()) {
      if (aid === analysisId) {
        sessionId = sid;
        break;
      }
    }
    
    // Get debug progress if session exists
    const debugProgress = sessionId ? this.dataFlowMonitor.getSession(sessionId) : undefined;
    const visualization = sessionId ? this.dataFlowMonitor.generateFlowVisualization(sessionId) : undefined;
    
    return {
      userProgress,
      debugProgress,
      visualization
    };
  }
  
  /**
   * Get all active analyses with both progress systems
   */
  getActiveAnalyses(): Array<{
    analysisId: string;
    sessionId?: string;
    repositoryUrl: string;
    prNumber: number;
    progress: number;
    status: string;
  }> {
    const activeAnalyses = this.progressTracker.getActiveAnalyses();
    
    return activeAnalyses.map(analysis => {
      // Find corresponding session
      let sessionId: string | undefined;
      for (const [sid, aid] of this.sessionToAnalysisMap.entries()) {
        if (aid === analysis.analysisId) {
          sessionId = sid;
          break;
        }
      }
      
      return {
        analysisId: analysis.analysisId,
        sessionId,
        repositoryUrl: analysis.repositoryUrl,
        prNumber: analysis.prNumber,
        progress: analysis.overallPercentage,
        status: analysis.overallStatus
      };
    });
  }
  
  /**
   * Clean up old data
   */
  cleanup(maxAgeHours = 24): void {
    // Clean up progress tracker
    this.progressTracker.cleanupOldAnalyses(maxAgeHours * 60 * 60 * 1000);
    
    // Clean up old mappings
    const activeAnalyses = new Set(
      this.progressTracker.getActiveAnalyses().map(a => a.analysisId)
    );
    
    for (const [sessionId, analysisId] of this.sessionToAnalysisMap.entries()) {
      if (!activeAnalyses.has(analysisId)) {
        this.sessionToAnalysisMap.delete(sessionId);
      }
    }
    
    this.logger.info('Cleaned up old analysis data', {
      remainingMappings: this.sessionToAnalysisMap.size
    });
  }
}

// Singleton instance
let unifiedTracer: UnifiedProgressTracer | null = null;

export function getUnifiedProgressTracer(): UnifiedProgressTracer {
  if (!unifiedTracer) {
    unifiedTracer = new UnifiedProgressTracer();
  }
  return unifiedTracer;
}