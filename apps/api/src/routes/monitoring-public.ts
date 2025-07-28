import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '@codequal/core/utils';

const router = Router();
const logger = createLogger('monitoring-public');
const execAsync = promisify(exec);

// Public monitoring endpoint for dashboard - no auth required
router.get('/deepwiki/metrics', async (req, res) => {
  try {
    // Get disk usage
    const { stdout: diskInfo } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- df -BG /root/.adalflow | tail -1'
    );
    
    const parts = diskInfo.trim().split(/\s+/);
    const totalGB = parseInt(parts[1].replace('G', ''));
    const usedGB = parseInt(parts[2].replace('G', ''));
    const availableGB = parseInt(parts[3].replace('G', ''));
    const percentUsed = parseInt(parts[4].replace('%', ''));
    
    // Get repository count
    const { stdout: repoList } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- ls -la /root/.adalflow/repos 2>/dev/null || echo ""'
    );
    
    const repoCount = (repoList.match(/^d/gm) || []).length - 2; // Subtract . and ..
    
    // Get repository names
    const repoNames = repoList
      .split('\n')
      .filter(line => line.startsWith('d') && !line.includes(' .'))
      .map(line => line.split(/\s+/).pop())
      .filter(name => name && name !== '..');
    
    res.json({
      disk: {
        totalGB,
        usedGB,
        availableGB,
        percentUsed,
        total: `${totalGB}G`,
        used: `${usedGB}G`,
        available: `${availableGB}G`
      },
      repos: repoCount,
      repoNames,
      timestamp: new Date().toISOString(),
      status: percentUsed < 50 ? 'healthy' : percentUsed < 80 ? 'warning' : 'critical'
    });
    
  } catch (error) {
    logger.error('Failed to get public metrics:', error as Error);
    res.status(500).json({ 
      error: 'Failed to retrieve metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;