import { Router, Request, Response } from 'express';
import { apiKeyAuth } from '../middleware/api-key-auth';

const router = Router();

// In-memory storage for debug logs
const debugLogs: any[] = [];
const maxLogs = 100;

// Export function to add debug logs
export function addDebugLog(message: string, data?: any) {
  const log = {
    timestamp: new Date().toISOString(),
    message,
    data
  };
  
  debugLogs.push(log);
  
  // Keep only the last N logs
  if (debugLogs.length > maxLogs) {
    debugLogs.shift();
  }
  
  // Also log to console
  console.log(`[DEBUG] ${message}`, data || '');
}

// GET /api/debug/analysis-logs
router.get('/analysis-logs', apiKeyAuth, (req: Request, res: Response) => {
  res.json({
    logs: debugLogs,
    count: debugLogs.length
  });
});

// GET /api/debug/clear-logs
router.post('/clear-logs', apiKeyAuth, (req: Request, res: Response) => {
  debugLogs.length = 0;
  res.json({ message: 'Debug logs cleared' });
});

export default router;