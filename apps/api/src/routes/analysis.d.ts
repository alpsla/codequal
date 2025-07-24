import '../types/express.d.ts';
export declare const analysisRoutes: import("express-serve-static-core").Router;
export declare function storeAnalysisInHistory(userId: string, analysis: {
  analysisId: string;
  repository: { url: string };
  pr?: {
    number: number;
    title?: string;
    branch?: string;
    [key: string]: unknown;
  };
  analysis: {
    mode: string;
    totalFindings: number;
    processingTime: number;
  };
  completedAt?: Date;
  timestamp?: Date;
  [key: string]: unknown;
}): void;
//# sourceMappingURL=analysis.d.ts.map