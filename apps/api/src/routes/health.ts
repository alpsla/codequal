import { Router, Request, Response } from 'express';
import { getSupabase } from '@codequal/database/supabase/client';

const router = Router();

// Basic health check - just confirms the service is running
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Readiness check - confirms all dependencies are available
router.get('/ready', async (req: Request, res: Response) => {
  const checks = {
    api: true,
    database: false,
    timestamp: new Date().toISOString()
  };

  try {
    // Check database connection
    const supabase = getSupabase();
    const { error } = await supabase.from('users').select('id').limit(1);
    checks.database = !error;

    const isReady = Object.values(checks).every(check => 
      typeof check === 'boolean' ? check : true
    );

    res.status(isReady ? 200 : 503).json({
      ready: isReady,
      checks
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      checks,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;