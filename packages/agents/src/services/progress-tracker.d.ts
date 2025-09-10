/**
 * Progress Tracking Service
 * Provides real-time status updates for PR analysis
 */
import { EventEmitter } from 'events';
export interface ProgressUpdate {
    id: string;
    timestamp: Date;
    type: 'analysis' | 'tool' | 'agent' | 'system';
    phase: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
    percentage: number;
    message: string;
    details?: {
        agentName?: string;
        toolName?: string;
        currentStep?: number;
        totalSteps?: number;
        duration?: number;
        error?: string;
    };
}
export interface AnalysisProgress {
    analysisId: string;
    repositoryUrl: string;
    prNumber: number;
    startTime: Date;
    endTime?: Date;
    overallStatus: 'initializing' | 'analyzing' | 'finalizing' | 'completed' | 'failed';
    overallPercentage: number;
    currentPhase: string;
    phases: {
        initialization: PhaseProgress;
        toolExecution: PhaseProgress;
        agentAnalysis: PhaseProgress;
        resultProcessing: PhaseProgress;
        reportGeneration: PhaseProgress;
    };
    agents: Record<string, AgentProgress>;
    tools: Record<string, ToolProgress>;
    updates: ProgressUpdate[];
    metrics: {
        totalAgents: number;
        completedAgents: number;
        failedAgents: number;
        totalTools: number;
        completedTools: number;
        failedTools: number;
        estimatedTimeRemaining?: number;
    };
}
interface PhaseProgress {
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
    percentage: number;
    startTime?: Date;
    endTime?: Date;
    message?: string;
}
interface AgentProgress {
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    percentage: number;
    startTime?: Date;
    endTime?: Date;
    findings?: number;
    error?: string;
}
interface ToolProgress {
    name: string;
    agentRole: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    percentage: number;
    startTime?: Date;
    endTime?: Date;
    findingsCount?: number;
    error?: string;
}
export declare class ProgressTracker extends EventEmitter {
    private logger;
    private analyses;
    private updateInterval?;
    constructor();
    /**
     * Start tracking a new analysis
     */
    startAnalysis(analysisId: string, repositoryUrl: string, prNumber: number, totalAgents: number, totalTools: number): AnalysisProgress;
    /**
     * Update phase progress
     */
    updatePhase(analysisId: string, phase: keyof AnalysisProgress['phases'], status: PhaseProgress['status'], percentage: number, message?: string): void;
    /**
     * Update agent progress
     */
    updateAgent(analysisId: string, agentName: string, status: AgentProgress['status'], percentage: number, details?: Partial<AgentProgress>): void;
    /**
     * Update tool progress
     */
    updateTool(analysisId: string, toolName: string, agentRole: string, status: ToolProgress['status'], percentage: number, details?: Partial<ToolProgress>): void;
    /**
     * Complete analysis
     */
    completeAnalysis(analysisId: string, success?: boolean): void;
    /**
     * Get analysis progress
     */
    getProgress(analysisId: string): AnalysisProgress | undefined;
    /**
     * Get all active analyses
     */
    getActiveAnalyses(): AnalysisProgress[];
    /**
     * Add progress update
     */
    private addUpdate;
    /**
     * Calculate overall percentage
     */
    private calculateOverallPercentage;
    /**
     * Start update interval for time estimates
     */
    private startUpdateInterval;
    /**
     * Clean up old analyses
     */
    cleanupOldAnalyses(maxAge?: number): void;
    /**
     * Destroy tracker
     */
    destroy(): void;
}
/**
 * Get or create progress tracker instance
 */
export declare function getProgressTracker(): ProgressTracker;
export {};
