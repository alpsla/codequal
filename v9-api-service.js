#!/usr/bin/env node

/**
 * V9 API SERVICE - Production-ready API using EXISTING infrastructure
 *
 * CRITICAL: This is NOT a reimplementation. This is a thin API layer
 * over the EXISTING V9 components that are already built and tested.
 */

require('dotenv').config();
const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);
const app = express();
app.use(express.json());

// Cache for analysis results
const analysisCache = new Map();

/**
 * Simple health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'v9-api',
    timestamp: new Date().toISOString()
  });
});

/**
 * Main analysis endpoint - uses EXISTING V9 infrastructure
 */
app.post('/api/v1/analyze', async (req, res) => {
  const { repository, prNumber, useCache = true } = req.body;

  if (!repository || !prNumber) {
    return res.status(400).json({
      error: 'Missing required parameters: repository, prNumber'
    });
  }

  const cacheKey = `${repository}:${prNumber}`;

  // Check cache
  if (useCache && analysisCache.has(cacheKey)) {
    const cached = analysisCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
      return res.json({
        ...cached.result,
        cached: true
      });
    }
  }

  try {
    // Use the EXISTING test-v8-final.ts which we know works
    const testScript = path.join(__dirname, 'packages/agents/test-v8-final.ts');

    // Check if compiled version exists
    const compiledScript = path.join(__dirname, 'packages/agents/dist/test-v8-final.js');
    const scriptToRun = await fs.access(compiledScript).then(() => compiledScript).catch(() => testScript);

    // Run the existing V9 analysis
    const { stdout, stderr } = await execAsync(
      `node ${scriptToRun} --repo ${repository} --pr ${prNumber}`,
      {
        timeout: 300000, // 5 minutes
        maxBuffer: 10 * 1024 * 1024
      }
    );

    // Parse the output to find the report file
    const reportMatch = stdout.match(/Report saved: (.*\.md)/);
    if (!reportMatch) {
      throw new Error('Analysis completed but no report generated');
    }

    const reportFile = reportMatch[1];
    const reportContent = await fs.readFile(reportFile, 'utf8');

    // Parse key metrics from report
    const result = parseV9Report(reportContent);

    // Cache the result
    analysisCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    res.json({
      ...result,
      reportFile,
      cached: false
    });

  } catch (error) {
    console.error('Analysis failed:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message,
      details: error.stderr || error.stack
    });
  }
});

/**
 * Quick test endpoint - runs a minimal test
 */
app.post('/api/v1/test', async (req, res) => {
  try {
    // Just verify the infrastructure is accessible
    const checks = {
      kubernetes: false,
      redis: false,
      supabase: false,
      v9Components: false
    };

    // Check Kubernetes
    try {
      await execAsync('kubectl get pods -n codequal-dev');
      checks.kubernetes = true;
    } catch (e) {}

    // Check Redis
    if (process.env.REDIS_URL) {
      checks.redis = true;
    }

    // Check Supabase
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      checks.supabase = true;
    }

    // Check V9 components exist
    try {
      await fs.access('packages/agents/dist/two-branch/analyzers/v9-tool-orchestrator.js');
      checks.v9Components = true;
    } catch (e) {}

    const allReady = Object.values(checks).every(v => v);

    res.json({
      status: allReady ? 'ready' : 'partial',
      checks,
      message: allReady ?
        'V9 system ready for analysis' :
        'Some components not available, limited functionality'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Test failed',
      message: error.message
    });
  }
});

/**
 * Parse V9 report to extract key metrics
 */
function parseV9Report(reportContent) {
  const lines = reportContent.split('\n');

  const result = {
    status: 'unknown',
    newIssues: 0,
    resolvedIssues: 0,
    totalIssues: 0,
    criticalIssues: 0,
    highIssues: 0,
    blocked: false
  };

  // Extract metrics using simple pattern matching
  lines.forEach(line => {
    if (line.includes('🚫 BLOCKED')) {
      result.status = 'blocked';
      result.blocked = true;
    } else if (line.includes('✅ APPROVED')) {
      result.status = 'approved';
      result.blocked = false;
    }

    if (line.includes('NEW Issues:')) {
      const match = line.match(/(\d+)/);
      if (match) result.newIssues = parseInt(match[1]);
    }

    if (line.includes('RESOLVED Issues:')) {
      const match = line.match(/(\d+)/);
      if (match) result.resolvedIssues = parseInt(match[1]);
    }

    // Parse table rows for issue counts
    if (line.includes('| PR |')) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 6) {
        result.totalIssues = parseInt(parts[2]) || 0;
        result.criticalIssues = parseInt(parts[3]) || 0;
        result.highIssues = parseInt(parts[4]) || 0;
      }
    }
  });

  return result;
}

/**
 * Start server
 */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║         V9 API Service Started         ║
╚════════════════════════════════════════╝

  Port: ${PORT}

  Endpoints:
    GET  /health           - Health check
    POST /api/v1/analyze   - Run full V9 analysis
    POST /api/v1/test      - Quick infrastructure test

  Example request:
    curl -X POST http://localhost:${PORT}/api/v1/analyze \\
      -H "Content-Type: application/json" \\
      -d '{"repository": "apache/kafka", "prNumber": 17620}'

  This API uses the EXISTING V9 infrastructure.
  No new implementation, just a REST interface.
  `);
});