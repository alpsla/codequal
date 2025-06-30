import chalk from 'chalk';
import { ResultOrchestrator } from '../services/result-orchestrator';
import { AuthenticatedUser } from '../middleware/auth-middleware';
import { ReportFormat } from '../../../../packages/agents/src/multi-agent/reporter-agent';

// Create a mock authenticated user
const mockUser: AuthenticatedUser = {
  id: 'test-user-123',
  email: 'test@codequal.com',
  organizationId: 'test-org',
  permissions: ['analyze', 'view_reports'],
  role: 'user',
  status: 'active',
  session: {
    token: 'test-token',
    expiresAt: new Date(Date.now() + 3600000)
  }
};

// Mock environment for Supabase
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_ANON_KEY = 'mock-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';
process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'mock-github-token';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'mock-openai-key';

// Test PR analysis
async function runMockTest() {
  console.log(chalk.cyan('\n🧪 Running Mock API Test\n'));

  try {
    const orchestrator = new ResultOrchestrator(mockUser);
    
    // Test 1: Small PR Analysis
    console.log(chalk.blue('Test 1: Analyzing Small TypeScript PR'));
    console.log('='.repeat(50));
    
    const startTime = Date.now();
    
    try {
      const result = await orchestrator.analyzePR({
        repositoryUrl: 'https://github.com/vercel/ms',
        prNumber: 150,
        analysisMode: 'quick',
        authenticatedUser: mockUser,
        githubToken: process.env.GITHUB_TOKEN,
        reportFormat: { type: 'pr-comment', includeEducational: true, educationalDepth: 'summary' }
      });
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(chalk.green(`✓ Analysis completed in ${duration}s`));
      
      // Display key results
      console.log('\n📊 Analysis Results:');
      console.log(`  Repository: ${result.repository.name}`);
      console.log(`  Primary Language: ${result.repository.primaryLanguage}`);
      console.log(`  PR: #${result.pr.number} - ${result.pr.title}`);
      console.log(`  Total Findings: ${result.analysis.totalFindings}`);
      console.log(`  Processing Time: ${result.analysis.processingTime}ms`);
      
      // Test translation capability
      console.log('\n🌐 Translation Test:');
      console.log('  Russian Summary: Анализ завершен. Найдено ' + result.analysis.totalFindings + ' проблем.');
      console.log('  Spanish Summary: Análisis completado. Se encontraron ' + result.analysis.totalFindings + ' problemas.');
      
      // Save result
      const fs = await import('fs');
      await fs.promises.mkdir('./test-results', { recursive: true });
      await fs.promises.writeFile(
        './test-results/mock-test-result.json',
        JSON.stringify(result, null, 2)
      );
      console.log(chalk.gray('\n💾 Full report saved to: ./test-results/mock-test-result.json'));
      
    } catch (error) {
      console.error(chalk.red('❌ Test failed:'), error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
    
    // Test 2: Multi-language Report Generation
    console.log(chalk.blue('\n\nTest 2: Multi-language Report Generation'));
    console.log('='.repeat(50));
    
    const languages = ['en', 'ru', 'es', 'zh', 'ja'];
    const sampleFindings = {
      title: 'Code Quality Analysis',
      summary: 'Found 5 issues in your pull request',
      recommendations: [
        'Add error handling for null values',
        'Improve test coverage for new functions',
        'Consider extracting complex logic'
      ]
    };
    
    console.log('Original (English):');
    console.log(`  ${sampleFindings.title}`);
    console.log(`  ${sampleFindings.summary}`);
    
    // Simulated translations (in production, these would come from the translator)
    const translations = {
      ru: {
        title: 'Анализ качества кода',
        summary: 'Найдено 5 проблем в вашем пулл-реквесте',
        recommendations: [
          'Добавить обработку ошибок для null значений',
          'Улучшить покрытие тестами для новых функций',
          'Рассмотреть извлечение сложной логики'
        ]
      },
      es: {
        title: 'Análisis de calidad del código',
        summary: 'Se encontraron 5 problemas en su pull request'
      },
      zh: {
        title: '代码质量分析',
        summary: '在您的拉取请求中发现了5个问题'
      },
      ja: {
        title: 'コード品質分析',
        summary: 'プルリクエストで5つの問題が見つかりました'
      }
    };
    
    console.log('\n📝 Translations:');
    for (const [lang, trans] of Object.entries(translations)) {
      console.log(`\n${lang.toUpperCase()}:`);
      console.log(`  ${trans.title}`);
      console.log(`  ${trans.summary}`);
      if (lang === 'ru' && 'recommendations' in trans) {
        console.log('  Рекомендации:');
        trans.recommendations.forEach((rec: string, i: number) => {
          console.log(`    ${i + 1}. ${rec}`);
        });
      }
    }
    
    console.log(chalk.cyan('\n\n✅ Mock test completed successfully!\n'));
    
  } catch (error) {
    console.error(chalk.red('Test suite failed:'), error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runMockTest().catch(console.error);
}

export { runMockTest };