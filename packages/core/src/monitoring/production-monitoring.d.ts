import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';
/**
 * Phase 1 Monitoring Implementation Starter
 * Essential monitoring for CodeQual production deployment
 */
export interface LogContext {
    service: string;
    traceId?: string;
    userId?: string;
    repositoryUrl?: string;
    analysisId?: string;
    action: string;
    duration?: number;
    error?: {
        type: string;
        message: string;
        stack?: string;
    };
    metadata?: Record<string, unknown>;
}
declare class ProductionLogger {
    private logger;
    constructor(serviceName: string);
    info(message: string, context?: Partial<LogContext>): void;
    error(message: string, error: Error, context?: Partial<LogContext>): void;
    private isCriticalAction;
    private sendAlert;
}
export declare class MetricsCollector {
    private register;
    analysisStarted: promClient.Counter;
    analysisCompleted: promClient.Counter;
    analysisFailed: promClient.Counter;
    analysisTime: promClient.Histogram;
    activeAnalyses: promClient.Gauge;
    deepWikiLatency: promClient.Histogram;
    vectorDBLatency: promClient.Histogram;
    agentExecutionTime: promClient.Histogram;
    errorRate: promClient.Counter;
    constructor();
    getMetrics(): promClient.Registry;
}
export declare function requestTracing(logger: ProductionLogger): (req: Request, res: Response, next: NextFunction) => void;
export declare class ErrorTracker {
    private logger;
    constructor(logger: ProductionLogger);
    captureException(error: Error, context: Partial<LogContext>): void;
    private categorizeError;
}
export declare function setupHealthChecks(app: any, logger: ProductionLogger): void;
export declare function initializeMonitoring(app: any, serviceName: string): {
    logger: ProductionLogger;
    metrics: MetricsCollector;
    errorTracker: ErrorTracker;
};
export declare const metrics: MetricsCollector;
export {};
