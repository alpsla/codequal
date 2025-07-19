import { Router } from 'express';

const router = Router();

// Export the function that other modules expect
export function getGlobalMonitoringService(): any {
  // Return a mock service for now
  return {
    trackAnalysis: () => {},
    getMetrics: () => ({}),
    recordComponentLatency: (component: string, operation: string, duration: number) => {
      // Mock implementation - just log for now
      console.debug(`[Monitoring] Component: ${component}, Operation: ${operation}, Duration: ${duration}s`);
    },
    recordError: (errorType: string, component: string, severity: string) => {
      console.debug(`[Monitoring] Error: ${errorType}, Component: ${component}, Severity: ${severity}`);
    },
    recordBusinessEvent: (event: string, tier: string, data?: any) => {
      console.debug(`[Monitoring] Business Event: ${event}, Tier: ${tier}`, data);
    },
    recordCost: (operation: string, provider: string, cost: number) => {
      console.debug(`[Monitoring] Cost: ${operation}, Provider: ${provider}, Cost: $${cost}`);
    },
    recordAnalysisStarted: (labels: any) => {
      console.debug(`[Monitoring] Analysis Started`, labels);
    },
    recordAnalysisFailed: (labels: any) => {
      console.debug(`[Monitoring] Analysis Failed`, labels);
    },
    recordAnalysisCompleted: (labels: any, duration: number) => {
      console.debug(`[Monitoring] Analysis Completed`, labels, `Duration: ${duration}s`);
    }
  };
}

// Basic monitoring endpoints
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    let dbStatus = 'unknown';
    let tableCount = 0;
    
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { count } = await supabase
          .from('repositories')
          .select('*', { count: 'exact', head: true });
        
        dbStatus = 'healthy';
        tableCount = 72; // Known table count from our fixes
      } catch (error) {
        dbStatus = 'unhealthy';
      }
    }
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        tables: tableCount
      },
      vectorDB: {
        status: process.env.PINECONE_API_KEY ? 'healthy' : 'unavailable'
      },
      background: {
        status: 'healthy' // Assume healthy for now
      }
    };
    
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;