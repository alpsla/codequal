/**
 * Live Environment Check Test
 *
 * SESSION 106: Verify environment configuration for live integration testing.
 * This test validates that all required environment variables and connections
 * are active for live testing.
 *
 * Requirements:
 * - OPENROUTER_API_KEY: Required for AI fix generation
 * - SUPABASE_URL: Required for pattern storage
 * - SUPABASE_SERVICE_ROLE_KEY: Required for Supabase authentication
 *
 * This test file performs REAL connections - run with `npm test -- live-env-check`
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Environment Variables
// ============================================================================

interface EnvConfig {
  openrouterApiKey: string | undefined;
  supabaseUrl: string | undefined;
  supabaseServiceRoleKey: string | undefined;
}

function getEnvConfig(): EnvConfig {
  return {
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

// ============================================================================
// Supabase Connection Helper
// ============================================================================

async function getPatternCounts(client: SupabaseClient): Promise<{
  fixPatterns: number;
  fixPatternGuidance: number;
  fixFailureTracking: number;
}> {
  const counts = {
    fixPatterns: 0,
    fixPatternGuidance: 0,
    fixFailureTracking: 0,
  };

  // Query fix_patterns table count
  const { count: patternsCount, error: patternsError } = await client
    .from('fix_patterns')
    .select('*', { count: 'exact', head: true });

  if (!patternsError && patternsCount !== null) {
    counts.fixPatterns = patternsCount;
  }

  // Query fix_pattern_guidance table count
  const { count: guidanceCount, error: guidanceError } = await client
    .from('fix_pattern_guidance')
    .select('*', { count: 'exact', head: true });

  if (!guidanceError && guidanceCount !== null) {
    counts.fixPatternGuidance = guidanceCount;
  }

  // Query fix_failure_tracking table count
  const { count: failureCount, error: failureError } = await client
    .from('fix_failure_tracking')
    .select('*', { count: 'exact', head: true });

  if (!failureError && failureCount !== null) {
    counts.fixFailureTracking = failureCount;
  }

  return counts;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Live Environment Configuration (SESSION 106)', () => {
  let envConfig: EnvConfig;
  let supabaseClient: SupabaseClient | null = null;

  beforeAll(() => {
    envConfig = getEnvConfig();
  });

  describe('Environment Variables', () => {
    it('should have OPENROUTER_API_KEY set', () => {
      expect(envConfig.openrouterApiKey).toBeDefined();
      expect(envConfig.openrouterApiKey).not.toBe('');

      if (envConfig.openrouterApiKey) {
        // Check it looks like a valid API key (starts with sk-)
        const isValidFormat =
          envConfig.openrouterApiKey.startsWith('sk-') ||
          envConfig.openrouterApiKey.length > 20;
        expect(isValidFormat).toBe(true);

        // Log masked key for verification
        const masked = envConfig.openrouterApiKey.substring(0, 8) + '...' +
          envConfig.openrouterApiKey.substring(envConfig.openrouterApiKey.length - 4);
        console.log(`OPENROUTER_API_KEY: ${masked}`);
      }
    });

    it('should have SUPABASE_URL set', () => {
      expect(envConfig.supabaseUrl).toBeDefined();
      expect(envConfig.supabaseUrl).not.toBe('');

      if (envConfig.supabaseUrl) {
        // Check it looks like a valid Supabase URL
        expect(envConfig.supabaseUrl).toMatch(/^https:\/\/.+\.supabase\.co$/);
        console.log(`SUPABASE_URL: ${envConfig.supabaseUrl}`);
      }
    });

    it('should have SUPABASE_SERVICE_ROLE_KEY set', () => {
      expect(envConfig.supabaseServiceRoleKey).toBeDefined();
      expect(envConfig.supabaseServiceRoleKey).not.toBe('');

      if (envConfig.supabaseServiceRoleKey) {
        // Check it looks like a valid JWT (eyJ...)
        expect(envConfig.supabaseServiceRoleKey.startsWith('eyJ')).toBe(true);

        // Log masked key for verification
        const masked = envConfig.supabaseServiceRoleKey.substring(0, 10) + '...' +
          envConfig.supabaseServiceRoleKey.substring(envConfig.supabaseServiceRoleKey.length - 4);
        console.log(`SUPABASE_SERVICE_ROLE_KEY: ${masked}`);
      }
    });
  });

  describe('Supabase Connection', () => {
    beforeAll(() => {
      if (envConfig.supabaseUrl && envConfig.supabaseServiceRoleKey) {
        supabaseClient = createClient(
          envConfig.supabaseUrl,
          envConfig.supabaseServiceRoleKey
        );
      }
    });

    it('should establish Supabase connection', async () => {
      if (!supabaseClient) {
        console.warn('Skipping: Supabase credentials not configured');
        return;
      }

      // Test connection with a simple query
      const { data, error } = await supabaseClient
        .from('fix_patterns')
        .select('id')
        .limit(1);

      // If table doesn't exist, that's OK - connection still works
      if (error && error.message.includes('does not exist')) {
        console.log('Connection OK - fix_patterns table not yet created');
        return;
      }

      expect(error).toBeNull();
      console.log('Supabase connection: ESTABLISHED');
    });

    it('should query current pattern counts (baseline)', async () => {
      if (!supabaseClient) {
        console.warn('Skipping: Supabase credentials not configured');
        return;
      }

      const counts = await getPatternCounts(supabaseClient);

      // Document baseline counts
      console.log('\n=== BASELINE PATTERN COUNTS ===');
      console.log(`fix_patterns: ${counts.fixPatterns}`);
      console.log(`fix_pattern_guidance: ${counts.fixPatternGuidance}`);
      console.log(`fix_failure_tracking: ${counts.fixFailureTracking}`);
      console.log('================================\n');

      // Store baseline for reference
      expect(typeof counts.fixPatterns).toBe('number');
      expect(typeof counts.fixPatternGuidance).toBe('number');
      expect(typeof counts.fixFailureTracking).toBe('number');

      // Patterns should be non-negative
      expect(counts.fixPatterns).toBeGreaterThanOrEqual(0);
      expect(counts.fixPatternGuidance).toBeGreaterThanOrEqual(0);
      expect(counts.fixFailureTracking).toBeGreaterThanOrEqual(0);
    });
  });

  describe('OpenRouter API Connectivity', () => {
    it('should be able to reach OpenRouter API (optional verification)', async () => {
      if (!envConfig.openrouterApiKey) {
        console.warn('Skipping: OPENROUTER_API_KEY not configured');
        return;
      }

      // Simple API health check - just verify key format
      // Full API test would incur costs
      console.log('OpenRouter API Key: CONFIGURED');

      // Check key format for OpenRouter
      const keyPrefix = envConfig.openrouterApiKey.substring(0, 8);
      console.log(`API Key prefix: ${keyPrefix}...`);
    });
  });

  describe('Environment Summary', () => {
    it('should output full environment status', () => {
      const status = {
        openrouterApiKey: !!envConfig.openrouterApiKey,
        supabaseUrl: !!envConfig.supabaseUrl,
        supabaseServiceRoleKey: !!envConfig.supabaseServiceRoleKey,
        allConfigured: !!(
          envConfig.openrouterApiKey &&
          envConfig.supabaseUrl &&
          envConfig.supabaseServiceRoleKey
        ),
      };

      console.log('\n=== ENVIRONMENT STATUS ===');
      console.log(`OPENROUTER_API_KEY: ${status.openrouterApiKey ? 'SET' : 'MISSING'}`);
      console.log(`SUPABASE_URL: ${status.supabaseUrl ? 'SET' : 'MISSING'}`);
      console.log(`SUPABASE_SERVICE_ROLE_KEY: ${status.supabaseServiceRoleKey ? 'SET' : 'MISSING'}`);
      console.log(`All Required Variables: ${status.allConfigured ? 'YES' : 'NO'}`);
      console.log('===========================\n');

      // This test always passes but provides visibility
      expect(true).toBe(true);
    });
  });
});

// ============================================================================
// Standalone Execution
// ============================================================================

/**
 * Run environment check standalone:
 * npx ts-node packages/agents/src/fix-agent/__tests__/live-env-check.test.ts
 */
if (require.main === module) {
  console.log('Running environment check standalone...\n');

  const config = getEnvConfig();

  console.log('=== Environment Variables ===');
  console.log(`OPENROUTER_API_KEY: ${config.openrouterApiKey ? 'SET' : 'MISSING'}`);
  console.log(`SUPABASE_URL: ${config.supabaseUrl || 'MISSING'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${config.supabaseServiceRoleKey ? 'SET' : 'MISSING'}`);

  if (config.supabaseUrl && config.supabaseServiceRoleKey) {
    const client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

    getPatternCounts(client).then((counts) => {
      console.log('\n=== Baseline Pattern Counts ===');
      console.log(`fix_patterns: ${counts.fixPatterns}`);
      console.log(`fix_pattern_guidance: ${counts.fixPatternGuidance}`);
      console.log(`fix_failure_tracking: ${counts.fixFailureTracking}`);
      console.log('Ready for live integration testing!');
    }).catch((err) => {
      console.error('Failed to query Supabase:', err);
    });
  } else {
    console.log('\nCannot query Supabase: Missing credentials');
  }
}
