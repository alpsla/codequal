/**
 * Dependency-Check Status API
 *
 * Provides real-time status endpoints for:
 * - Database health
 * - Update progress
 * - Grafana dashboards
 *
 * @author CodeQual Team
 * @date 2025-09-30
 */

import express, { Request, Response } from 'express';
import { DependencyCheckScanner } from './dependency-check-scanner';
import { DBMetadata } from './dependency-check-updater';
import { UnifiedMonitoringService } from '../../../standard/monitoring/services/unified-monitoring.service';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const router = express.Router();
const scanner = new DependencyCheckScanner();
const monitoring = UnifiedMonitoringService.getInstance();

/**
 * GET /api/dependency-check/status
 *
 * Returns current database status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const info = await scanner.getDatabaseInfo();

    res.json({
      status: info.status,
      healthy: info.healthy,
      lastUpdate: info.lastUpdate,
      ageHours: info.ageHours,
      message: getStatusMessage(info.status, info.ageHours),
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      healthy: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/dependency-check/health
 *
 * Health check endpoint (for K8s probes)
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const info = await scanner.getDatabaseInfo();

    if (info.healthy) {
      res.status(200).json({ status: 'healthy' });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        reason: `Database status: ${info.status}, age: ${info.ageHours}h`,
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      reason: error.message,
    });
  }
});

/**
 * GET /api/dependency-check/metadata
 *
 * Returns full database metadata
 */
router.get('/metadata', async (req: Request, res: Response) => {
  try {
    const metadataPath = '/data/dependency-check/active/metadata.json';

    if (!existsSync(metadataPath)) {
      return res.status(404).json({
        error: 'Database metadata not found',
      });
    }

    const metadata: DBMetadata = JSON.parse(readFileSync(metadataPath, 'utf8'));

    res.json({
      version: metadata.version,
      timestamp: new Date(metadata.timestamp).toISOString(),
      status: metadata.status,
      lastUpdateDuration: metadata.lastUpdateDuration,
      lastUpdateDurationFormatted: formatDuration(metadata.lastUpdateDuration),
      recordCount: metadata.recordCount,
      cveDatabaseSize: formatBytes(metadata.cveDatabaseSize),
      indexSize: formatBytes(metadata.indexSize),
      validationPassed: metadata.validationPassed,
      ageHours: ((Date.now() - metadata.timestamp) / 3600000).toFixed(1),
      healthy: metadata.status === 'READY' && (Date.now() - metadata.timestamp) < 86400000,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * GET /api/dependency-check/logs
 *
 * Returns recent update logs
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logsDir = '/data/dependency-check/logs';
    const today = new Date().toISOString().split('T')[0];
    const logFile = join(logsDir, `update-${today}.log`);

    if (!existsSync(logFile)) {
      return res.json({
        logs: [],
        message: 'No logs for today',
      });
    }

    const logs = readFileSync(logFile, 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .slice(-limit);

    res.json({
      date: today,
      lines: logs.length,
      logs,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * GET /api/dependency-check/metrics
 *
 * Returns metrics for Prometheus/Grafana
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const info = await scanner.getDatabaseInfo();
    const metadataPath = '/data/dependency-check/active/metadata.json';
    let metadata: DBMetadata | null = null;

    if (existsSync(metadataPath)) {
      metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    }

    // Prometheus format
    const metrics = [
      `# HELP dependency_check_database_age_hours Age of CVE database in hours`,
      `# TYPE dependency_check_database_age_hours gauge`,
      `dependency_check_database_age_hours ${info.ageHours}`,
      '',
      `# HELP dependency_check_database_healthy Database health status (1=healthy, 0=unhealthy)`,
      `# TYPE dependency_check_database_healthy gauge`,
      `dependency_check_database_healthy ${info.healthy ? 1 : 0}`,
      '',
      `# HELP dependency_check_last_update_duration_seconds Duration of last update in seconds`,
      `# TYPE dependency_check_last_update_duration_seconds gauge`,
      `dependency_check_last_update_duration_seconds ${metadata ? metadata.lastUpdateDuration / 1000 : 0}`,
      '',
      `# HELP dependency_check_database_size_bytes Size of CVE database in bytes`,
      `# TYPE dependency_check_database_size_bytes gauge`,
      `dependency_check_database_size_bytes ${metadata ? metadata.cveDatabaseSize : 0}`,
      '',
      `# HELP dependency_check_validation_passed Last validation result (1=passed, 0=failed)`,
      `# TYPE dependency_check_validation_passed gauge`,
      `dependency_check_validation_passed ${metadata?.validationPassed ? 1 : 0}`,
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * POST /api/dependency-check/scan
 *
 * Trigger a scan (for testing)
 */
router.post('/scan', async (req: Request, res: Response) => {
  try {
    const { projectPath, projectName } = req.body;

    if (!projectPath) {
      return res.status(400).json({
        error: 'projectPath is required',
      });
    }

    const result = await scanner.scan(projectPath, projectName);

    res.json({
      success: true,
      result: {
        projectName: result.projectName,
        scanDate: result.scanDate,
        dependencies: result.dependencies,
        vulnerabilitiesFound: result.vulnerabilities.length,
        criticalVulnerabilities: result.vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
        highVulnerabilities: result.vulnerabilities.filter(v => v.severity === 'HIGH').length,
        scanDuration: result.scanDuration,
        databaseAgeHours: (result.databaseAge / 3600000).toFixed(1),
      },
      vulnerabilities: result.vulnerabilities,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * Utility: Format status message
 */
function getStatusMessage(status: string, ageHours: number): string {
  if (status === 'READY' && ageHours < 24) {
    return '✅ Database is up-to-date and ready';
  }

  if (status === 'READY' && ageHours >= 24 && ageHours < 48) {
    return '⚠️  Database is ready but aging (>24h old)';
  }

  if (status === 'READY' && ageHours >= 48) {
    return '⚠️  Database is old (>48h), update recommended';
  }

  if (status === 'UPDATING') {
    return '🔄 Database update in progress...';
  }

  if (status === 'INDEXING') {
    return '🔨 Building database indexes...';
  }

  if (status === 'VALIDATING') {
    return '🧪 Running validation tests...';
  }

  if (status === 'FAILED') {
    return '❌ Last update failed, using backup';
  }

  return `❓ Unknown status: ${status}`;
}

/**
 * Utility: Format duration
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Utility: Format bytes
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}

export default router;
