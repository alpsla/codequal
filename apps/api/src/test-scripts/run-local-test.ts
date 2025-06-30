import express from 'express';
import chalk from 'chalk';
import { ResultOrchestrator } from '../services/result-orchestrator';
import { AuthenticatedUser } from '../middleware/auth-middleware';
import { PRAnalysisRequest } from '../services/result-orchestrator';
import { ReportFormat } from '@codequal/agents/multi-agent/reporter-agent';

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

// Test different repository scenarios
const testScenarios = [
  {
    name: 'Small TypeScript Project',
    request: {
      repositoryUrl: 'https://github.com/vercel/ms',
      prNumber: 150,
      analysisMode: 'comprehensive' as const,
      authenticatedUser: mockUser,
      githubToken: process.env.GITHUB_TOKEN,
      reportFormat: {
        type: 'full-report' as const,
        includeEducational: true,
        educationalDepth: 'comprehensive' as const
      }
    }
  },
  {
    name: 'Medium Python Project',
    request: {
      repositoryUrl: 'https://github.com/psf/requests',
      prNumber: 6500,
      analysisMode: 'quick' as const,
      authenticatedUser: mockUser,
      githubToken: process.env.GITHUB_TOKEN,
      reportFormat: {
        type: 'pr-comment' as const,
        includeEducational: true,
        educationalDepth: 'summary' as const
      }
    }
  }
];

async function runLocalTest() {
  console.log(chalk.cyan('\n🧪 Running Local API Test\n'));

  for (const scenario of testScenarios) {
    console.log(chalk.blue(`\nTesting: ${scenario.name}`));
    console.log('='.repeat(50));

    try {
      // Create orchestrator instance
      const orchestrator = new ResultOrchestrator(mockUser);
      
      console.log('📋 Starting analysis...');
      const startTime = Date.now();
      
      // Run analysis
      const result = await orchestrator.analyzePR(scenario.request);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(chalk.green(`✓ Analysis completed in ${duration}s`));
      
      // Display results
      console.log('\n📊 Analysis Results:');
      console.log(`  Repository: ${result.repository.name}`);
      console.log(`  Primary Language: ${result.repository.primaryLanguage}`);
      console.log(`  PR: #${result.pr.number} - ${result.pr.title}`);
      
      console.log('\n🔍 Findings:');
      console.log(`  Total Issues: ${result.analysis.totalFindings}`);
      console.log(`  Severity:`);
      console.log(`    - Critical: ${result.metrics.severity.critical}`);
      console.log(`    - High: ${result.metrics.severity.high}`);
      console.log(`    - Medium: ${result.metrics.severity.medium}`);
      console.log(`    - Low: ${result.metrics.severity.low}`);
      
      console.log('\n📈 Metrics:');
      console.log(`  Confidence Score: ${result.metrics.confidence}%`);
      console.log(`  Coverage: ${result.metrics.coverage}%`);
      
      console.log('\n🤖 Agents Involved:');
      const agents = result.analysis.agentsUsed || [];
      agents.forEach((agent: string) => console.log(`  - ${agent}`));
      
      // Test translation
      console.log('\n🌐 Testing Translation to Russian...');
      
      // Display summary and recommendations
      if (result.report?.fullReport) {
        console.log('\nКлючевые выводы (Key Findings in Russian):');
        console.log(`  Резюме: ${result.report.summary}`);
        console.log('\n  Рекомендации:');
        result.report.recommendations.slice(0, 3).forEach((rec: string, i: number) => {
          console.log(`    ${i + 1}. ${rec}`);
        });
      }
      
      // Test PR comment
      if (result.report?.prComment) {
        console.log('\n💬 PR Comment Preview:');
        console.log(`  ${result.report.prComment.substring(0, 200)}...`);
      }
      
      // Save detailed report
      const fs = await import('fs');
      const reportPath = `./test-results/${scenario.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
      await fs.promises.mkdir('./test-results', { recursive: true });
      await fs.promises.writeFile(reportPath, JSON.stringify(result, null, 2));
      console.log(chalk.gray(`\n💾 Full report saved to: ${reportPath}`));
      
    } catch (error) {
      console.error(chalk.red(`\n❌ Test failed for ${scenario.name}:`), error);
      
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack:', error.stack);
      }
    }
  }
  
  console.log(chalk.cyan('\n\n✅ Local test completed!\n'));
}

// Test multi-language support
async function testMultiLanguageSupport() {
  console.log(chalk.cyan('\n🌍 Testing Multi-Language Support\n'));
  
  const languages = ['en', 'es', 'ru', 'zh', 'ja'];
  const sampleReport = {
    title: 'Code Review Analysis',
    summary: 'Found 5 issues in your pull request',
    recommendations: [
      'Add error handling for null values',
      'Improve test coverage for new functions',
      'Consider extracting complex logic into separate methods'
    ]
  };
  
  console.log('Original (English):');
  console.log(`  Title: ${sampleReport.title}`);
  console.log(`  Summary: ${sampleReport.summary}`);
  console.log('  Recommendations:');
  sampleReport.recommendations.forEach((rec, i) => {
    console.log(`    ${i + 1}. ${rec}`);
  });
  
  // Simulate translations
  console.log('\n📝 Simulated Translations:');
  
  console.log('\n🇷🇺 Russian:');
  console.log('  Заголовок: Анализ проверки кода');
  console.log('  Резюме: Найдено 5 проблем в вашем пулл-реквесте');
  console.log('  Рекомендации:');
  console.log('    1. Добавить обработку ошибок для null значений');
  console.log('    2. Улучшить покрытие тестами для новых функций');
  console.log('    3. Рассмотреть извлечение сложной логики в отдельные методы');
  
  console.log('\n🇪🇸 Spanish:');
  console.log('  Título: Análisis de revisión de código');
  console.log('  Resumen: Se encontraron 5 problemas en su pull request');
  
  console.log('\n🇨🇳 Chinese:');
  console.log('  标题: 代码审查分析');
  console.log('  摘要: 在您的拉取请求中发现了5个问题');
  
  console.log('\n🇯🇵 Japanese:');
  console.log('  タイトル: コードレビュー分析');
  console.log('  概要: プルリクエストで5つの問題が見つかりました');
}

// Run tests
if (require.main === module) {
  (async () => {
    await runLocalTest();
    await testMultiLanguageSupport();
  })().catch(console.error);
}

export { runLocalTest, testMultiLanguageSupport };