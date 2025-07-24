import { dataFlowMonitor } from './data-flow-monitor';

/**
 * Wrapper to add monitoring to any async operation
 */
export async function monitorStep<T>(
  sessionId: string,
  stepName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const stepId = dataFlowMonitor.startStep(sessionId, stepName, metadata);
  
  try {
    const result = await operation();
    
    // Extract meaningful data from result for monitoring
    let stepData: Record<string, unknown> = {};
    if (result && typeof result === 'object') {
      if ('length' in result) {
        stepData.count = (result as { length: number }).length;
      }
      if ('existsInVectorDB' in result) {
        stepData = result;
      }
      if ('findings' in result) {
        stepData.findingsCount = Object.values((result as { findings?: Record<string, unknown[]> }).findings || {})
          .reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
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
  return async <T>(operation: () => Promise<T>) => {
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
  return async <T>(operation: () => Promise<T>) => {
    return monitorStep(sessionId, `Execute ${agentRole} Agent`, operation, {
      agentRole
    });
  };
}

/**
 * Monitor Vector DB operations
 */
export function monitorVectorDBOperation(sessionId: string, operation: string) {
  return async <T>(op: () => Promise<T>) => {
    return monitorStep(sessionId, `VectorDB: ${operation}`, op, {
      database: 'VectorDB',
      operation
    });
  };
}