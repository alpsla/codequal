import { Router, Request, Response } from 'express';
import { activeAnalyses } from './result-orchestrator';

const analysisDebugRoutes = Router();

export interface DebugData {
  analysisId: string;
  timestamp: string;
  stage: string;
  data: any;
}

// In-memory store for debug data (in production, use Redis or similar)
export const analysisDebugData = new Map<string, DebugData[]>();

/**
 * Store debug data for an analysis
 */
export function storeDebugData(analysisId: string, stage: string, data: any) {
  if (!analysisDebugData.has(analysisId)) {
    analysisDebugData.set(analysisId, []);
  }
  
  const debugEntry: DebugData = {
    analysisId,
    timestamp: new Date().toISOString(),
    stage,
    data
  };
  
  analysisDebugData.get(analysisId)!.push(debugEntry);
  
  // Clean up old data (keep last 100 analyses)
  if (analysisDebugData.size > 100) {
    const oldestKey = Array.from(analysisDebugData.keys())[0];
    analysisDebugData.delete(oldestKey);
  }
}

/**
 * GET /v1/analysis/:id/debug
 * Get detailed debug information for an analysis
 */
analysisDebugRoutes.get('/analysis/:id/debug', (req: Request, res: Response) => {
  try {
    const analysisId = req.params.id;
    const analysis = activeAnalyses.get(analysisId);
    
    if (!analysis) {
      return res.status(404).json({ 
        error: 'Analysis not found',
        analysisId 
      });
    }
    
    const debugData = analysisDebugData.get(analysisId) || [];
    const stages = debugData.reduce((acc, entry) => {
      if (!acc[entry.stage]) {
        acc[entry.stage] = [];
      }
      acc[entry.stage].push({
        timestamp: entry.timestamp,
        data: entry.data
      });
      return acc;
    }, {} as Record<string, any[]>);
    
    const response = {
      analysisId,
      status: analysis.status,
      startTime: analysis.startTime,
      debugData: {
        totalEntries: debugData.length,
        stages: Object.keys(stages),
        data: stages
      },
      // Extract specific data points for manual review
      review: {
        deepwikiReport: stages['deepwiki-report']?.[0]?.data,
        prContext: stages['pr-context']?.[0]?.data,
        agentContexts: stages['agent-contexts']?.[0]?.data,
        mcpTools: stages['mcp-tools']?.[0]?.data,
        agentResults: stages['agent-results']?.[0]?.data,
        deduplication: stages['orchestrator-deduplication']?.[0]?.data,
        educationalContent: stages['educational-enhancement']?.[0]?.data,
        finalReport: stages['final-report']?.[0]?.data
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Debug data retrieval error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /v1/analysis/:id/review
 * Get structured data for manual review
 */
analysisDebugRoutes.get('/analysis/:id/review', (req: Request, res: Response) => {
  try {
    const analysisId = req.params.id;
    const analysis = activeAnalyses.get(analysisId);
    
    if (!analysis) {
      return res.status(404).json({ 
        error: 'Analysis not found',
        analysisId 
      });
    }
    
    const debugData = analysisDebugData.get(analysisId) || [];
    const reviewData: any = {
      analysisId,
      status: analysis.status,
      request: analysis.request,
      timeline: []
    };
    
    // Build timeline of events
    debugData.forEach(entry => {
      reviewData.timeline.push({
        timestamp: entry.timestamp,
        stage: entry.stage,
        summary: summarizeStage(entry.stage, entry.data)
      });
    });
    
    // Extract key review points
    debugData.forEach(entry => {
      switch (entry.stage) {
        case 'deepwiki-report':
          reviewData.deepwikiAnalysis = {
            repositoryInsights: entry.data.insights,
            codeStructure: entry.data.structure,
            technologies: entry.data.technologies,
            recommendations: entry.data.recommendations
          };
          break;
          
        case 'pr-context':
          reviewData.prContext = {
            changedFiles: entry.data.changedFiles,
            impactAnalysis: entry.data.impact,
            riskFactors: entry.data.risks,
            diff: entry.data.diff
          };
          break;
          
        case 'agent-contexts':
          reviewData.agentInputs = entry.data;
          break;
          
        case 'mcp-tools':
          reviewData.mcpToolUsage = entry.data;
          break;
          
        case 'agent-results':
          reviewData.agentFindings = entry.data;
          break;
          
        case 'orchestrator-deduplication':
          reviewData.deduplication = {
            original: entry.data.original,
            deduplicated: entry.data.deduplicated,
            removed: entry.data.removed
          };
          break;
          
        case 'educational-enhancement':
          reviewData.educationalContent = entry.data;
          break;
          
        case 'final-report':
          reviewData.finalReport = entry.data;
          break;
      }
    });
    
    res.json(reviewData);
    
  } catch (error) {
    console.error('Review data retrieval error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

function summarizeStage(stage: string, data: any): string {
  switch (stage) {
    case 'deepwiki-report':
      return `Repository analyzed: ${data.repositoryUrl || 'unknown'}`;
    case 'pr-context':
      return `PR #${data.prNumber} - ${data.changedFiles?.length || 0} files changed`;
    case 'agent-contexts':
      return `Contexts prepared for ${Object.keys(data).length} agents`;
    case 'mcp-tools':
      return `MCP tools executed for agents`;
    case 'agent-results':
      return `Agent analysis completed with ${Object.values(data).flat().length} findings`;
    case 'orchestrator-deduplication':
      return `Deduplicated findings: ${data.deduplicated?.length || 0} unique issues`;
    case 'educational-enhancement':
      return `Educational content added for ${data.findings?.length || 0} findings`;
    case 'final-report':
      return `Final report generated`;
    default:
      return `Stage: ${stage}`;
  }
}

export { analysisDebugRoutes };