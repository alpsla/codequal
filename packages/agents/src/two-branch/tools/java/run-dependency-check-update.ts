#!/usr/bin/env ts-node

/**
 * Cron Job Runner - Dependency-Check Database Update
 *
 * Runs directly on Oracle Cloud VM (not in container)
 * Executed by system cron at 2 AM daily
 *
 * Usage:
 *   crontab -e
 *   0 2 * * * /usr/bin/ts-node /opt/codequal/packages/agents/src/two-branch/tools/java/run-dependency-check-update.ts >> /data/dependency-check/logs/cron.log 2>&1
 *
 * @author CodeQual Team
 * @date 2025-09-30
 */

import DependencyCheckUpdater from './dependency-check-updater';

async function main() {
  console.log('='.repeat(80));
  console.log('🔄 Dependency-Check Daily Update');
  console.log('='.repeat(80));
  console.log(`⏰ Start Time: ${new Date().toISOString()}`);
  const os = await import('os');
  console.log(`🖥️  Hostname: ${os.hostname()}`);
  console.log(`👤 User: ${process.env.USER || 'unknown'}`);
  console.log(`📁 Working Dir: ${process.cwd()}`);
  console.log(`🔑 NVD API Key: ${process.env.NVD_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log('='.repeat(80));
  console.log('');

  // Validate environment
  if (!process.env.NVD_API_KEY) {
    console.error('❌ ERROR: NVD_API_KEY environment variable not set');
    console.error('');
    console.error('Please set it:');
    console.error('  export NVD_API_KEY="your-api-key"');
    console.error('  echo \'export NVD_API_KEY="your-key"\' >> ~/.bashrc');
    console.error('');
    process.exit(1);
  }

  const updater = new DependencyCheckUpdater();
  const startTime = Date.now();

  try {
    await updater.performDailyUpdate();

    const duration = Date.now() - startTime;
    const durationMin = (duration / 60000).toFixed(2);

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ UPDATE COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log(`⏱️  Duration: ${durationMin} minutes`);
    console.log(`⏰ End Time: ${new Date().toISOString()}`);
    console.log('='.repeat(80));

    process.exit(0);

  } catch (error) {
    const duration = Date.now() - startTime;
    const durationMin = (duration / 60000).toFixed(2);

    console.error('');
    console.error('='.repeat(80));
    console.error('❌ UPDATE FAILED');
    console.error('='.repeat(80));
    console.error(`⏱️  Duration: ${durationMin} minutes (before failure)`);
    console.error(`⏰ Failure Time: ${new Date().toISOString()}`);
    console.error('');
    console.error('Error Message:');
    console.error(error.message);
    console.error('');
    console.error('Stack Trace:');
    console.error(error.stack);
    console.error('='.repeat(80));

    // Alert should be sent by the updater itself
    console.error('');
    console.error('🚨 Support has been alerted');
    console.error('');

    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run
main();
