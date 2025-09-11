/**
 * Tests for GitHub Security Agent
 */

import { GitHubSecurityAgent } from '../GitHubSecurityAgent';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GitHubSecurityAgent', () => {
  let agent: GitHubSecurityAgent;
  let mockGitHubApi: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock GitHub API client
    mockGitHubApi = {
      get: jest.fn()
    };
    
    mockedAxios.create.mockReturnValue(mockGitHubApi);
    
    // Create agent instance
    agent = new GitHubSecurityAgent();
  });
  
  describe('analyze', () => {
    it('should fetch all GitHub security data in parallel', async () => {
      // Mock Dependabot response
      mockGitHubApi.get.mockImplementation((url: string) => {
        if (url.includes('dependabot')) {
          return Promise.resolve({
            data: [{
              number: 1,
              state: 'open',
              severity: 'high',
              security_vulnerability: {
                package: {
                  name: 'lodash',
                  ecosystem: 'npm'
                },
                severity: 'high',
                vulnerable_version_range: '< 4.17.21',
                first_patched_version: {
                  identifier: '4.17.21'
                }
              },
              security_advisory: {
                cve_id: 'CVE-2021-23337',
                description: 'Prototype pollution vulnerability',
                severity: 'high'
              },
              created_at: '2024-01-01T00:00:00Z',
              html_url: 'https://github.com/owner/repo/security/dependabot/1'
            }]
          });
        }
        
        if (url.includes('code-scanning')) {
          return Promise.resolve({
            data: [{
              number: 2,
              state: 'open',
              rule: {
                id: 'js/sql-injection',
                name: 'SQL injection',
                description: 'User input used in SQL query',
                severity: 'high'
              },
              most_recent_instance: {
                location: {
                  path: 'src/api/users.js',
                  start_line: 45,
                  end_line: 47
                },
                message: {
                  text: 'User input flows into SQL query'
                }
              },
              tool: {
                name: 'CodeQL',
                version: '2.15.0'
              },
              created_at: '2024-01-02T00:00:00Z',
              html_url: 'https://github.com/owner/repo/security/code-scanning/2'
            }]
          });
        }
        
        if (url.includes('secret-scanning')) {
          return Promise.resolve({
            data: [{
              number: 3,
              state: 'open',
              secret_type: 'aws_access_key_id',
              secret_type_display_name: 'AWS Access Key ID',
              locations: [{
                type: 'commit',
                details: {
                  path: 'config/aws.js',
                  start_line: 12,
                  end_line: 12,
                  start_column: 20,
                  end_column: 60
                }
              }],
              created_at: '2024-01-03T00:00:00Z',
              html_url: 'https://github.com/owner/repo/security/secret-scanning/3'
            }]
          });
        }
        
        if (url.includes('security-advisories')) {
          return Promise.resolve({
            data: [{
              severity: 'moderate',
              summary: 'Denial of Service vulnerability',
              description: 'A specially crafted request can cause DoS',
              cve_id: 'CVE-2024-12345',
              published_at: '2024-01-04T00:00:00Z'
            }]
          });
        }
        
        return Promise.resolve({ data: [] });
      });
      
      // Run analysis
      const result = await agent.analyze({
        repoUrl: 'https://github.com/owner/repo',
        language: 'javascript'
      });
      
      // Verify all tools were called
      expect(mockGitHubApi.get).toHaveBeenCalledTimes(4);
      expect(mockGitHubApi.get).toHaveBeenCalledWith(
        '/repos/owner/repo/dependabot/alerts',
        expect.any(Object)
      );
      expect(mockGitHubApi.get).toHaveBeenCalledWith(
        '/repos/owner/repo/code-scanning/alerts',
        expect.any(Object)
      );
      expect(mockGitHubApi.get).toHaveBeenCalledWith(
        '/repos/owner/repo/secret-scanning/alerts',
        expect.any(Object)
      );
      expect(mockGitHubApi.get).toHaveBeenCalledWith(
        '/repos/owner/repo/security-advisories',
        expect.any(Object)
      );
      
      // Verify results
      expect(result.agent).toBe('GitHubSecurityAgent');
      expect(result.tools).toContain('github-dependabot');
      expect(result.tools).toContain('github-code-scanning');
      expect(result.tools).toContain('github-secret-scanning');
      expect(result.tools).toContain('github-security-advisories');
      
      // Verify issues were parsed correctly
      expect(result.issues.length).toBeGreaterThan(0);
      
      // Check dependency vulnerability
      const depVuln = result.issues.find(i => i.type === 'dependency-vulnerability');
      expect(depVuln).toBeDefined();
      expect(depVuln?.package).toBe('lodash');
      expect(depVuln?.severity).toBe('high');
      expect(depVuln?.cve).toBe('CVE-2021-23337');
      
      // Check code vulnerability
      const codeVuln = result.issues.find(i => i.type === 'code-vulnerability');
      expect(codeVuln).toBeDefined();
      expect(codeVuln?.file).toBe('src/api/users.js');
      expect(codeVuln?.line).toBe(45);
      expect(codeVuln?.rule).toBe('js/sql-injection');
      
      // Check exposed secret
      const secret = result.issues.find(i => i.type === 'exposed-secret');
      expect(secret).toBeDefined();
      expect(secret?.severity).toBe('critical'); // Secrets are always critical
      expect(secret?.file).toBe('config/aws.js');
      expect(secret?.line).toBe(12);
      
      // Check security advisory
      const advisory = result.issues.find(i => i.type === 'security-advisory');
      expect(advisory).toBeDefined();
      expect(advisory?.cveId).toBe('CVE-2024-12345');
      
      // Verify summary
      expect(result.summary.total).toBeGreaterThan(0);
      expect(result.summary.critical).toBeGreaterThanOrEqual(1); // At least the secret
      expect(result.summary.byType.exposedSecrets).toBe(1);
      expect(result.summary.byType.dependencyVulnerabilities).toBe(1);
      expect(result.summary.byType.codeVulnerabilities).toBe(1);
      expect(result.summary.byType.securityAdvisories).toBe(1);
    });
    
    it('should handle repository without security features enabled', async () => {
      // Mock 404 responses (features not enabled)
      mockGitHubApi.get.mockRejectedValue({
        response: { status: 404 }
      });
      
      const result = await agent.analyze({
        repoUrl: 'https://github.com/owner/repo',
        language: 'javascript'
      });
      
      // Should return empty results gracefully
      expect(result.issues).toHaveLength(0);
      expect(result.summary.total).toBe(0);
      expect(result.metadata.toolsExecuted).toHaveLength(4);
    });
    
    it('should use mock data when GitHub API is unavailable', async () => {
      // Mock network error
      mockGitHubApi.get.mockRejectedValue(new Error('Network error'));
      
      const result = await agent.analyze({
        repoUrl: 'https://github.com/owner/repo',
        language: 'javascript'
      });
      
      // Should return mock findings
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(i => i.package === 'lodash')).toBe(true);
    });
    
    it('should parse repository info from different input formats', async () => {
      mockGitHubApi.get.mockResolvedValue({ data: [] });
      
      // Test with full URL
      await agent.analyze({
        repoUrl: 'https://github.com/facebook/react',
        language: 'javascript'
      });
      
      expect(mockGitHubApi.get).toHaveBeenCalledWith(
        '/repos/facebook/react/dependabot/alerts',
        expect.any(Object)
      );
      
      // Test with git URL
      jest.clearAllMocks();
      await agent.analyze({
        targetPath: 'git@github.com:vercel/next.js.git',
        language: 'javascript'
      });
      
      expect(mockGitHubApi.get).toHaveBeenCalledWith(
        '/repos/vercel/next.js/dependabot/alerts',
        expect.any(Object)
      );
      
      // Test with owner and repo directly
      jest.clearAllMocks();
      await agent.analyze({
        owner: 'microsoft',
        repo: 'vscode',
        language: 'typescript'
      });
      
      expect(mockGitHubApi.get).toHaveBeenCalledWith(
        '/repos/microsoft/vscode/dependabot/alerts',
        expect.any(Object)
      );
    });
    
    it('should handle rate limiting gracefully', async () => {
      // Mock rate limit error
      mockGitHubApi.get.mockRejectedValue({
        response: {
          status: 403,
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '1234567890'
          }
        }
      });
      
      const result = await agent.analyze({
        repoUrl: 'https://github.com/owner/repo',
        language: 'javascript'
      });
      
      // Should fall back to mock data
      expect(result.issues.length).toBeGreaterThan(0);
    });
    
    it('should enrich findings with GitHub-specific context', async () => {
      mockGitHubApi.get.mockImplementation((url: string) => {
        if (url.includes('dependabot')) {
          return Promise.resolve({
            data: [{
              security_vulnerability: {
                package: { name: 'test-package', ecosystem: 'npm' },
                severity: 'high',
                vulnerable_version_range: '< 2.0.0',
                first_patched_version: { identifier: '2.0.0' }
              },
              security_advisory: {
                cve_id: 'CVE-2024-99999',
                description: 'Test vulnerability'
              },
              html_url: 'https://github.com/owner/repo/security/dependabot/1'
            }]
          });
        }
        return Promise.resolve({ data: [] });
      });
      
      const result = await agent.analyze({
        repoUrl: 'https://github.com/owner/repo',
        language: 'javascript',
        context: { prNumber: 123 }
      });
      
      const issue = result.issues.find(i => i.package === 'test-package');
      expect(issue).toBeDefined();
      expect(issue?.gitHubNative).toBe(true);
      expect(issue?.recommendation).toContain('Update test-package to version 2.0.0');
      expect(issue?.url).toBe('https://github.com/owner/repo/security/dependabot/1');
      expect(issue?.context.source).toBe('GitHub Security Features');
      expect(issue?.context.prNumber).toBe(123);
    });
  });
  
  describe('performance', () => {
    it('should complete analysis within 30 seconds', async () => {
      mockGitHubApi.get.mockResolvedValue({ data: [] });
      
      const startTime = Date.now();
      await agent.analyze({
        repoUrl: 'https://github.com/owner/repo',
        language: 'javascript'
      });
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(30000);
    });
    
    it('should run all checks in parallel', async () => {
      // Add delays to simulate API calls
      const callOrder: string[] = [];
      mockGitHubApi.get.mockImplementation(async (url: string) => {
        if (url.includes('dependabot')) {
          callOrder.push('dependabot-start');
          await new Promise(r => setTimeout(r, 100));
          callOrder.push('dependabot-end');
        } else if (url.includes('code-scanning')) {
          callOrder.push('code-scanning-start');
          await new Promise(r => setTimeout(r, 100));
          callOrder.push('code-scanning-end');
        } else if (url.includes('secret-scanning')) {
          callOrder.push('secret-scanning-start');
          await new Promise(r => setTimeout(r, 100));
          callOrder.push('secret-scanning-end');
        } else if (url.includes('security-advisories')) {
          callOrder.push('advisories-start');
          await new Promise(r => setTimeout(r, 100));
          callOrder.push('advisories-end');
        }
        return { data: [] };
      });
      
      const startTime = Date.now();
      await agent.analyze({
        repoUrl: 'https://github.com/owner/repo',
        language: 'javascript'
      });
      const duration = Date.now() - startTime;
      
      // If run in parallel, should take ~100ms (not 400ms)
      expect(duration).toBeLessThan(200);
      
      // Verify all started before any finished (parallel execution)
      const allStarts = callOrder.filter(c => c.includes('-start'));
      const firstEnd = callOrder.findIndex(c => c.includes('-end'));
      expect(allStarts.length).toBe(4);
      expect(firstEnd).toBeGreaterThanOrEqual(4);
    });
  });
});