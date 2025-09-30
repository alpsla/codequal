/**
 * Dependency-Check Database Update Manager
 *
 * Manages the CVE database lifecycle:
 * - Scheduled updates (cron)
 * - Database caching and indexing
 * - Validation and rollback
 * - Monitoring integration
 *
 * @author CodeQual Team
 * @date 2025-09-30
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, writeFileSync, unlinkSync, appendFileSync } from 'fs';
import { join } from 'path';
import { UnifiedMonitoringService } from '../../../standard/monitoring/services/unified-monitoring.service';

const execAsync = promisify(exec);

/**
 * Database metadata stored with each version
 */
export interface DBMetadata {
  version: string;
  timestamp: number;
  status: 'READY' | 'UPDATING' | 'INDEXING' | 'VALIDATING' | 'FAILED';
  lastUpdateDuration: number;
  recordCount: number;
  cveDatabaseSize: number;
  indexSize: number;
  validationPassed: boolean;
  lastError?: string;
}

/**
 * Validation test result
 */
interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  testResults: {
    databaseExists: boolean;
    databaseSize: number;
    indexComplete: boolean;
    queryPerformance: number;
    sampleQuerySuccess: boolean;
  };
}

/**
 * Update progress event
 */
interface UpdateProgress {
  stage: 'BACKUP' | 'DOWNLOAD' | 'INDEX' | 'VALIDATE' | 'SWAP' | 'CLEANUP';
  progress: number; // 0-100
  message: string;
  timestamp: number;
}

/**
 * Manages Dependency-Check CVE database updates
 * Integrates with UnifiedMonitoringService for Grafana dashboards
 */
export class DependencyCheckUpdater {
  private readonly BASE_PATH = '/data/dependency-check';
  private readonly ACTIVE_PATH = join(this.BASE_PATH, 'active');
  private readonly STAGING_PATH = join(this.BASE_PATH, 'staging');
  private readonly BACKUP_PATH = join(this.BASE_PATH, 'backups');
  private readonly LOG_PATH = join(this.BASE_PATH, 'logs');
  private readonly LOCK_FILE = join(this.BASE_PATH, '.lock');

  // Oracle Container Registry
  private readonly CONTAINER_IMAGE = 'iad.ocir.io/codequal/analyzer:lang-java-v5.3';

  private monitoring: UnifiedMonitoringService;

  constructor() {
    this.monitoring = UnifiedMonitoringService.getInstance();
  }

  /**
   * Main update flow - runs daily at 2 AM via cron
   */
  async performDailyUpdate(): Promise<void> {
    const operationId = this.monitoring.startPerformanceTracking('dependency-check-update');
    const startTime = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const logFile = join(this.LOG_PATH, `update-${today}.log`);

    try {
      this.log('🔄 Starting Dependency-Check database update...', logFile);
      this.emitProgress('BACKUP', 0, 'Preparing update...');

      // Step 1: Pre-update checks
      await this.preUpdateChecks();
      this.emitProgress('BACKUP', 10, 'Pre-update checks passed');

      // Step 2: Create backup
      await this.createBackup(today);
      this.emitProgress('BACKUP', 20, 'Backup created');

      // Step 3: Acquire lock
      await this.acquireLock();

      // Step 4: Update status
      await this.updateStatus('UPDATING');
      this.emitProgress('DOWNLOAD', 25, 'Starting CVE database download...');

      // Step 5: Download CVE data
      await this.downloadCVEData((progress) => {
        this.emitProgress('DOWNLOAD', 25 + (progress * 0.3), `Downloading: ${progress}%`);
      });
      this.emitProgress('DOWNLOAD', 55, 'Download complete');

      // Step 6: Build indexes
      await this.updateStatus('INDEXING');
      this.emitProgress('INDEX', 60, 'Building database indexes...');
      await this.buildIndexes((progress) => {
        this.emitProgress('INDEX', 60 + (progress * 0.15), `Indexing: ${progress}%`);
      });
      this.emitProgress('INDEX', 75, 'Indexing complete');

      // Step 7: Run validation
      await this.updateStatus('VALIDATING');
      this.emitProgress('VALIDATE', 80, 'Running validation tests...');
      const validationResult = await this.runValidationTests();

      if (!validationResult.success) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }
      this.emitProgress('VALIDATE', 85, 'Validation passed');

      // Step 8: Atomic swap
      this.emitProgress('SWAP', 90, 'Promoting new database...');
      await this.atomicSwap();

      // Step 9: Update status to READY
      await this.updateStatus('READY');
      this.emitProgress('SWAP', 95, 'Database activated');

      // Step 10: Cleanup
      this.emitProgress('CLEANUP', 97, 'Cleaning up old backups...');
      await this.cleanupOldBackups();

      const duration = Date.now() - startTime;
      this.log(`✅ Update completed successfully in ${(duration / 1000).toFixed(2)}s`, logFile);
      this.emitProgress('CLEANUP', 100, 'Update complete');

      // Track metrics
      this.monitoring.trackPerformance('dependency-check-update', duration, {
        success: true,
        stage: 'complete',
        validationPassed: true,
        databaseSize: validationResult.testResults.databaseSize,
      });

      // Notify monitoring
      await this.notifySuccess(duration, validationResult);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`❌ Update failed: ${error.message}`, logFile);

