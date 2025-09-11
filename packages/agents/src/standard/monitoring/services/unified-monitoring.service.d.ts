/**
 * Unified Monitoring Service
 * Consolidates all monitoring functionality into a single service
 * Tracks performance, memory, costs, and analysis metrics
 */
import { EventEmitter } from 'events';
export interface PerformanceMetric {
    operation: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    success: boolean;
    error?: string;
    metadata?: Record<string, any>;
}
export interface MemoryMetric {
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    operation?: string;
}
export interface AnalysisMetric {
    repositoryUrl: string;
    prNumber?: string;
    branch?: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    iterations?: number;
    issuesFound?: number;
    locationsResolved?: number;
    locationsUnresolved?: number;
    cacheHit?: boolean;
    deepWikiCalls?: number;
    aiCalls?: number;
    success?: boolean;
    error?: string;
}
export interface CostMetric {
    timestamp: number;
    service: 'deepwiki' | 'openrouter' | 'redis' | 'supabase';
    operation: string;
    tokens?: number;
    cost?: number;
    model?: string;
    metadata?: Record<string, any>;
}
export interface MonitoringConfig {
    enabled: boolean;
    metricsDir: string;
    flushInterval: number;
    maxMetricsInMemory: number;
    enablePerformance: boolean;
    enableMemory: boolean;
    enableCost: boolean;
    enableAnalysis: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}
export declare class UnifiedMonitoringService extends EventEmitter {
    private static instance;
    private performanceMetrics;
    private memoryMetrics;
    private analysisMetrics;
    private costMetrics;
    private config;
    private flushTimer?;
    private memoryTimer?;
    private constructor();
    static getInstance(config?: Partial<MonitoringConfig>): UnifiedMonitoringService;
    private initialize;
    startOperation(operationId: string, metadata?: Record<string, any>): void;
    endOperation(operationId: string, success?: boolean, error?: string): PerformanceMetric | undefined;
    startPerformanceTracking(name: string, metadata?: Record<string, any>): string;
    endPerformanceTracking(name: string, metadata?: Record<string, any>): void;
    trackPerformance(name: string, duration: number, metadata?: Record<string, any>): void;
    startAnalysis(repositoryUrl: string, prNumber?: string, branch?: string): string;
    updateAnalysis(repositoryUrl: string, updates: Partial<AnalysisMetric>): void;
    endAnalysis(repositoryUrl: string, success: boolean, results?: {
        issuesFound?: number;
        locationsResolved?: number;
        locationsUnresolved?: number;
        iterations?: number;
        error?: string;
    }): void;
    trackCost(service: 'deepwiki' | 'openrouter' | 'redis' | 'supabase', operation: string, details?: {
        tokens?: number;
        cost?: number;
        model?: string;
        metadata?: Record<string, any>;
    }): void;
    private captureMemorySnapshot;
    getAggregatedMetrics(): {
        performance: {
            totalOperations: number;
            averageDuration: number;
            successRate: number;
        };
        analysis: {
            totalAnalyses: number;
            averageDuration: number;
            averageIssuesFound: number;
            averageLocationResolutionRate: number;
            successRate: number;
        };
        cost: {
            totalCost: number;
            byService: Record<string, number>;
            totalTokens: number;
        };
        memory: {
            currentHeapUsed: number;
            averageHeapUsed: number;
            peakHeapUsed: number;
        };
    };
    private flushMetrics;
    private estimateCost;
    generateDashboard(): Promise<string>;
    shutdown(): Promise<void>;
    private log;
}
export declare const monitoring: UnifiedMonitoringService;
