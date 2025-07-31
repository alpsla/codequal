// DeepWiki analysis result types
export interface DeepWikiAnalysisResult {
  issues: Array<{
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    location?: { file: string; line: number };
    impact?: string;
    recommendation?: string;
    type?: string;
    codeSnippet?: string;
    language?: string;
    fixExample?: string;
  }>;
  recommendations: Array<{
    id: string;
    category: string;
    priority: string;
    title: string;
    description: string;
    impact: string;
    effort: string;
    steps?: string[];
  }>;
  scores: {
    overall: number;
    security: number;
    performance: number;
    maintainability: number;
    testing?: number;
  } | null;
  metadata?: {
    patterns?: string[];
    analysisTime?: number;
    modelUsed?: string;
    filesAnalyzed?: number;
    linesOfCode?: number;
    [key: string]: any;
  };
}