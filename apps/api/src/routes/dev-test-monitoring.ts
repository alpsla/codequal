/**
 * Development Test Routes for Monitoring (NO AUTH REQUIRED - DEV ONLY)
 */

import { Router, Request, Response } from 'express';
import { dataFlowMonitor } from '../services/data-flow-monitor';
import { getUnifiedProgressTracer } from '../services/unified-progress-tracer';
import { ResultOrchestrator } from '../services/result-orchestrator';

const router = Router();

/**
 * Test endpoint to trigger a mock analysis with monitoring
 * NO AUTH REQUIRED - FOR DEVELOPMENT TESTING ONLY
 */
router.post('/dev-test/trigger-analysis', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Dev endpoints disabled in production' });
  }

  try {
    // Create a mock user for testing
    const mockUser: any = {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      status: 'active',
      permissions: ['analyze:public', 'analyze:private', 'advanced:features'],
      session: {
        token: 'test-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const { repositoryUrl = 'https://github.com/facebook/react', prNumber = 28000 } = req.body;

    // Start unified tracking
    const unifiedTracer = getUnifiedProgressTracer();
    const { analysisId, sessionId } = unifiedTracer.startAnalysis(
      repositoryUrl,
      prNumber,
      'comprehensive',
      5,
      5
    );

    res.json({
      message: 'Analysis started',
      analysisId,
      sessionId,
      monitoringUrls: {
        session: `/api/dev-test/session/${sessionId}`,
        visualization: `/api/dev-test/session/${sessionId}/visualize`,
        progress: `/api/dev-test/progress/${analysisId}`
      }
    });

    // Trigger analysis asynchronously
    setTimeout(async () => {
      try {
        const orchestrator = new ResultOrchestrator(mockUser);
        await orchestrator.analyzePR({
          repositoryUrl,
          prNumber,
          analysisMode: 'comprehensive',
          authenticatedUser: mockUser,
          githubToken: process.env.GITHUB_TOKEN
        });
      } catch (error) {
        console.error('Analysis failed:', error);
      }
    }, 100);

  } catch (error) {
    console.error('Failed to start test analysis:', error);
    res.status(500).json({ error: 'Failed to start analysis' });
  }
});

/**
 * Get session details without auth
 */
router.get('/dev-test/session/:sessionId', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Dev endpoints disabled in production' });
  }

  const session = dataFlowMonitor.getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json(session);
});

/**
 * Get session visualization without auth
 */
router.get('/dev-test/session/:sessionId/visualize', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Dev endpoints disabled in production' });
  }

  const { sessionId } = req.params;
  const session = dataFlowMonitor.getSession(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const visualization = dataFlowMonitor.generateFlowVisualization(sessionId);
  const metrics = dataFlowMonitor.getSessionMetrics(sessionId);
  
  // Generate simple HTML
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Dev Test Monitor - ${sessionId}</title>
    <meta http-equiv="refresh" content="5">
    <style>
        body { font-family: monospace; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; }
        .step { margin: 10px 0; padding: 10px; border-left: 3px solid #ddd; }
        .step.completed { border-color: #28a745; background: #d4edda; }
        .step.failed { border-color: #dc3545; background: #f8d7da; }
        .step.in-progress { border-color: #ffc107; background: #fff3cd; }
        .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; }
        pre { background: #f8f9fa; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Data Flow Monitor (Dev Test)</h1>
        <p>Auto-refresh: 5 seconds | Session: ${sessionId}</p>
        
        <div class="metrics">
            <div class="metric">
                <strong>Repository:</strong><br>
                ${session.repositoryUrl}
            </div>
            <div class="metric">
                <strong>PR:</strong><br>
                #${session.prNumber || 'N/A'}
            </div>
            <div class="metric">
                <strong>Status:</strong><br>
                ${session.status}
            </div>
            <div class="metric">
                <strong>Steps:</strong><br>
                ${session.steps.length}
            </div>
        </div>

        <h2>Steps Timeline</h2>
        ${session.steps.map(step => `
            <div class="step ${step.status}">
                <strong>${step.name}</strong> - 
                ${step.status} - 
                ${step.duration ? step.duration + 'ms' : 'Running...'}
                ${step.error ? '<br>❌ Error: ' + step.error.message : ''}
                ${step.data ? '<br>📊 Data: <pre>' + JSON.stringify(step.data, null, 2) + '</pre>' : ''}
            </div>
        `).join('')}

        <h2>Raw Visualization</h2>
        <pre>${visualization}</pre>
    </div>
</body>
</html>`;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/**
 * Get all active sessions without auth
 */
router.get('/dev-test/sessions', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Dev endpoints disabled in production' });
  }

  const sessions = dataFlowMonitor.getActiveSessions();
  res.json({
    count: sessions.length,
    sessions: sessions.map(s => ({
      sessionId: s.sessionId,
      repositoryUrl: s.repositoryUrl,
      prNumber: s.prNumber,
      status: s.status,
      steps: s.steps.length,
      startTime: new Date(s.startTime).toISOString()
    }))
  });
});

export default router;