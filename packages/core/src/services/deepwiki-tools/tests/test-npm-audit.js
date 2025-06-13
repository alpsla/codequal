#!/usr/bin/env node

/**
 * Test npm-audit on the root repository
 */

const path = require('path');
const { ToolRunnerService } = require('../../../../../../../packages/core/dist/services/deepwiki-tools/tool-runner.service.js');

const logger = {
  info: (msg, meta) => console.log('[INFO]', msg, meta || ''),
  warn: (msg, meta) => console.warn('[WARN]', msg, meta || ''),
  error: (msg, meta) => console.error('[ERROR]', msg, meta || ''),
  debug: (msg, meta) => console.debug('[DEBUG]', msg, meta || '')
};

const toolRunner = new ToolRunnerService(logger);
const rootPath = path.join(__dirname, '../../../../../../../');

console.log('🔒 Testing npm-audit on root repository...\n');

toolRunner.runTools({
  repositoryPath: rootPath,
  enabledTools: ['npm-audit'],
  timeout: 30000
}).then(results => {
  const auditResult = results['npm-audit'];
  if (auditResult) {
    if (auditResult.success) {
      console.log('✅ npm-audit: Success!');
      console.log(`   Total vulnerabilities: ${auditResult.metadata?.totalVulnerabilities || 0}`);
      const vulns = auditResult.metadata?.vulnerabilities || {};
      console.log(`   - Critical: ${vulns.critical || 0}`);
      console.log(`   - High: ${vulns.high || 0}`);
      console.log(`   - Moderate: ${vulns.moderate || 0}`);
      console.log(`   - Low: ${vulns.low || 0}`);
    } else {
      console.log('❌ npm-audit failed:', auditResult.error);
    }
  } else {
    console.log('⚠️  npm-audit was not run (no package-lock.json?)');
  }
}).catch(error => {
  console.error('Error:', error);
});
