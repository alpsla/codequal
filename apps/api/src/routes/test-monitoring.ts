import { Router, Request, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth-middleware';
import { dataFlowMonitor } from '../services/data-flow-monitor';

const router = Router();

/**
 * Test endpoint to trigger monitoring
 */
router.get('/test-monitoring/trigger', authMiddleware, async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  
  // Return the session ID immediately so user can monitor it
  const sessionId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  res.json({
    message: 'Monitoring test started',
    sessionId,
    monitoringUrls: {
      details: `/api/monitoring/session/${sessionId}`,
      visualize: `/api/monitoring/session/${sessionId}/visualize`,
      stream: `/api/monitoring/stream/${sessionId}`
    }
  });
  
  // Run test async
  setTimeout(() => runMonitoringTest(sessionId, user.email), 100);
});

async function runMonitoringTest(sessionId: string, userEmail: string) {
  const session = dataFlowMonitor.startSession(sessionId, 'https://github.com/test/repo', 123);
  
  try {
    // Step 1: PR Context
    const step1 = dataFlowMonitor.startStep(sessionId, 'Extract PR Context', {
      user: userEmail,
      test: true
    });
    await delay(500);
    dataFlowMonitor.completeStep(step1, { files: 5, language: 'TypeScript' });
    
    // Step 2: Check Vector DB
    const step2 = dataFlowMonitor.startStep(sessionId, 'Check Repository Status', {
      source: 'VectorDB'
    });
    await delay(800);
    dataFlowMonitor.completeStep(step2, { exists: false, needsAnalysis: true });
    
    // Step 3: Trigger DeepWiki
    const step3 = dataFlowMonitor.startStep(sessionId, 'Trigger DeepWiki Analysis', {
      reason: 'Repository not in VectorDB'
    });
    await delay(2000); // Simulate slow operation
    dataFlowMonitor.completeStep(step3, { jobId: 'dw-123', status: 'queued' });
    
    // Step 4: Agent Analysis
    const agents = ['security', 'codeQuality', 'architecture', 'performance'];
    for (const agent of agents) {
      const stepId = dataFlowMonitor.startStep(sessionId, `Execute ${agent} Agent`, {
        agentRole: agent
      });
      await delay(300 + Math.random() * 700);
      
      if (agent === 'security' && Math.random() > 0.7) {
        // Simulate occasional failure
        dataFlowMonitor.failStep(stepId, new Error('Agent timeout'));
      } else {
        dataFlowMonitor.completeStep(stepId, {
          findings: Math.floor(Math.random() * 10),
          severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
        });
      }
    }
    
    // Step 5: Generate Report
    const step5 = dataFlowMonitor.startStep(sessionId, 'Generate Report', {
      format: 'HTML'
    });
    await delay(300);
    dataFlowMonitor.completeStep(step5, { reportId: 'report-123', size: 45000 });
    
    // Complete session
    dataFlowMonitor.completeSession(sessionId);
    
  } catch (error) {
    console.error('Test monitoring failed:', error);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default router;