/**
 * Production-Safe GitHub Platform Agent
 * This version prevents mock data in production
 */

import { BaseMultiToolAgent } from '../BaseMultiToolAgent';
import { MockDataGuard } from '../../guards/MockDataGuard';
import { EnvironmentConfig } from '../../config/environment';
import * as https from 'https';

export class ProductionSafeGitHubAgent extends BaseMultiToolAgent {
  private token: string | undefined;
  private config = EnvironmentConfig.getInstance();
  protected agentName = 'ProductionSafeGitHubAgent';
  protected tools = []; // GitHub API doesn't use the standard tool pattern
  
  constructor() {
    super();
    this.token = process.env.GITHUB_TOKEN;
    
    // Log configuration
    console.log(`GitHub Agent initialized in ${this.config.isProduction() ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
  }
  
  /**
   * Generate summary from findings
   */
  protected generateSummary(findings: any[]): any {
    const summary = {
      total: findings.length,
      bySeverity: {
        critical: findings.filter(f => f.severity === 'critical').length,
        high: findings.filter(f => f.severity === 'high').length,
        medium: findings.filter(f => f.severity === 'medium').length,
        low: findings.filter(f => f.severity === 'low').length
      },
      byType: {
        dependency: findings.filter(f => f.type === 'dependency').length,
        code: findings.filter(f => f.type === 'code').length,
        secret: findings.filter(f => f.type === 'secret').length
      }
    };
    
    return summary;
  }

  async analyze(input: any): Promise<any> {
    const repository = input.repository;
    console.log(`🔍 Analyzing ${repository}`);
    
    // Extract owner and repo
    const match = repository.match(/github\.com[/:]([\w-]+)\/([\w-]+)/);
    if (!match) {
      throw new Error('Invalid GitHub repository URL');
    }
    
    const [, owner, repo] = match;
    
    // Collect all results
    const results = {
      platform: 'github',
      repository,
      issues: [] as any[],
      metadata: {} as any
    };
    
    // Try to get real data from API
    if (this.token) {
      try {
        const [deps, code, secrets] = await Promise.all([
          this.scanDependencies(owner, repo),
          this.scanCode(owner, repo),
          this.scanSecrets(owner, repo)
        ]);
        
        results.issues.push(...deps, ...code, ...secrets);
        results.metadata.dataSource = 'github-api';
        
      } catch (error: any) {
        console.log(`API scan failed: ${error.message}`);
        results.metadata.dataSource = 'none';
        results.metadata.error = error.message;
      }
    } else {
      console.log('No GitHub token available');
      results.metadata.dataSource = 'none';
      results.metadata.reason = 'No API token configured';
    }
    
    // In production, NEVER return mock data
    if (results.issues.length === 0 && this.config.isProduction()) {
      console.log('No issues found (production mode - mock data disabled)');
      results.metadata.mockDataPrevented = true;
    }
    
    // In development, optionally use mock data for testing
    if (results.issues.length === 0 && this.config.isDevelopment()) {
      const mockData = this.getMockDataForDevelopment();
      if (mockData.length > 0) {
        console.warn('⚠️ Using mock data (development mode only)');
        results.issues.push(...mockData);
        results.metadata.dataSource = 'mock-development';
      }
    }
    
    return {
      ...results,
      tools: ['github-api'],
      summary: {
        totalIssues: results.issues.length,
        metadata: results.metadata
      }
    };
  }

  private async scanDependencies(owner: string, repo: string): Promise<any[]> {
    if (!this.token) return [];
    
    try {
      const response = await this.makeGitHubRequest(
        `/repos/${owner}/${repo}/dependabot/alerts?state=open`
      );
      const alerts = JSON.parse(response);
      
      return alerts.map((alert: any) => ({
        id: `dep-${alert.number}`,
        type: 'dependency',
        severity: alert.security_vulnerability?.severity || 'medium',
        package: alert.security_vulnerability?.package?.name,
        title: alert.security_advisory?.summary,
        __isRealData: true // Mark as real data
      }));
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log('Dependabot not enabled for this repository');
      } else if (error.statusCode === 403) {
        console.log('No permission to access Dependabot alerts');
      } else {
        console.log(`Dependabot scan error: ${error.message}`);
      }
      return []; // Return empty, not mock
    }
  }

  private async scanCode(owner: string, repo: string): Promise<any[]> {
    if (!this.token) return [];
    
    try {
      const response = await this.makeGitHubRequest(
        `/repos/${owner}/${repo}/code-scanning/alerts?state=open`
      );
      const alerts = JSON.parse(response);
      
      return alerts.map((alert: any) => ({
        id: `code-${alert.number}`,
        type: 'code-scanning',
        severity: alert.rule?.severity || 'warning',
        rule: alert.rule?.id,
        message: alert.rule?.description,
        file: alert.most_recent_instance?.location?.path,
        __isRealData: true
      }));
    } catch (error: any) {
      console.log(`Code scanning not available: ${error.statusCode || error.message}`);
      return []; // Return empty, not mock
    }
  }

  private async scanSecrets(owner: string, repo: string): Promise<any[]> {
    if (!this.token) return [];
    
    try {
      const response = await this.makeGitHubRequest(
        `/repos/${owner}/${repo}/secret-scanning/alerts?state=open`
      );
      const alerts = JSON.parse(response);
      
      return alerts.map((alert: any) => ({
        id: `secret-${alert.number}`,
        type: 'secret',
        severity: 'critical',
        secretType: alert.secret_type,
        __isRealData: true
      }));
    } catch (error: any) {
      console.log(`Secret scanning not available: ${error.statusCode || error.message}`);
      return []; // Return empty, not mock
    }
  }

  /**
   * Mock data ONLY for development - decorated to prevent production use
   */
  private getMockDataForDevelopment(): any[] {
    // This will automatically return [] in production
    return MockDataGuard.wrapMockData([
      {
        id: 'mock-1',
        type: 'dependency',
        severity: 'high',
        title: '[DEV MOCK] Test vulnerability',
        __isMockData: true
      }
    ], 'GitHubAgent.getMockDataForDevelopment');
  }

  private makeGitHubRequest(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CodeQual-Security-Agent'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject({
              statusCode: res.statusCode,
              message: `GitHub API error: ${res.statusCode}`
            });
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }
}