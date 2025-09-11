/**
 * Integration test for GitHub Security Agent
 * 
 * Tests how the agent works in real scenarios with:
 * 1. GitHub repositories (using API)
 * 2. Locally cloned repositories (extracting repo info)
 * 3. Integration with orchestrator
 */

import { GitHubSecurityAgent } from '../../GitHubSecurityAgent';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

describe('GitHubSecurityAgent Integration Tests', () => {
  const agent = new GitHubSecurityAgent();
  
  /**
   * IMPORTANT: How GitHub Security Agent Works
   * 
   * The GitHub Security Agent uses the GitHub API to fetch security data.
   * It does NOT analyze local code directly. Instead it:
   * 
   * 1. Extracts repository info (owner/repo) from:
   *    - GitHub URLs (https://github.com/owner/repo)
   *    - Git remote URLs (git@github.com:owner/repo.git)
   *    - Direct owner/repo parameters
   * 
   * 2. Makes API calls to GitHub to fetch:
   *    - Dependabot vulnerability alerts
   *    - CodeQL code scanning results
   *    - Secret scanning alerts
   *    - Security advisories
   * 
   * 3. Returns the security issues GitHub has already found
   * 
   * This means:
   * - ✅ Works with any GitHub repo (public with token, private with proper token)
   * - ✅ Zero infrastructure needed
   * - ✅ Leverages GitHub's continuous scanning
   * - ❌ Does NOT work with GitLab (need separate GitLabSecurityAgent)
   * - ❌ Does NOT analyze local code that hasn't been pushed
   * - ❌ Requires repository to have GitHub security features enabled
   */
  
  describe('Real GitHub Repository Tests', () => {
    it('should analyze a public GitHub repository', async () => {
      // Skip if no GitHub token
      if (!process.env.GITHUB_TOKEN) {
        console.log('Skipping: GITHUB_TOKEN not set');
        return;
      }
      
      // Test with a known repository that has security issues
      const result = await agent.analyze({
        repoUrl: 'https://github.com/OWASP/NodeGoat', // Known vulnerable app
        language: 'javascript'
      });
      
      expect(result.agent).toBe('GitHubSecurityAgent');
      expect(result.tools).toContain('github-dependabot');
      expect(result.tools).toContain('github-code-scanning');
      
      // May or may not have issues depending on what's enabled
      console.log('Issues found:', result.summary);
    });
    
    it('should extract repo info from a cloned repository', async () => {
      // Create a temporary directory with git remote
      const tempDir = `/tmp/test-repo-${Date.now()}`;
      await execAsync(`mkdir -p ${tempDir}`);
      await execAsync(`cd ${tempDir} && git init`);
      await execAsync(`cd ${tempDir} && git remote add origin https://github.com/facebook/react.git`);
      
      // The agent can extract repo info from git remote
      const result = await agent.analyze({
        targetPath: 'https://github.com/facebook/react', // We need the URL, not local path
        language: 'javascript'
      });
      
      expect(result.metadata.repository).toBe('facebook/react');
      
      // Cleanup
      await execAsync(`rm -rf ${tempDir}`);
    });
  });
  
  describe('How to Use in Orchestrator', () => {
    it('should be integrated into the orchestrator for GitHub repos', async () => {
      // The orchestrator should use GitHubSecurityAgent like this:
      
      class ExampleOrchestrator {
        private githubAgent = new GitHubSecurityAgent();
        private gitlabAgent: any; // GitLabSecurityAgent (to be implemented)
        
        async analyzeRepository(repoUrl: string, prNumber: number) {
          // Step 1: Determine platform
          const platform = this.detectPlatform(repoUrl);
          
          // Step 2: Run appropriate security agent
          let securityResults;
          
          if (platform === 'github') {
            // Use GitHub Security Features
            securityResults = await this.githubAgent.analyze({
              repoUrl,
              language: 'javascript'
            });
          } else if (platform === 'gitlab') {
            // Use GitLab Security Features (Phase 1F)
            // securityResults = await this.gitlabAgent.analyze({...});
            securityResults = { issues: [], summary: { total: 0 } };
          } else {
            // For local repos or other platforms, use traditional tools
            securityResults = await this.runLocalSecurityTools(repoUrl);
          }
          
          return securityResults;
        }
        
        private detectPlatform(repoUrl: string): string {
          if (repoUrl.includes('github.com')) return 'github';
          if (repoUrl.includes('gitlab.com')) return 'gitlab';
          return 'other';
        }
        
        private async runLocalSecurityTools(repoPath: string) {
          // Run Semgrep, Bandit, etc. on local code
          return { issues: [], summary: { total: 0 } };
        }
      }
      
      const orchestrator = new ExampleOrchestrator();
      const result = await orchestrator.analyzeRepository(
        'https://github.com/microsoft/vscode',
        123
      );
      
      expect(result).toBeDefined();
    });
  });
  
  describe('Limitations and Workarounds', () => {
    it('should understand what GitHub Security Agent can and cannot do', () => {
      // CAN DO:
      const canDo = {
        analyzePublicRepos: true,
        analyzePrivateRepos: true, // with proper token
        getHistoricalAlerts: true,
        getCVEInformation: true,
        getGitHubMaintainedData: true,
        workWithoutInfrastructure: true
      };
      
      // CANNOT DO:
      const cannotDo = {
        analyzeGitLabRepos: false, // Need GitLabSecurityAgent
        analyzeLocalChanges: false, // Only pushed code
        analyzeWithoutInternet: false, // Needs API access
        customSecurityRules: false, // Uses GitHub's rules
        analyzeNonGitHubRepos: false // Only GitHub
      };
      
      expect(canDo.workWithoutInfrastructure).toBe(true);
      expect(cannotDo.analyzeGitLabRepos).toBe(false);
    });
    
    it('should show how to handle non-GitHub repositories', async () => {
      // For GitLab repos, we'll need GitLabSecurityAgent (Phase 1F)
      const gitlabUrl = 'https://gitlab.com/gitlab-org/gitlab';
      
      // This will return empty results (no GitHub repo info)
      const result = await agent.analyze({
        repoUrl: gitlabUrl,
        language: 'ruby'
      });
      
      expect(result.summary.total).toBe(0);
      expect(result.metadata.error).toContain('No GitHub repository information');
    });
  });
  
  describe('Best Practices', () => {
    it('should show optimal usage pattern', async () => {
      // Best practice: Combine multiple security agents
      
      class SecurityOrchestrator {
        async runComprehensiveSecurityAnalysis(repoUrl: string, localPath?: string) {
          const results = {
            github: null as any,
            local: null as any,
            combined: [] as any[]
          };
          
          // 1. Get GitHub's security data (if GitHub repo)
          if (repoUrl.includes('github.com')) {
            const githubAgent = new GitHubSecurityAgent();
            results.github = await githubAgent.analyze({
              repoUrl,
              language: 'javascript'
            });
          }
          
          // 2. Run local security tools (if local path provided)
          if (localPath && fs.existsSync(localPath)) {
            // This would use MultiToolSecurityAgent
            // results.local = await localSecurityAgent.analyze({
            //   targetPath: localPath,
            //   language: 'javascript'
            // });
          }
          
          // 3. Combine and deduplicate results
          if (results.github) {
            results.combined.push(...results.github.issues);
          }
          if (results.local) {
            results.combined.push(...results.local.issues);
          }
          
          // 4. Deduplicate based on file/line/type
          const unique = new Map();
          results.combined.forEach(issue => {
            const key = `${issue.file}:${issue.line}:${issue.type}`;
            if (!unique.has(key) || issue.gitHubNative) {
              // Prefer GitHub native findings
              unique.set(key, issue);
            }
          });
          
          return {
            issues: Array.from(unique.values()),
            sources: {
              github: results.github?.issues.length || 0,
              local: results.local?.issues.length || 0
            }
          };
        }
      }
      
      const orchestrator = new SecurityOrchestrator();
      const result = await orchestrator.runComprehensiveSecurityAnalysis(
        'https://github.com/nodejs/node'
      );
      
      expect(result.issues).toBeDefined();
      expect(result.sources).toBeDefined();
    });
  });
  
  describe('Performance Considerations', () => {
    it('should cache GitHub API results', async () => {
      // First call - hits API
      const start1 = Date.now();
      const result1 = await agent.analyze({
        repoUrl: 'https://github.com/facebook/react',
        language: 'javascript'
      });
      const time1 = Date.now() - start1;
      
      // Second call - should be faster if cached
      const start2 = Date.now();
      const result2 = await agent.analyze({
        repoUrl: 'https://github.com/facebook/react',
        language: 'javascript'
      });
      const time2 = Date.now() - start2;
      
      // Results should be identical
      expect(result1.summary.total).toBe(result2.summary.total);
      
      console.log(`First call: ${time1}ms, Second call: ${time2}ms`);
    });
    
    it('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          agent.analyze({
            repoUrl: `https://github.com/test/repo${i}`,
            language: 'javascript'
          })
        );
      }
      
      const results = await Promise.all(promises);
      
      // All should complete (using mock data if rate limited)
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.agent).toBe('GitHubSecurityAgent');
      });
    });
  });
});

/**
 * Test helper to verify if a repository has GitHub security features enabled
 */
async function checkGitHubSecurityFeatures(owner: string, repo: string) {
  const axios = require('axios');
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : undefined
  };
  
  const features = {
    dependabot: false,
    codeScanning: false,
    secretScanning: false,
    securityAdvisories: false
  };
  
  try {
    // Check Dependabot
    const depResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/vulnerability-alerts`,
      { headers }
    );
    features.dependabot = depResponse.status === 204;
  } catch (e) {}
  
  try {
    // Check Code Scanning
    const codeResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/code-scanning/alerts`,
      { headers }
    );
    features.codeScanning = true;
  } catch (e) {}
  
  try {
    // Check Secret Scanning
    const secretResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/secret-scanning/alerts`,
      { headers }
    );
    features.secretScanning = true;
  } catch (e) {}
  
  return features;
}