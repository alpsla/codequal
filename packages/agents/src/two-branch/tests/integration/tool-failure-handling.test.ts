/**
 * Tool Failure Handling Test
 * 
 * Demonstrates the difference between silent failure (bad) and explicit handling (good)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { JavaSecurityAgent } from '../../agents/JavaSecurityAgent';
import { ImprovedJavaSecurityAgent } from '../../agents/ImprovedJavaSecurityAgent';
import { toolAvailabilityManager, ToolMode } from '../../agents/ToolAvailabilityManager';

describe('Tool Failure Handling Comparison', () => {
  const testPath = '/tmp/test-java-project';
  
  beforeEach(() => {
    // Clear any cached tool checks
    toolAvailabilityManager.clearCache();
  });
  
  describe('Current JavaSecurityAgent (Silent Failure)', () => {
    it('silently returns mock data when tools are missing', async () => {
      const agent = new JavaSecurityAgent();
      
      const result = await agent.analyze({
        targetPath: testPath,
        language: 'java'
      });
      
      // The test passes, but this is the problem!
      expect(result).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
      
      // Check if we got mock data
      const hasMockData = result.issues.some(issue => 
        issue.details?.includes('Mock finding')
      );
      
      console.log('\n❌ PROBLEM: Current agent silently returns mock data!');
      console.log(`   - Issues returned: ${result.issues.length}`);
      console.log(`   - Contains mock data: ${hasMockData}`);
      console.log(`   - User has no idea they're getting fake results!`);
      
      expect(hasMockData).toBe(true); // This is bad!
    });
    
    it('provides no indication that analysis is degraded', async () => {
      const agent = new JavaSecurityAgent();
      
      const result = await agent.analyze({
        targetPath: testPath,
        language: 'java'
      });
      
      // Check metadata for any indication of degradation
      const hasDegradationWarning = 
        result.metadata.degraded || 
        result.metadata.warning ||
        result.metadata.isMocked;
      
      console.log('\n❌ PROBLEM: No degradation indicators!');
      console.log(`   - Metadata has degradation warning: ${hasDegradationWarning}`);
      console.log(`   - Tools failed: ${result.metadata.toolsFailed}`);
      
      // This should be true but it's false!
      expect(hasDegradationWarning).toBeFalsy();
    });
  });
  
  describe('ImprovedJavaSecurityAgent (Explicit Handling)', () => {
    it('fails explicitly in STRICT mode when tools are missing', async () => {
      // Set strict mode
      toolAvailabilityManager.setMode(ToolMode.STRICT);
      
      const agent = new ImprovedJavaSecurityAgent();
      
      const result = await agent.analyze({
        targetPath: testPath,
        language: 'java'
      });
      
      console.log('\n✅ GOOD: Improved agent fails explicitly in STRICT mode!');
      console.log(`   - Error message: ${result.metadata.error}`);
      console.log(`   - Status: ${result.summary.status}`);
      console.log(`   - User knows exactly what's wrong!`);
      
      expect(result.summary.status).toBe('failed');
      expect(result.metadata.error).toContain('Required tools not installed');
    });
    
    it('also fails in DEGRADED mode (no mocks allowed)', async () => {
      // Set degraded mode
      toolAvailabilityManager.setMode(ToolMode.DEGRADED);
      
      const agent = new ImprovedJavaSecurityAgent();
      
      const result = await agent.analyze({
        targetPath: testPath,
        language: 'java'
      });
      
      console.log('\n✅ GOOD: DEGRADED mode also fails (no mocks)!');
      console.log(`   - Status: ${result.summary.status}`);
      console.log(`   - Error: ${result.metadata.error}`);
      console.log(`   - Mode: ${result.metadata.mode}`);
      console.log(`   - No mock data used - fails properly!`);
      
      expect(result.summary.status).toBe('failed');
      expect(result.metadata.error).toContain('DEGRADED MODE');
      expect(result.metadata.error).toContain('Install them or use MOCK mode');
    });
    
    it('only uses mock in development with explicit flag', async () => {
      // Set mock mode (for development)
      process.env.NODE_ENV = 'development';
      process.env.ALLOW_MOCK_TOOLS = 'true';
      toolAvailabilityManager.setMode(ToolMode.MOCK);
      
      const agent = new ImprovedJavaSecurityAgent();
      
      const result = await agent.analyze({
        targetPath: testPath,
        language: 'java'
      });
      
      console.log('\n✅ GOOD: Mock only used with explicit permission!');
      console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`   - ALLOW_MOCK_TOOLS: ${process.env.ALLOW_MOCK_TOOLS}`);
      console.log(`   - Mock data clearly marked in results`);
      
      // Even in mock mode, data should be marked
      const hasMockIndicator = result.issues.some(issue =>
        issue.details?.includes('MOCK DATA')
      );
      
      expect(hasMockIndicator).toBe(true);
      
      // Clean up
      delete process.env.ALLOW_MOCK_TOOLS;
    });
  });
  
  describe('Health Check System', () => {
    it('provides health status endpoint', async () => {
      // Check some tools to populate the cache
      await toolAvailabilityManager.checkTool('spotbugs');
      await toolAvailabilityManager.checkTool('pmd');
      await toolAvailabilityManager.checkTool('checkstyle');
      
      const health = await toolAvailabilityManager.getHealthStatus();
      
      console.log('\n📊 Health Check Results:');
      console.log(`   - Status: ${health.status}`);
      console.log(`   - Mode: ${health.mode}`);
      console.log(`   - Missing tools: ${health.missingTools.join(', ') || 'none'}`);
      console.log(`   - Recommendations:`);
      health.recommendations.forEach(rec => {
        console.log(`     • ${rec}`);
      });
      
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.missingTools).toBeDefined();
      expect(health.recommendations).toBeDefined();
    });
    
    it('can be monitored for degradation', async () => {
      const health = await toolAvailabilityManager.getHealthStatus();
      
      // In production, this would trigger alerts
      if (health.status === 'degraded' || health.status === 'unhealthy') {
        console.log('\n🚨 ALERT: System is degraded!');
        console.log(`   - Would send alert to: PagerDuty, Slack, etc.`);
        console.log(`   - Would log to: Datadog, CloudWatch, etc.`);
        console.log(`   - Would update dashboard: Grafana, New Relic, etc.`);
      }
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });
  
  describe('Comparison Summary', () => {
    it('shows why explicit failure handling is better', () => {
      console.log('\n' + '='.repeat(60));
      console.log('COMPARISON SUMMARY');
      console.log('='.repeat(60));
      
      console.log('\n❌ Current Approach (Silent Failure):');
      console.log('  • Tools missing → Returns mock data');
      console.log('  • No error indication');
      console.log('  • User thinks analysis is real');
      console.log('  • SECURITY RISK: False sense of security');
      
      console.log('\n✅ Improved Approach (No Silent Failures):');
      console.log('  • STRICT mode → Fails immediately with error');
      console.log('  • DEGRADED mode → Also fails (no mocks!)');
      console.log('  • MOCK mode → ONLY for dev with explicit flag');
      console.log('  • Never returns mock data without permission');
      
      console.log('\n📊 Environment-Based Behavior:');
      console.log('  • Production → STRICT (fail immediately)');
      console.log('  • Staging → DEGRADED (fail with warning)');
      console.log('  • Development → MOCK (ONLY with ALLOW_MOCK_TOOLS=true)');
      console.log('  • CI/CD → STRICT (catch issues early)');
      console.log('  • Default → STRICT (safest option)');
      
      console.log('\n🔧 Configuration:');
      console.log('  • TOOL_MODE=strict|degraded|mock');
      console.log('  • ALLOW_MOCK_TOOLS=true (dev only)');
      console.log('  • NODE_ENV=production|development|test');
      
      console.log('\n' + '='.repeat(60));
      
      expect(true).toBe(true); // Just for demonstration
    });
  });
});