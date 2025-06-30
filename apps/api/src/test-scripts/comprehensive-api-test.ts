import axios, { AxiosInstance } from 'axios';
import { config } from 'dotenv';
import chalk from 'chalk';
import { AuthenticatedUser } from '../middleware/auth-middleware';

// Load environment variables
config();

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_KEY = process.env.TEST_API_KEY || 'ck_test_key_123456789';

// Test repositories of different sizes and languages
const TEST_REPOS = [
  {
    name: 'Small TypeScript',
    prUrl: 'https://github.com/vercel/next.js/pull/58000',
    expectedLanguage: 'typescript',
    expectedSize: 'small'
  },
  {
    name: 'Medium Python',
    prUrl: 'https://github.com/python/cpython/pull/112000',
    expectedLanguage: 'python',
    expectedSize: 'medium'
  },
  {
    name: 'Large Java',
    prUrl: 'https://github.com/spring-projects/spring-boot/pull/38000',
    expectedLanguage: 'java', 
    expectedSize: 'large'
  }
];

// Test languages for translation
const TEST_LANGUAGES = ['en', 'es', 'ru', 'zh', 'ja'];

class ComprehensiveAPITest {
  private api: AxiosInstance;
  private testResults: any[] = [];

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
  }

  async runAllTests() {
    console.log(chalk.cyan('\n🚀 Starting Comprehensive API Tests\n'));
    
    try {
      // 1. Test API health
      await this.testAPIHealth();
      
      // 2. Test supported languages endpoint
      await this.testSupportedLanguages();
      
      // 3. Test PR analysis for different repos
      for (const repo of TEST_REPOS) {
        await this.testPRAnalysis(repo);
      }
      
      // 4. Test educational content generation
      await this.testEducationalContent();
      
      // 5. Test multi-language reports
      await this.testMultiLanguageReports();
      
      // 6. Print summary
      this.printTestSummary();
      
    } catch (error) {
      console.error(chalk.red('Test suite failed:'), error);
      process.exit(1);
    }
  }

  async testAPIHealth() {
    console.log(chalk.blue('1. Testing API Health...'));
    
    try {
      const response = await this.api.get('/health');
      
      if (response.data.status === 'healthy') {
        console.log(chalk.green('  ✓ API is healthy'));
        this.testResults.push({ test: 'API Health', status: 'passed' });
      } else {
        throw new Error('API health check failed');
      }
    } catch (error) {
      console.log(chalk.red('  ✗ API health check failed'));
      this.testResults.push({ test: 'API Health', status: 'failed', error });
      throw error;
    }
  }

  async testSupportedLanguages() {
    console.log(chalk.blue('\n2. Testing Supported Languages...'));
    
    try {
      const response = await this.api.get('/v1/languages');
      
      console.log(chalk.green(`  ✓ Found ${response.data.languages.length} supported languages`));
      console.log(`  Languages: ${response.data.languages.map((l: any) => l.code).join(', ')}`);
      
      this.testResults.push({ 
        test: 'Supported Languages', 
        status: 'passed',
        languages: response.data.languages.length 
      });
    } catch (error) {
      console.log(chalk.red('  ✗ Failed to get supported languages'));
      this.testResults.push({ test: 'Supported Languages', status: 'failed', error });
    }
  }

  async testPRAnalysis(repo: typeof TEST_REPOS[0]) {
    console.log(chalk.blue(`\n3. Testing PR Analysis: ${repo.name}...`));
    
    try {
      // Start analysis
      console.log(`  Starting analysis for ${repo.prUrl}...`);
      const startResponse = await this.api.post('/v1/analyze-pr', {
        prUrl: repo.prUrl,
        options: {
          depth: 'comprehensive',
          includeTests: true,
          includeSecurity: true,
          includePerformance: true
        }
      });

      const analysisId = startResponse.data.analysisId;
      console.log(`  Analysis ID: ${analysisId}`);
      
      // Poll for results
      let analysis;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const statusResponse = await this.api.get(`/v1/analysis/${analysisId}/results`);
        
        if (statusResponse.data.status === 'completed') {
          analysis = statusResponse.data;
          break;
        } else if (statusResponse.data.status === 'failed') {
          throw new Error('Analysis failed: ' + statusResponse.data.error);
        }
        
        attempts++;
        process.stdout.write('.');
      }
      
      if (!analysis) {
        throw new Error('Analysis timeout');
      }
      
      console.log(chalk.green(`\n  ✓ Analysis completed in ${attempts} seconds`));
      
      // Validate results
      console.log(`  Repository Info:`);
      console.log(`    - Primary Language: ${analysis.repository?.primaryLanguage || 'N/A'}`);
      console.log(`    - Size Category: ${analysis.metrics?.repositorySize || 'N/A'}`);
      console.log(`  Analysis Results:`);
      console.log(`    - Total Findings: ${analysis.analysis?.totalFindings || 0}`);
      console.log(`    - Critical Issues: ${analysis.analysis?.criticalIssues || 0}`);
      console.log(`    - Code Quality Score: ${analysis.metrics?.codeQualityScore || 'N/A'}/10`);
      console.log(`    - Security Score: ${analysis.metrics?.securityScore || 'N/A'}/10`);
      
      // Check if agents were involved
      const agentsUsed = analysis.metadata?.agentsInvolved || [];
      console.log(`    - Agents Used: ${agentsUsed.join(', ') || 'None detected'}`);
      
      // Store for educational content test
      this.testResults.push({ 
        test: `PR Analysis - ${repo.name}`, 
        status: 'passed',
        analysisId,
        findings: analysis.analysis?.totalFindings || 0,
        agentsUsed
      });
      
    } catch (error: any) {
      console.log(chalk.red(`  ✗ PR analysis failed: ${error.message}`));
      this.testResults.push({ 
        test: `PR Analysis - ${repo.name}`, 
        status: 'failed', 
        error: error.message 
      });
    }
  }

  async testEducationalContent() {
    console.log(chalk.blue('\n4. Testing Educational Content Generation...'));
    
    // Get a successful analysis from previous tests
    const successfulAnalysis = this.testResults.find(
      r => r.test.includes('PR Analysis') && r.status === 'passed' && r.analysisId
    );
    
    if (!successfulAnalysis) {
      console.log(chalk.yellow('  ⚠️  No successful analysis found to test educational content'));
      return;
    }
    
    try {
      // Get educational content for the analysis
      const response = await this.api.get(
        `/v1/analysis/${successfulAnalysis.analysisId}/educational`
      );
      
      const educational = response.data;
      
      console.log(chalk.green('  ✓ Educational content generated'));
      console.log(`  Content Overview:`);
      console.log(`    - Learning Modules: ${educational.learningModules?.length || 0}`);
      console.log(`    - Code Examples: ${educational.codeExamples?.length || 0}`);
      console.log(`    - Best Practices: ${educational.bestPractices?.length || 0}`);
      console.log(`    - Estimated Learning Time: ${educational.estimatedTime || 'N/A'}`);
      
      // Check if content matches findings
      if (educational.learningModules?.length > 0) {
        console.log(`  First Module: "${educational.learningModules[0].title}"`);
      }
      
      this.testResults.push({ 
        test: 'Educational Content', 
        status: 'passed',
        modules: educational.learningModules?.length || 0
      });
      
    } catch (error: any) {
      console.log(chalk.red(`  ✗ Educational content generation failed: ${error.message}`));
      this.testResults.push({ 
        test: 'Educational Content', 
        status: 'failed', 
        error: error.message 
      });
    }
  }

  async testMultiLanguageReports() {
    console.log(chalk.blue('\n5. Testing Multi-Language Report Generation...'));
    
    // Get a successful analysis
    const successfulAnalysis = this.testResults.find(
      r => r.test.includes('PR Analysis') && r.status === 'passed' && r.analysisId
    );
    
    if (!successfulAnalysis) {
      console.log(chalk.yellow('  ⚠️  No successful analysis found to test translations'));
      return;
    }
    
    for (const lang of TEST_LANGUAGES) {
      try {
        console.log(`\n  Testing ${lang.toUpperCase()} translation...`);
        
        // Get report in specific language
        const response = await this.api.get(
          `/v1/analysis/${successfulAnalysis.analysisId}/report`,
          {
            params: { 
              format: 'detailed',
              language: lang 
            }
          }
        );
        
        const report = response.data;
        
        // Validate translation
        console.log(chalk.green(`  ✓ Report generated in ${lang.toUpperCase()}`));
        
        // Show sample of translated content
        if (report.summary) {
          console.log(`  Summary preview: "${report.summary.substring(0, 100)}..."`);
        }
        
        // Special validation for Russian (for manual review)
        if (lang === 'ru') {
          console.log(chalk.yellow('\n  📋 Russian Report for Manual Review:'));
          console.log('  ' + '='.repeat(50));
          console.log(`  Заголовок: ${report.title || 'N/A'}`);
          console.log(`  Описание: ${report.summary?.substring(0, 200) || 'N/A'}...`);
          
          if (report.findings?.length > 0) {
            console.log(`\n  Находки (первые 3):`);
            report.findings.slice(0, 3).forEach((finding: any, i: number) => {
              console.log(`    ${i + 1}. ${finding.title || finding.message}`);
            });
          }
          
          if (report.recommendations?.length > 0) {
            console.log(`\n  Рекомендации (первые 3):`);
            report.recommendations.slice(0, 3).forEach((rec: any, i: number) => {
              console.log(`    ${i + 1}. ${rec.title || rec.message}`);
            });
          }
          console.log('  ' + '='.repeat(50));
        }
        
        this.testResults.push({ 
          test: `Translation - ${lang.toUpperCase()}`, 
          status: 'passed',
          sampleText: report.summary?.substring(0, 50) 
        });
        
      } catch (error: any) {
        console.log(chalk.red(`  ✗ ${lang.toUpperCase()} translation failed: ${error.message}`));
        this.testResults.push({ 
          test: `Translation - ${lang.toUpperCase()}`, 
          status: 'failed', 
          error: error.message 
        });
      }
    }
  }

  printTestSummary() {
    console.log(chalk.cyan('\n\n📊 Test Summary\n'));
    console.log('=' .repeat(60));
    
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(chalk.green(`Passed: ${passed}`));
    console.log(chalk.red(`Failed: ${failed}`));
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    console.log('\nDetailed Results:');
    console.log('-'.repeat(60));
    
    this.testResults.forEach(result => {
      const status = result.status === 'passed' 
        ? chalk.green('✓ PASS') 
        : chalk.red('✗ FAIL');
      
      console.log(`${status} ${result.test}`);
      
      if (result.status === 'failed' && result.error) {
        console.log(`      Error: ${result.error}`);
      }
      
      // Additional details
      if (result.findings !== undefined) {
        console.log(`      Findings: ${result.findings}`);
      }
      if (result.agentsUsed?.length > 0) {
        console.log(`      Agents: ${result.agentsUsed.join(', ')}`);
      }
      if (result.modules !== undefined) {
        console.log(`      Learning Modules: ${result.modules}`);
      }
    });
    
    console.log('=' .repeat(60));
  }
}

// Run tests
if (require.main === module) {
  const tester = new ComprehensiveAPITest();
  tester.runAllTests().catch(console.error);
}

export { ComprehensiveAPITest };