      // Track failure
      this.monitoring.trackPerformance('dependency-check-update', duration, {
        success: false,
        error: error.message,
      });

      // Rollback
      await this.rollback(today);

      // Update status
      await this.updateStatus('FAILED');

      // Alert support
      await this.alertSupport(error);

      throw error;
    } finally {
      // Always release lock
      await this.releaseLock();
      this.monitoring.endPerformanceTracking('dependency-check-update');
    }
  }

  /**
   * Pre-update checks (disk space, API key, connectivity)
   */
  private async preUpdateChecks(): Promise<void> {
    this.log('Running pre-update checks...');

    // Check for existing lock
    if (existsSync(this.LOCK_FILE)) {
      const lockContent = readFileSync(this.LOCK_FILE, 'utf8');
      const lockTime = parseInt(lockContent);
      const lockAge = Date.now() - lockTime;

      if (lockAge < 3600000) { // 1 hour
        throw new Error('Update already in progress');
      }

      // Stale lock, remove it
      this.log('⚠️  Removing stale lock file');
      unlinkSync(this.LOCK_FILE);
    }

    // Check disk space (need at least 10GB free)
    const { stdout: dfOutput } = await execAsync(`df -BG ${this.BASE_PATH} | tail -1 | awk '{print $4}'`);
    const freeSpaceGB = parseInt(dfOutput.trim().replace('G', ''));

    if (freeSpaceGB < 10) {
      throw new Error(`Insufficient disk space: ${freeSpaceGB}GB free, need 10GB`);
    }
    this.log(`✓ Disk space: ${freeSpaceGB}GB available`);

    // Check NVD API key
    if (!process.env.NVD_API_KEY) {
      throw new Error('NVD_API_KEY environment variable not set');
    }
    this.log('✓ NVD API key configured');

    // Test NVD API connectivity
    try {
      await execAsync(`curl -s -f -H "apiKey: ${process.env.NVD_API_KEY}" https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1`);
      this.log('✓ NVD API connectivity verified');
    } catch (error) {
      throw new Error(`NVD API unreachable: ${error.message}`);
    }

    // Test Oracle Container Registry access
    try {
      await execAsync(`docker manifest inspect ${this.CONTAINER_IMAGE} > /dev/null 2>&1`);
      this.log('✓ Oracle Container Registry access verified');
    } catch (error) {
      throw new Error(`Cannot access Oracle Container Registry: ${error.message}`);
    }
  }

  /**
   * Create backup of current active database
   */
  private async createBackup(today: string): Promise<void> {
    const backupDir = join(this.BACKUP_PATH, today);

    if (!existsSync(this.ACTIVE_PATH)) {
      this.log('ℹ️  No active database to backup (first run)');
      return;
    }

    this.log(`📦 Creating backup: ${backupDir}`);
    await execAsync(`mkdir -p ${this.BACKUP_PATH} && cp -r ${this.ACTIVE_PATH} ${backupDir}`);

    const backupSize = await this.getDirectorySize(backupDir);
    this.log(`✓ Backup created: ${(backupSize / 1024 / 1024).toFixed(2)} MB`);
  }

  /**
   * Download CVE data from NVD
   */
  private async downloadCVEData(progressCallback?: (progress: number) => void): Promise<void> {
    this.log('📥 Downloading CVE data from NVD...');

    const cmd = `
      docker run --rm \
        -v ${this.STAGING_PATH}:/data \
        -e NVD_API_KEY=${process.env.NVD_API_KEY} \
        ${this.CONTAINER_IMAGE} \
        bash -c 'dependency-check --updateonly --data /data --nvdApiKey $NVD_API_KEY 2>&1 | tee /tmp/download.log'
    `;

    // Execute with progress tracking
    const child = exec(cmd);
    let lastProgress = 0;

    child.stdout?.on('data', (data) => {
      const output = data.toString();

      // Parse progress from output (Dependency-Check shows % complete)
      const progressMatch = output.match(/(\d+)%/);
      if (progressMatch && progressCallback) {
        const progress = parseInt(progressMatch[1]);
        if (progress > lastProgress) {
          lastProgress = progress;
          progressCallback(progress);
        }
      }
    });

    await new Promise((resolve, reject) => {
      child.on('exit', (code) => {
        if (code === 0) resolve(null);
        else reject(new Error(`Download failed with code ${code}`));
      });
    });

    this.log('✓ CVE data downloaded successfully');
  }

  /**
   * Build H2 and Lucene indexes
   */
  private async buildIndexes(progressCallback?: (progress: number) => void): Promise<void> {
    this.log('🔨 Building database indexes...');

    // Create a minimal test project to trigger indexing
    await execAsync(`mkdir -p /tmp/dummy-project && echo '<project></project>' > /tmp/dummy-project/pom.xml`);

    const cmd = `
      docker run --rm \
        -v ${this.STAGING_PATH}:/data \
        -v /tmp/dummy-project:/workspace \
        ${this.CONTAINER_IMAGE} \
        bash -c 'dependency-check --scan /workspace --data /data --format JSON --out /tmp/results 2>&1'
    `;

    await execAsync(cmd);

    this.log('✓ Indexes built successfully');
  }

  /**
   * Run comprehensive validation tests
   */
  private async runValidationTests(): Promise<ValidationResult> {
    this.log('🧪 Running validation tests...');

    const errors: string[] = [];
    const warnings: string[] = [];
    const testResults = {
      databaseExists: false,
      databaseSize: 0,
      indexComplete: false,
      queryPerformance: 0,
      sampleQuerySuccess: false,
    };

    // Test 1: Check H2 database exists
    const h2DbPath = join(this.STAGING_PATH, 'data', 'odc.mv.db');
    testResults.databaseExists = existsSync(h2DbPath);

    if (!testResults.databaseExists) {
      errors.push('H2 database file not found');
    } else {
      this.log('✓ Test 1: Database file exists');
    }

    // Test 2: Check database size
    if (testResults.databaseExists) {
      const { stdout: sizeOutput } = await execAsync(`du -b ${h2DbPath} | cut -f1`);
      testResults.databaseSize = parseInt(sizeOutput.trim());
      const sizeMB = testResults.databaseSize / 1024 / 1024;

      if (sizeMB < 100) {
        errors.push(`Database too small: ${sizeMB.toFixed(2)}MB (expected > 100MB)`);
      } else {
        this.log(`✓ Test 2: Database size: ${sizeMB.toFixed(2)}MB`);
      }
    }

    // Test 3: Check Lucene indexes
    const lucenePath = join(this.STAGING_PATH, 'data', 'lucene');
    testResults.indexComplete = existsSync(lucenePath);

    if (!testResults.indexComplete) {
      warnings.push('Lucene index directory not found');
    } else {
      this.log('✓ Test 3: Lucene indexes present');
    }

    // Test 4: Run sample query
    try {
      const queryStart = Date.now();

      // Create test project with known vulnerable dependency
      await execAsync(`
        mkdir -p /tmp/test-vuln-project
        cat > /tmp/test-vuln-project/pom.xml <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<project>
  <dependencies>
    <dependency>
      <groupId>log4j</groupId>
      <artifactId>log4j</artifactId>
      <version>1.2.17</version>
    </dependency>
  </dependencies>
</project>
EOF
      `);

      const testCmd = `
        docker run --rm \
          -v ${this.STAGING_PATH}:/data:ro \
          -v /tmp/test-vuln-project:/workspace \
          ${this.CONTAINER_IMAGE} \
          dependency-check --scan /workspace --data /data --noupdate --format JSON --out /tmp/test-results
      `;

      const { stdout } = await execAsync(testCmd);
      testResults.queryPerformance = Date.now() - queryStart;
      testResults.sampleQuerySuccess = true;

      // Verify JSON output is valid
      const resultsPath = '/tmp/test-results/dependency-check-report.json';
      if (existsSync(resultsPath)) {
        const results = JSON.parse(readFileSync(resultsPath, 'utf8'));
        if (!results.dependencies) {
          warnings.push('Sample query returned unexpected format');
        }
      }

      this.log(`✓ Test 4: Sample query completed in ${testResults.queryPerformance}ms`);

      if (testResults.queryPerformance > 10000) {
        warnings.push(`Query performance slow: ${testResults.queryPerformance}ms (expected < 10000ms)`);
      }
    } catch (error) {
      errors.push(`Sample query failed: ${error.message}`);
      testResults.sampleQuerySuccess = false;
    }

    // Test 5: Verify metadata
    const metadataPath = join(this.STAGING_PATH, 'metadata.json');
    if (existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
        if (!metadata.timestamp) {
          warnings.push('Metadata missing timestamp');
        }
        this.log('✓ Test 5: Metadata valid');
      } catch (error) {
        errors.push('Invalid metadata JSON');
      }
    } else {
      warnings.push('Metadata file not found');
    }

    const success = errors.length === 0;

    if (success) {
      this.log('✅ All validation tests passed');
      if (warnings.length > 0) {
        this.log(`⚠️  Warnings: ${warnings.join(', ')}`);
      }
    } else {
      this.log(`❌ Validation failed: ${errors.join(', ')}`);
    }

    return { success, errors, warnings, testResults };
  }

  /**
   * Atomic swap: promote staging to active
   */
  private async atomicSwap(): Promise<void> {
    this.log('🔄 Performing atomic swap...');

    const tempPath = join(this.BASE_PATH, 'active.old');

    // Move current active to temp (if exists)
    if (existsSync(this.ACTIVE_PATH)) {
      await execAsync(`mv ${this.ACTIVE_PATH} ${tempPath}`);
    }

    // Move staging to active
    await execAsync(`mv ${this.STAGING_PATH} ${this.ACTIVE_PATH}`);

    // Remove old active
    if (existsSync(tempPath)) {
      await execAsync(`rm -rf ${tempPath}`);
    }

    this.log('✓ Atomic swap completed');
  }

  /**
   * Rollback to backup on failure
   */
  private async rollback(backupDate: string): Promise<void> {
    this.log('⚠️  ROLLBACK: Restoring from backup...');

    const backupDir = join(this.BACKUP_PATH, backupDate);

    if (!existsSync(backupDir)) {
      this.log(`❌ Backup not found: ${backupDir}`);
      return;
    }

    // Remove failed staging
    if (existsSync(this.STAGING_PATH)) {
      await execAsync(`rm -rf ${this.STAGING_PATH}`);
    }

    // Restore from backup (if active was corrupted)
    if (!existsSync(this.ACTIVE_PATH)) {
      await execAsync(`cp -r ${backupDir} ${this.ACTIVE_PATH}`);
      this.log('✓ Active database restored from backup');
    }

    this.log(`✅ Rollback completed - using backup from ${backupDate}`);
  }

  /**
   * Update database status in metadata
   */
  private async updateStatus(status: DBMetadata['status']): Promise<void> {
    const metadataPath = join(this.ACTIVE_PATH, 'metadata.json');

    let metadata: DBMetadata = {
      version: '1.0.0',
      timestamp: Date.now(),
      status,
      lastUpdateDuration: 0,
      recordCount: 0,
      cveDatabaseSize: 0,
      indexSize: 0,
      validationPassed: false,
    };

    if (existsSync(metadataPath)) {
      const existing = JSON.parse(readFileSync(metadataPath, 'utf8'));
      metadata = { ...existing, status, timestamp: Date.now() };
    }

    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    this.log(`Status updated: ${status}`);

    // Emit to monitoring
    this.monitoring.trackPerformance('dependency-check-status-change', 0, {
      newStatus: status,
      timestamp: Date.now(),
    });
  }

  /**
   * Cleanup old backups (keep last 3)
   */
  private async cleanupOldBackups(): Promise<void> {
    if (!existsSync(this.BACKUP_PATH)) return;

    const { stdout } = await execAsync(`ls -t ${this.BACKUP_PATH}`);
    const backups = stdout.trim().split('\n').filter(b => b);

    if (backups.length > 3) {
      const toDelete = backups.slice(3);
      for (const backup of toDelete) {
        const backupPath = join(this.BACKUP_PATH, backup);
        await execAsync(`rm -rf ${backupPath}`);
        this.log(`🗑️  Deleted old backup: ${backup}`);
      }
    }
  }

  /**
   * Notify monitoring of successful update
   */
  private async notifySuccess(duration: number, validation: ValidationResult): Promise<void> {
    this.monitoring.trackPerformance('dependency-check-update-success', duration, {
      databaseSizeMB: (validation.testResults.databaseSize / 1024 / 1024).toFixed(2),
      queryPerformanceMs: validation.testResults.queryPerformance,
      warnings: validation.warnings.length,
    });

    // Log to console for cron job output
    console.log(`✅ Dependency-Check update completed successfully in ${(duration / 1000).toFixed(2)}s`);
  }

  /**
   * Alert support team of failure
   */
  private async alertSupport(error: Error): Promise<void> {
    // Log to monitoring
    this.monitoring.trackPerformance('dependency-check-update-failure', 0, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Console error for cron job logs
    console.error('🚨 ALERT: Dependency-Check update failed');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    // TODO: Integrate with alerting system (Slack/PagerDuty/Email)
  }

  /**
   * Emit progress update
   */
  private emitProgress(stage: UpdateProgress['stage'], progress: number, message: string): void {
    const event: UpdateProgress = {
      stage,
      progress: Math.min(100, Math.max(0, progress)),
      message,
      timestamp: Date.now(),
    };

    // Track in monitoring for Grafana
    this.monitoring.trackPerformance('dependency-check-progress', 0, event);

    this.log(`[${progress.toFixed(0)}%] ${message}`);
  }

  /**
   * Utility: Get directory size
   */
  private async getDirectorySize(path: string): Promise<number> {
    const { stdout } = await execAsync(`du -sb ${path} | cut -f1`);
    return parseInt(stdout.trim());
  }

  /**
   * Utility: Log message
   */
  private log(message: string, logFile?: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    console.log(message);

    if (logFile) {
      appendFileSync(logFile, logMessage);
    }
  }

  /**
   * Acquire update lock
   */
  private async acquireLock(): Promise<void> {
    if (existsSync(this.LOCK_FILE)) {
      throw new Error('Lock already exists');
    }
    writeFileSync(this.LOCK_FILE, Date.now().toString());
    this.log('🔒 Update lock acquired');
  }

  /**
   * Release update lock
   */
  private async releaseLock(): Promise<void> {
    if (existsSync(this.LOCK_FILE)) {
      unlinkSync(this.LOCK_FILE);
      this.log('🔓 Update lock released');
    }
  }
}

// Export for cron job usage
export default DependencyCheckUpdater;
