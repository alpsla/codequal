import { dataFlowMonitor } from './data-flow-monitor';

/**
 * Wrapper to add monitoring to any async operation
 */
export async function monitorStep<T>(
  sessionId: string,
  stepName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const stepId = dataFlowMonitor.startStep(sessionId, stepName, metadata);
  
  try {
    const result = await operation();
    
    // Extract meaningful data from result for monitoring
    let stepData: any = {};
    if (result && typeof result === 'object') {
      if ('length' in result) {
        stepData.count = (result as any).length;
      }
      if ('existsInVectorDB' in result) {
        stepData = result;
      }
      if ('findings' in result) {
        stepData.findingsCount = Object.values((result as any).findings || {})
          .reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
      }
    }
    
    dataFlowMonitor.completeStep(stepId, stepData);
    return result;
  } catch (error) {
    dataFlowMonitor.failStep(stepId, error as Error);
    throw error;
  }
}

/**
 * Monitor DeepWiki data retrieval
 */
export function monitorDeepWikiRetrieval(sessionId: string, repositoryUrl: string) {
  return async (operation: () => Promise<any>) => {
    return monitorStep(sessionId, 'Fetch DeepWiki Data', operation, {
      repositoryUrl,
      source: 'VectorDB'
    });
  };
}

/**
 * Monitor agent execution
 */
export function monitorAgentExecution(sessionId: string, agentRole: string) {
  return async (operation: () => Promise<any>) => {
    return monitorStep(sessionId, `Execute ${agentRole} Agent`, operation, {
      agentRole
    });
  };
}

/**
 * Monitor Vector DB operations
 */
export function monitorVectorDBOperation(sessionId: string, operation: string) {
  return async (op: () => Promise<any>) => {
    return monitorStep(sessionId, `VectorDB: ${operation}`, op, {
      database: 'VectorDB',
      operation
    });
  };
}