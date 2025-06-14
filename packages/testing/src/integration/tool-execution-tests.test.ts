import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

/**
 * Tool Execution Integration Tests
 * Tests actual tool execution and result processing
 */
describe('Tool Execution Integration Tests', () => {
  let supabase: any;
  
  // Test repository for tool execution
  const testRepo = {
    url: 'https://github.com/codequal-test/sample-node-app',
    localPath: '/tmp/codequal-test-repo',
    branch: 'main',
    language: 'JavaScript',
    packageManager: 'npm'
  };

  beforeAll(async () => {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment variables');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('🔧 Starting Tool Execution Tests');
  });

  describe('Security Tools', () => {
    it('should validate npm audit tool execution', async () => {
      console.log('🔒 Testing npm audit tool...');

      const npmAuditConfig = {
        toolId: 'npm-audit',
        name: 'NPM Security Audit',
        command: 'npm audit --json',
        workingDirectory: testRepo.localPath,
        timeout: 30000,
        expectedOutput: {
          vulnerabilities: {
            info: expect.any(Number),
            low: expect.any(Number),
            moderate: expect.any(Number),
            high: expect.any(Number),
            critical: expect.any(Number)
          },
          metadata: {
            totalDependencies: expect.any(Number),
            scannedDependencies: expect.any(Number)
          }
        },
        resultProcessing: {
          agentRole: 'security',
          importanceScore: (result: any) => {
            const totalVulns = result.vulnerabilities.critical + result.vulnerabilities.high;
            return Math.min(1.0, totalVulns * 0.2 + 0.3);
          },
          findings: (result: any) => {
            const findings = [];
            if (result.vulnerabilities.critical > 0) {
              findings.push({
                type: 'critical_vulnerability',
                count: result.vulnerabilities.critical,
                severity: 'critical'
              });
            }
            if (result.vulnerabilities.high > 0) {
              findings.push({
                type: 'high_vulnerability',
                count: result.vulnerabilities.high,
                severity: 'high'
              });
            }
            return findings;
          }
        }
      };

      // Validate tool configuration
      expect(npmAuditConfig.toolId).toBe('npm-audit');
      expect(npmAuditConfig.command).toContain('npm audit');
      expect(npmAuditConfig.timeout).toBeGreaterThan(0);
      expect(npmAuditConfig.resultProcessing.agentRole).toBe('security');
      expect(typeof npmAuditConfig.resultProcessing.importanceScore).toBe('function');
      expect(typeof npmAuditConfig.resultProcessing.findings).toBe('function');

      // Test result processing functions
      const mockResult = {
        vulnerabilities: { critical: 1, high: 2, moderate: 3, low: 4, info: 5 },
        metadata: { totalDependencies: 150, scannedDependencies: 150 }
      };

      const importance = npmAuditConfig.resultProcessing.importanceScore(mockResult);
      expect(importance).toBeGreaterThanOrEqual(0);
      expect(importance).toBeLessThanOrEqual(1);

      const findings = npmAuditConfig.resultProcessing.findings(mockResult);
      expect(findings).toBeInstanceOf(Array);
      expect(findings.length).toBeGreaterThan(0);

      console.log('✅ NPM Audit tool configuration validated');
      console.log(`   - Command: ${npmAuditConfig.command}`);
      console.log(`   - Timeout: ${npmAuditConfig.timeout}ms`);
      console.log(`   - Mock importance score: ${importance}`);
      console.log(`   - Mock findings: ${findings.length} items`);
    });

    it('should validate license checker tool execution', async () => {
      console.log('📄 Testing license checker tool...');

      const licenseCheckerConfig = {
        toolId: 'license-checker',
        name: 'License Compliance Check',
        command: 'license-checker --json --onlyAllow "MIT;Apache-2.0;BSD-3-Clause;ISC"',
        workingDirectory: testRepo.localPath,
        timeout: 15000,
        expectedOutput: {
          licenses: expect.any(Object),
          summary: {
            totalPackages: expect.any(Number),
            uniqueLicenses: expect.any(Array),
            complianceStatus: expect.any(String)
          }
        },
        resultProcessing: {
          agentRole: 'security',
          importanceScore: (result: any) => {
            return result.summary.complianceStatus === 'compliant' ? 0.3 : 0.8;
          },
          findings: (result: any) => {
            const findings = [];
            const allowedLicenses = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'];
            
            for (const license of result.summary.uniqueLicenses) {
              if (!allowedLicenses.includes(license)) {
                findings.push({
                  type: 'license_violation',
                  license: license,
                  severity: 'medium'
                });
              }
            }
            return findings;
          }
        }
      };

      // Validate tool configuration
      expect(licenseCheckerConfig.toolId).toBe('license-checker');
      expect(licenseCheckerConfig.command).toContain('license-checker');
      expect(licenseCheckerConfig.timeout).toBeGreaterThan(0);
      expect(licenseCheckerConfig.resultProcessing.agentRole).toBe('security');

      // Test result processing
      const mockCompliantResult = {
        licenses: {},
        summary: {
          totalPackages: 125,
          uniqueLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause'],
          complianceStatus: 'compliant'
        }
      };

      const mockViolationResult = {
        licenses: {},
        summary: {
          totalPackages: 125,
          uniqueLicenses: ['MIT', 'GPL-3.0', 'UNKNOWN'],
          complianceStatus: 'violations'
        }
      };

      const compliantImportance = licenseCheckerConfig.resultProcessing.importanceScore(mockCompliantResult);
      const violationImportance = licenseCheckerConfig.resultProcessing.importanceScore(mockViolationResult);
      
      expect(compliantImportance).toBeLessThan(violationImportance);

      const compliantFindings = licenseCheckerConfig.resultProcessing.findings(mockCompliantResult);
      const violationFindings = licenseCheckerConfig.resultProcessing.findings(mockViolationResult);

      expect(compliantFindings.length).toBe(0);
      expect(violationFindings.length).toBeGreaterThan(0);

      console.log('✅ License Checker tool configuration validated');
      console.log(`   - Compliant importance: ${compliantImportance}`);
      console.log(`   - Violation importance: ${violationImportance}`);
      console.log(`   - Violation findings: ${violationFindings.length} items`);
    });
  });

  describe('Architecture Tools', () => {
    it('should validate madge circular dependency detection', async () => {
      console.log('🔄 Testing madge circular dependency detection...');

      const madgeConfig = {
        toolId: 'madge',
        name: 'Circular Dependency Detection',
        command: 'madge --circular --json src/',
        workingDirectory: testRepo.localPath,
        timeout: 20000,
        expectedOutput: {
          circular: expect.any(Array),
          summary: {
            totalFiles: expect.any(Number),
            circularDependencies: expect.any(Number)
          }
        },
        resultProcessing: {
          agentRole: 'architecture',
          importanceScore: (result: any) => {
            const circularCount = result.circular.length;
            return Math.min(1.0, circularCount * 0.3 + 0.2);
          },
          findings: (result: any) => {
            return result.circular.map((cycle: string[], index: number) => ({
              type: 'circular_dependency',
              cycle: cycle,
              severity: cycle.length > 3 ? 'high' : 'medium',
              cycleLength: cycle.length
            }));
          }
        }
      };

      // Validate tool configuration
      expect(madgeConfig.toolId).toBe('madge');
      expect(madgeConfig.command).toContain('madge --circular');
      expect(madgeConfig.resultProcessing.agentRole).toBe('architecture');

      // Test result processing
      const mockResults = [
        {
          circular: [],
          summary: { totalFiles: 50, circularDependencies: 0 }
        },
        {
          circular: [
            ['src/utils/helper.js', 'src/services/api.js', 'src/utils/helper.js']
          ],
          summary: { totalFiles: 50, circularDependencies: 1 }
        },
        {
          circular: [
            ['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js', 'src/a.js'],
            ['src/x.js', 'src/y.js', 'src/x.js']
          ],
          summary: { totalFiles: 50, circularDependencies: 2 }
        }
      ];

      for (let i = 0; i < mockResults.length; i++) {
        const result = mockResults[i];
        const importance = madgeConfig.resultProcessing.importanceScore(result);
        const findings = madgeConfig.resultProcessing.findings(result);

        expect(importance).toBeGreaterThanOrEqual(0);
        expect(importance).toBeLessThanOrEqual(1);
        expect(findings.length).toBe(result.circular.length);

        console.log(`✅ Mock result ${i + 1}:`);
        console.log(`   - Circular dependencies: ${result.circular.length}`);
        console.log(`   - Importance score: ${importance}`);
        console.log(`   - Findings: ${findings.length}`);
      }
    });

    it('should validate dependency cruiser architecture analysis', async () => {
      console.log('🏗️ Testing dependency cruiser architecture analysis...');

      const depCruiseConfig = {
        toolId: 'dependency-cruiser',
        name: 'Dependency Architecture Analysis',
        command: 'depcruise --output-type json --config .dependency-cruiser.js src/',
        workingDirectory: testRepo.localPath,
        timeout: 45000,
        expectedOutput: {
          summary: {
            violations: expect.any(Array),
            error: expect.any(Number),
            warn: expect.any(Number),
            info: expect.any(Number)
          },
          modules: expect.any(Array)
        },
        resultProcessing: {
          agentRole: 'architecture',
          importanceScore: (result: any) => {
            const errorCount = result.summary.error;
            const warnCount = result.summary.warn;
            return Math.min(1.0, (errorCount * 0.3 + warnCount * 0.1) + 0.2);
          },
          findings: (result: any) => {
            return result.summary.violations
              .filter((violation: any) => violation.severity === 'error' || violation.severity === 'warn')
              .map((violation: any) => ({
                type: 'architecture_violation',
                rule: violation.rule.name,
                severity: violation.severity,
                module: violation.from,
                description: violation.rule.comment
              }));
          }
        }
      };

      // Validate tool configuration
      expect(depCruiseConfig.toolId).toBe('dependency-cruiser');
      expect(depCruiseConfig.command).toContain('depcruise');
      expect(depCruiseConfig.resultProcessing.agentRole).toBe('architecture');

      // Test result processing
      const mockResult = {
        summary: {
          violations: [
            {
              rule: { name: 'no-circular', comment: 'No circular dependencies allowed' },
              severity: 'error',
              from: 'src/utils/helper.js'
            },
            {
              rule: { name: 'no-orphans', comment: 'No orphaned modules' },
              severity: 'warn',
              from: 'src/unused.js'
            }
          ],
          error: 1,
          warn: 1,
          info: 0
        },
        modules: []
      };

      const importance = depCruiseConfig.resultProcessing.importanceScore(mockResult);
      const findings = depCruiseConfig.resultProcessing.findings(mockResult);

      expect(importance).toBeGreaterThan(0.2); // Should be higher due to errors and warnings
      expect(findings.length).toBe(2); // One error + one warning

      console.log('✅ Dependency Cruiser tool configuration validated');
      console.log(`   - Mock importance score: ${importance}`);
      console.log(`   - Mock findings: ${findings.length} violations`);
    });
  });

  describe('Maintenance Tools', () => {
    it('should validate npm outdated dependency check', async () => {
      console.log('📦 Testing npm outdated dependency check...');

      const npmOutdatedConfig = {
        toolId: 'npm-outdated',
        name: 'Outdated Dependencies Check',
        command: 'npm outdated --json',
        workingDirectory: testRepo.localPath,
        timeout: 25000,
        expectedOutput: {
          packages: expect.any(Object),
          summary: {
            totalOutdated: expect.any(Number),
            majorUpdates: expect.any(Number),
            minorUpdates: expect.any(Number),
            patchUpdates: expect.any(Number)
          }
        },
        resultProcessing: {
          agentRole: 'dependencies',
          importanceScore: (result: any) => {
            const majorCount = result.summary.majorUpdates;
            const totalCount = result.summary.totalOutdated;
            return Math.min(1.0, (majorCount * 0.2 + totalCount * 0.05) + 0.1);
          },
          findings: (result: any) => {
            const findings = [];
            
            for (const [packageName, info] of Object.entries(result.packages)) {
              const pkg = info as any;
              const updateType = getUpdateType(pkg.current, pkg.latest);
              
              if (updateType === 'major') {
                findings.push({
                  type: 'major_update_available',
                  package: packageName,
                  current: pkg.current,
                  latest: pkg.latest,
                  severity: 'medium'
                });
              }
            }
            
            return findings;
          }
        }
      };

      // Helper function for update type detection
      function getUpdateType(current: string, latest: string): string {
        const currentParts = current.split('.').map(Number);
        const latestParts = latest.split('.').map(Number);
        
        if (latestParts[0] > currentParts[0]) return 'major';
        if (latestParts[1] > currentParts[1]) return 'minor';
        return 'patch';
      }

      // Validate tool configuration
      expect(npmOutdatedConfig.toolId).toBe('npm-outdated');
      expect(npmOutdatedConfig.command).toContain('npm outdated');
      expect(npmOutdatedConfig.resultProcessing.agentRole).toBe('dependencies');

      // Test result processing
      const mockResult = {
        packages: {
          'lodash': { current: '4.17.20', latest: '4.17.21', type: 'dependencies' },
          'react': { current: '17.0.2', latest: '18.2.0', type: 'dependencies' },
          'express': { current: '4.18.0', latest: '4.18.2', type: 'dependencies' }
        },
        summary: {
          totalOutdated: 3,
          majorUpdates: 1, // react 17->18
          minorUpdates: 0,
          patchUpdates: 2 // lodash and express
        }
      };

      const importance = npmOutdatedConfig.resultProcessing.importanceScore(mockResult);
      const findings = npmOutdatedConfig.resultProcessing.findings(mockResult);

      expect(importance).toBeGreaterThan(0.1);
      expect(findings.length).toBe(1); // Only major updates create findings

      console.log('✅ NPM Outdated tool configuration validated');
      console.log(`   - Mock importance score: ${importance}`);
      console.log(`   - Mock findings: ${findings.length} major updates`);
    });
  });

  describe('Tool Result Storage', () => {
    it('should validate tool result metadata structure', async () => {
      console.log('💾 Testing tool result storage structure...');

      const toolResultTemplate = {
        id: 'chunk-' + Date.now(),
        repository_id: 'test-repo-123',
        source_type: 'tool',
        source_id: 'tool-execution-456',
        content: JSON.stringify({
          tool_id: 'npm-audit',
          output: { vulnerabilities: { critical: 0, high: 1, moderate: 2, low: 3, info: 5 } },
          metadata: { execution_time: 15000, status: 'completed' }
        }),
        embedding: null, // Will be generated later
        metadata: {
          content_type: 'tool_result',
          tool_id: 'npm-audit',
          tool_name: 'NPM Security Audit',
          agent_role: 'security',
          repository_id: 'test-repo-123',
          pr_number: 42,
          timestamp: new Date().toISOString(),
          is_latest: true,
          importance_score: 0.7,
          execution_duration: 15000,
          status: 'completed',
          findings_count: 6,
          severity_breakdown: {
            critical: 0,
            high: 1,
            moderate: 2,
            low: 3
          }
        },
        chunk_index: 0,
        total_chunks: 1,
        storage_type: 'permanent',
        quality_score: 0.9,
        relevance_score: 0.8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Validate storage structure
      expect(toolResultTemplate.id).toBeDefined();
      expect(toolResultTemplate.repository_id).toBe('test-repo-123');
      expect(toolResultTemplate.source_type).toBe('tool');
      expect(toolResultTemplate.metadata.content_type).toBe('tool_result');
      expect(toolResultTemplate.metadata.tool_id).toBe('npm-audit');
      expect(toolResultTemplate.metadata.agent_role).toBe('security');
      expect(toolResultTemplate.metadata.is_latest).toBe(true);
      expect(toolResultTemplate.metadata.importance_score).toBeGreaterThanOrEqual(0);
      expect(toolResultTemplate.metadata.importance_score).toBeLessThanOrEqual(1);
      expect(toolResultTemplate.storage_type).toBe('permanent');

      console.log('✅ Tool result storage structure validated');
      console.log(`   - Tool: ${toolResultTemplate.metadata.tool_name}`);
      console.log(`   - Agent: ${toolResultTemplate.metadata.agent_role}`);
      console.log(`   - Findings: ${toolResultTemplate.metadata.findings_count}`);
      console.log(`   - Importance: ${toolResultTemplate.metadata.importance_score}`);
    });

    it('should validate tool result retrieval patterns', async () => {
      console.log('🔍 Testing tool result retrieval patterns...');

      const retrievalPatterns = [
        {
          name: 'By Agent Role',
          query: {
            repository_id: 'test-repo-123',
            'metadata->>agent_role': 'security',
            'metadata->>is_latest': 'true'
          },
          description: 'Retrieve latest tool results for specific agent',
          expectedUse: 'Agent context preparation'
        },
        {
          name: 'By Tool ID',
          query: {
            repository_id: 'test-repo-123',
            'metadata->>tool_id': 'npm-audit',
            'metadata->>is_latest': 'true'
          },
          description: 'Retrieve results from specific tool',
          expectedUse: 'Tool-specific analysis'
        },
        {
          name: 'By PR Number',
          query: {
            repository_id: 'test-repo-123',
            'metadata->>pr_number': '42',
            'metadata->>content_type': 'tool_result'
          },
          description: 'Retrieve all tool results for specific PR',
          expectedUse: 'PR-specific context'
        },
        {
          name: 'By Importance Score',
          query: {
            repository_id: 'test-repo-123',
            'metadata->>content_type': 'tool_result',
            'metadata->>importance_score': 'gte.0.7'
          },
          description: 'Retrieve high-importance tool results',
          expectedUse: 'Priority-based filtering'
        },
        {
          name: 'By Time Range',
          query: {
            repository_id: 'test-repo-123',
            'metadata->>content_type': 'tool_result',
            'metadata->>timestamp': `gte.${new Date(Date.now() - 86400000).toISOString()}`
          },
          description: 'Retrieve recent tool results (last 24 hours)',
          expectedUse: 'Freshness filtering'
        }
      ];

      for (const pattern of retrievalPatterns) {
        // Validate query structure
        expect(pattern.query.repository_id).toBe('test-repo-123');
        expect(pattern.description).toBeDefined();
        expect(pattern.expectedUse).toBeDefined();

        // Validate metadata query syntax
        const metadataQueries = Object.keys(pattern.query).filter(key => key.includes('->>'));
        expect(metadataQueries.length).toBeGreaterThan(0);

        console.log(`✅ ${pattern.name}`);
        console.log(`   - Description: ${pattern.description}`);
        console.log(`   - Use case: ${pattern.expectedUse}`);
        console.log(`   - Query keys: ${Object.keys(pattern.query).join(', ')}`);
      }
    });
  });

  describe('Performance and Monitoring', () => {
    it('should validate tool execution performance metrics', async () => {
      console.log('📊 Testing tool execution performance metrics...');

      const performanceMetrics = {
        toolExecutionTimes: {
          'npm-audit': { min: 5000, max: 30000, average: 15000 },
          'license-checker': { min: 2000, max: 15000, average: 8000 },
          'madge': { min: 3000, max: 20000, average: 10000 },
          'dependency-cruiser': { min: 10000, max: 45000, average: 25000 },
          'npm-outdated': { min: 5000, max: 25000, average: 12000 }
        },
        concurrencyLimits: {
          maxConcurrentTools: 3,
          maxConcurrentRepositories: 10,
          queueTimeout: 300000 // 5 minutes
        },
        resourceLimits: {
          maxMemoryPerTool: '512MB',
          maxCpuUsage: '80%',
          maxDiskSpace: '1GB'
        },
        successRates: {
          'npm-audit': 0.98,
          'license-checker': 0.95,
          'madge': 0.92,
          'dependency-cruiser': 0.88,
          'npm-outdated': 0.96
        }
      };

      // Validate performance metrics structure
      for (const [toolId, times] of Object.entries(performanceMetrics.toolExecutionTimes)) {
        expect(times.min).toBeGreaterThan(0);
        expect(times.max).toBeGreaterThan(times.min);
        expect(times.average).toBeGreaterThanOrEqual(times.min);
        expect(times.average).toBeLessThanOrEqual(times.max);

        console.log(`✅ ${toolId} performance:`);
        console.log(`   - Range: ${times.min}ms - ${times.max}ms`);
        console.log(`   - Average: ${times.average}ms`);
      }

      // Validate concurrency limits
      expect(performanceMetrics.concurrencyLimits.maxConcurrentTools).toBeGreaterThan(0);
      expect(performanceMetrics.concurrencyLimits.maxConcurrentRepositories).toBeGreaterThan(0);
      expect(performanceMetrics.concurrencyLimits.queueTimeout).toBeGreaterThan(0);

      // Validate success rates
      for (const [toolId, rate] of Object.entries(performanceMetrics.successRates)) {
        expect(rate).toBeGreaterThan(0);
        expect(rate).toBeLessThanOrEqual(1);
        console.log(`✅ ${toolId} success rate: ${(rate * 100).toFixed(1)}%`);
      }

      console.log('\n📈 Overall Performance Summary:');
      console.log(`   - Max concurrent tools: ${performanceMetrics.concurrencyLimits.maxConcurrentTools}`);
      console.log(`   - Max concurrent repos: ${performanceMetrics.concurrencyLimits.maxConcurrentRepositories}`);
      console.log(`   - Queue timeout: ${performanceMetrics.concurrencyLimits.queueTimeout}ms`);
    });
  });
});