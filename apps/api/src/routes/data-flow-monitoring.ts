import { Router, Request, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth-middleware';
import { dataFlowMonitor } from '../services/data-flow-monitor';
import { createLogger } from '@codequal/core/utils';

const router = Router();
const logger = createLogger('MonitoringAPI');

/**
 * Get all active monitoring sessions
 */
router.get('/monitoring/sessions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const activeSessions = dataFlowMonitor.getActiveSessions();
    
    res.json({
      count: activeSessions.length,
      sessions: activeSessions.map(session => ({
        sessionId: session.sessionId,
        repositoryUrl: session.repositoryUrl,
        prNumber: session.prNumber,
        startTime: new Date(session.startTime).toISOString(),
        duration: Date.now() - session.startTime,
        stepCount: session.steps.length,
        status: session.status
      }))
    });
  } catch (error) {
    logger.error('Failed to get monitoring sessions', { error });
    res.status(500).json({ error: 'Failed to retrieve sessions' });
  }
});

/**
 * Get detailed session information
 */
router.get('/monitoring/session/:sessionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = dataFlowMonitor.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const metrics = dataFlowMonitor.getSessionMetrics(sessionId);
    const visualization = dataFlowMonitor.generateFlowVisualization(sessionId);
    
    res.json({
      session,
      metrics,
      visualization
    });
  } catch (error) {
    logger.error('Failed to get session details', { error, sessionId: req.params.sessionId });
    res.status(500).json({ error: 'Failed to retrieve session details' });
  }
});

/**
 * Get session visualization as HTML
 */
router.get('/monitoring/session/:sessionId/visualize', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = dataFlowMonitor.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const visualization = dataFlowMonitor.generateFlowVisualization(sessionId);
    const metrics = dataFlowMonitor.getSessionMetrics(sessionId);
    
    // Generate HTML visualization
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Data Flow Monitor - ${sessionId}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        h2 { color: #666; margin-top: 30px; }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .metric-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e9ecef;
        }
        .metric-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
        }
        .metric-value {
            font-size: 24px;
            font-weight: 600;
            color: #333;
            margin-top: 5px;
        }
        .flow-visualization {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            font-family: monospace;
            white-space: pre-wrap;
            line-height: 1.6;
        }
        .step {
            margin: 10px 0;
            padding: 10px;
            border-left: 3px solid #ddd;
            background: white;
        }
        .step.completed { border-color: #28a745; }
        .step.failed { border-color: #dc3545; }
        .step.in-progress { border-color: #ffc107; }
        .step-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .step-name { font-weight: 600; }
        .step-duration { color: #666; font-size: 14px; }
        .warnings {
            background: #fff3cd;
            border: 1px solid #ffeeba;
            color: #856404;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .timestamp {
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Data Flow Monitor</h1>
        <p class="timestamp">Generated: ${new Date().toISOString()}</p>
        
        <h2>Session Information</h2>
        <div class="metrics">
            <div class="metric-card">
                <div class="metric-label">Repository</div>
                <div class="metric-value">${session.repositoryUrl.split('/').slice(-2).join('/')}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">PR Number</div>
                <div class="metric-value">#${session.prNumber || 'N/A'}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Total Duration</div>
                <div class="metric-value">${metrics?.totalDuration || 0}ms</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Steps</div>
                <div class="metric-value">${session.steps.length}</div>
            </div>
        </div>

        ${session.summary?.warnings && session.summary.warnings.length > 0 ? `
        <div class="warnings">
            <h3>⚠️ Warnings</h3>
            <ul>
                ${session.summary.warnings.map(w => `<li>${w}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <h2>Step Details</h2>
        <div class="steps">
            ${session.steps.map(step => `
                <div class="step ${step.status}">
                    <div class="step-header">
                        <span class="step-name">${step.name}</span>
                        <span class="step-duration">${step.duration ? step.duration + 'ms' : 'In Progress'}</span>
                    </div>
                    ${step.error ? `<div class="error">Error: ${step.error.message}</div>` : ''}
                    ${step.metadata ? `<pre>${JSON.stringify(step.metadata, null, 2)}</pre>` : ''}
                </div>
            `).join('')}
        </div>

        <h2>Flow Visualization</h2>
        <div class="flow-visualization">${visualization}</div>

        <h2>Performance Metrics</h2>
        <div class="metrics">
            <div class="metric-card">
                <div class="metric-label">Average Step Duration</div>
                <div class="metric-value">${Math.round(metrics?.avgStepDuration || 0)}ms</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Slowest Step</div>
                <div class="metric-value">${metrics?.slowestStep?.name || 'N/A'}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Error Rate</div>
                <div class="metric-value">${Math.round((metrics?.errorRate || 0) * 100)}%</div>
            </div>
        </div>
    </div>
</body>
</html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Failed to generate visualization', { error, sessionId: req.params.sessionId });
    res.status(500).json({ error: 'Failed to generate visualization' });
  }
});

/**
 * Export session data
 */
router.get('/monitoring/session/:sessionId/export', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const exportData = dataFlowMonitor.exportSession(sessionId);
    
    if (!exportData) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}.json"`);
    res.json(exportData);
  } catch (error) {
    logger.error('Failed to export session', { error, sessionId: req.params.sessionId });
    res.status(500).json({ error: 'Failed to export session' });
  }
});

/**
 * Real-time monitoring stream (Server-Sent Events)
 */
router.get('/monitoring/stream/:sessionId', authMiddleware, async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  
  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial data
  const session = dataFlowMonitor.getSession(sessionId);
  if (session) {
    res.write(`data: ${JSON.stringify({ type: 'session', data: session })}\n\n`);
  }
  
  // Set up event listeners
  const stepStartHandler = (data: any) => {
    if (data.session.sessionId === sessionId) {
      res.write(`data: ${JSON.stringify({ type: 'step:start', data: data.step })}\n\n`);
    }
  };
  
  const stepCompleteHandler = (step: any) => {
    const session = dataFlowMonitor.getSession(sessionId);
    if (session?.steps.find(s => s.id === step.id)) {
      res.write(`data: ${JSON.stringify({ type: 'step:complete', data: step })}\n\n`);
    }
  };
  
  const stepFailHandler = (step: any) => {
    const session = dataFlowMonitor.getSession(sessionId);
    if (session?.steps.find(s => s.id === step.id)) {
      res.write(`data: ${JSON.stringify({ type: 'step:fail', data: step })}\n\n`);
    }
  };
  
  const sessionCompleteHandler = (completedSession: any) => {
    if (completedSession.sessionId === sessionId) {
      res.write(`data: ${JSON.stringify({ type: 'session:complete', data: completedSession })}\n\n`);
      cleanup();
    }
  };
  
  // Register listeners
  dataFlowMonitor.on('step:start', stepStartHandler);
  dataFlowMonitor.on('step:complete', stepCompleteHandler);
  dataFlowMonitor.on('step:fail', stepFailHandler);
  dataFlowMonitor.on('session:complete', sessionCompleteHandler);
  
  // Clean up on disconnect
  const cleanup = () => {
    dataFlowMonitor.off('step:start', stepStartHandler);
    dataFlowMonitor.off('step:complete', stepCompleteHandler);
    dataFlowMonitor.off('step:fail', stepFailHandler);
    dataFlowMonitor.off('session:complete', sessionCompleteHandler);
  };
  
  req.on('close', cleanup);
});

export default router;