/**
 * Test Chunk 4: Report Generation Performance
 * Focus: Testing report generation speed and quality
 */

import { ReportGeneratorV7EnhancedComplete } from './src/standard/comparison/report-generator-v7-enhanced-complete';
import { performance } from 'perf_hooks';

interface ReportMetrics {
  scenario: string;
  issueCount: number;
  reportSize: number;
  generationTime: number;
  htmlSize: number;
  markdownSize: number;
  status: 'success' | 'failed';
}

async function testReportGeneration() {
  console.log('📝 TEST CHUNK 4: Report Generation Performance');
  console.log('=' .repeat(60));
  
  const generator = new ReportGeneratorV7EnhancedComplete();
  const metrics: ReportMetrics[] = [];
  
  // Test scenarios with different complexities
  const testScenarios = [
    {
      name: 'Small PR (few changes)',
      data: {
        newIssues: [
          { title: 'Type error', severity: 'high', file: 'src/index.ts', line: 10, description: 'Missing type annotation' },
          { title: 'Unused import', severity: 'low', file: 'src/utils.ts', line: 3, description: 'Import is never used' }
        ],
        resolvedIssues: [
          { title: 'Memory leak fixed', severity: 'high', file: 'src/cache.ts', line: 45 }
        ],
        unchangedIssues: [],
        modifiedIssues: [],
        metadata: {
          url: 'https://github.com/sindresorhus/ky/pull/700',
          owner: 'sindresorhus',
          repo: 'ky',
          prNumber: 700,
          prTitle: 'Fix type errors',
          prDescription: 'This PR fixes various type errors in the codebase',
          author: 'contributor',
          created: new Date().toISOString()
        },
        scoreImprovement: {
          mainScore: 70,
          prScore: 75,
          improvement: 5
        }
      }
    },
    {
      name: 'Medium PR (typical changes)',
      data: {
        newIssues: Array.from({ length: 10 }, (_, i) => ({
          title: `New issue ${i + 1}`,
          severity: i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
          file: `src/file${i}.ts`,
          line: i * 10,
          description: `Description for issue ${i + 1}`,
          category: i % 2 === 0 ? 'security' : 'performance'
        })),
        resolvedIssues: Array.from({ length: 8 }, (_, i) => ({
          title: `Fixed issue ${i + 1}`,
          severity: 'medium',
          file: `src/old${i}.ts`,
          line: i * 5
        })),
        unchangedIssues: Array.from({ length: 5 }, (_, i) => ({
          title: `Existing issue ${i + 1}`,
          severity: 'low',
          file: `src/stable${i}.ts`,
          line: i * 3
        })),
        modifiedIssues: Array.from({ length: 3 }, (_, i) => ({
          title: `Modified issue ${i + 1}`,
          oldSeverity: 'high',
          newSeverity: 'medium',
          file: `src/changed${i}.ts`,
          line: i * 7
        })),
        metadata: {
          url: 'https://github.com/sindresorhus/ky/pull/700',
          owner: 'sindresorhus',
          repo: 'ky',
          prNumber: 700,
          prTitle: 'Feature: Add retry mechanism',
          prDescription: 'Implements automatic retry logic with exponential backoff',
          author: 'maintainer',
          created: new Date().toISOString(),
          commits: 15,
          filesChanged: 25,
          additions: 500,
          deletions: 200
        },
        scoreImprovement: {
          mainScore: 65,
          prScore: 72,
          improvement: 7
        },
        testCoverage: {
          main: 45,
          pr: 58,
          improvement: 13
        }
      }
    },
    {
      name: 'Large PR (many changes)',
      data: {
        newIssues: Array.from({ length: 50 }, (_, i) => ({
          title: `Issue ${i + 1}`,
          severity: i % 4 === 0 ? 'critical' : i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
          file: `src/module${Math.floor(i / 5)}/file${i}.ts`,
          line: i * 10,
          description: `Detailed description for issue ${i + 1} with code examples and suggestions`,
          category: ['security', 'performance', 'code-quality', 'testing'][i % 4],
          impact: i % 3 === 0 ? 'high' : 'medium'
        })),
        resolvedIssues: Array.from({ length: 30 }, (_, i) => ({
          title: `Resolved ${i + 1}`,
          severity: 'medium',
          file: `src/fixed/file${i}.ts`,
          line: i * 8
        })),
        unchangedIssues: Array.from({ length: 100 }, (_, i) => ({
          title: `Legacy issue ${i + 1}`,
          severity: 'low',
          file: `src/legacy/file${i}.ts`,
          line: i * 2
        })),
        modifiedIssues: Array.from({ length: 20 }, (_, i) => ({
          title: `Updated issue ${i + 1}`,
          oldSeverity: 'high',
          newSeverity: i % 2 === 0 ? 'medium' : 'low',
          file: `src/updated/file${i}.ts`,
          line: i * 15
        })),
        metadata: {
          url: 'https://github.com/vercel/next.js/pull/31616',
          owner: 'vercel',
          repo: 'next.js',
          prNumber: 31616,
          prTitle: 'Major refactoring of build system',
          prDescription: 'Complete overhaul of the build pipeline for better performance',
          author: 'core-team',
          created: new Date().toISOString(),
          commits: 87,
          filesChanged: 156,
          additions: 5000,
          deletions: 3000
        },
        scoreImprovement: {
          mainScore: 55,
          prScore: 68,
          improvement: 13
        },
        performanceMetrics: {
          buildTime: { before: 120, after: 45 },
          bundleSize: { before: 2500, after: 1800 }
        }
      }
    }
  ];
  
  for (const scenario of testScenarios) {
    console.log(`\n📊 ${scenario.name}`);
    console.log('-'.repeat(40));
    
    const startTime = performance.now();
    
    try {
      // Generate HTML report
      const htmlReport = await generator.generateReport(scenario.data as any);
      const htmlSize = htmlReport.length;
      
      // Generate markdown version (simulated)
      const markdownReport = htmlReport
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
      const markdownSize = markdownReport.length;
      
      const generationTime = performance.now() - startTime;
      
      const totalIssues = 
        scenario.data.newIssues.length + 
        scenario.data.resolvedIssues.length + 
        scenario.data.unchangedIssues.length + 
        scenario.data.modifiedIssues.length;
      
      const metric: ReportMetrics = {
        scenario: scenario.name,
        issueCount: totalIssues,
        reportSize: htmlSize,
        generationTime,
        htmlSize,
        markdownSize,
        status: 'success'
      };
      
      metrics.push(metric);
      
      console.log(`✅ Report generated successfully`);
      console.log(`   Total issues: ${totalIssues}`);
      console.log(`   HTML size: ${(htmlSize / 1024).toFixed(1)} KB`);
      console.log(`   Markdown size: ${(markdownSize / 1024).toFixed(1)} KB`);
      console.log(`   Generation time: ${generationTime.toFixed(0)}ms`);
      console.log(`   Time per issue: ${(generationTime / totalIssues).toFixed(2)}ms`);
      
      // Analyze sections
      const sections = [
        { name: 'Summary', found: htmlReport.includes('Summary') },
        { name: 'New Issues', found: htmlReport.includes('New Issues') },
        { name: 'Resolved', found: htmlReport.includes('Resolved') },
        { name: 'Metrics', found: htmlReport.includes('Score') || htmlReport.includes('Coverage') },
        { name: 'Visualizations', found: htmlReport.includes('chart') || htmlReport.includes('graph') }
      ];
      
      console.log('\n   Report sections:');
      sections.forEach(section => {
        console.log(`   ${section.found ? '✅' : '❌'} ${section.name}`);
      });
      
    } catch (error: any) {
      const generationTime = performance.now() - startTime;
      console.log(`❌ Failed: ${error.message}`);
      
      metrics.push({
        scenario: scenario.name,
        issueCount: 0,
        reportSize: 0,
        generationTime,
        htmlSize: 0,
        markdownSize: 0,
        status: 'failed'
      });
    }
  }
  
  // Performance Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 REPORT GENERATION SUMMARY');
  console.log('='.repeat(60));
  
  const successMetrics = metrics.filter(m => m.status === 'success');
  
  if (successMetrics.length > 0) {
    const avgTime = successMetrics.reduce((sum, m) => sum + m.generationTime, 0) / successMetrics.length;
    const avgSize = successMetrics.reduce((sum, m) => sum + m.htmlSize, 0) / successMetrics.length;
    const totalIssues = successMetrics.reduce((sum, m) => sum + m.issueCount, 0);
    const totalTime = successMetrics.reduce((sum, m) => sum + m.generationTime, 0);
    
    console.log(`\nSuccess rate: ${successMetrics.length}/${metrics.length}`);
    console.log(`Average generation time: ${avgTime.toFixed(0)}ms`);
    console.log(`Average report size: ${(avgSize / 1024).toFixed(1)} KB`);
    console.log(`Total issues processed: ${totalIssues}`);
    console.log(`Overall time per issue: ${(totalTime / totalIssues).toFixed(2)}ms`);
    
    // Performance by complexity
    console.log('\n📊 Performance by complexity:');
    metrics.forEach(m => {
      const timePerIssue = m.issueCount > 0 ? m.generationTime / m.issueCount : 0;
      const sizePerIssue = m.issueCount > 0 ? m.htmlSize / m.issueCount : 0;
      console.log(`  ${m.scenario}:`);
      console.log(`    Time: ${m.generationTime.toFixed(0)}ms (${timePerIssue.toFixed(2)}ms/issue)`);
      console.log(`    Size: ${(m.htmlSize / 1024).toFixed(1)}KB (${(sizePerIssue / 1024).toFixed(2)}KB/issue)`);
    });
    
    // Scalability analysis
    const small = metrics.find(m => m.scenario.includes('Small'));
    const large = metrics.find(m => m.scenario.includes('Large'));
    
    if (small && large && small.issueCount > 0 && large.issueCount > 0) {
      const scaleFactor = large.issueCount / small.issueCount;
      const timeScale = large.generationTime / small.generationTime;
      const efficiency = scaleFactor / timeScale;
      
      console.log('\n🔄 Scalability Analysis:');
      console.log(`  Issue scale: ${scaleFactor.toFixed(1)}x`);
      console.log(`  Time scale: ${timeScale.toFixed(1)}x`);
      console.log(`  Efficiency: ${(efficiency * 100).toFixed(0)}%`);
      
      if (efficiency < 0.5) {
        console.log('  ⚠️ Poor scalability detected');
      } else if (efficiency < 0.8) {
        console.log('  ⚡ Acceptable scalability');
      } else {
        console.log('  ✅ Good scalability');
      }
    }
  }
  
  // Optimization recommendations
  console.log('\n🔧 OPTIMIZATION OPPORTUNITIES:');
  
  const avgTime = successMetrics.length > 0 
    ? successMetrics.reduce((sum, m) => sum + m.generationTime, 0) / successMetrics.length
    : 0;
    
  if (avgTime > 500) {
    console.log('⚠️ Generation taking >500ms - Consider:');
    console.log('   - Template caching for common sections');
    console.log('   - Lazy loading for large reports');
    console.log('   - Streaming HTML generation');
  }
  
  const avgSize = successMetrics.length > 0
    ? successMetrics.reduce((sum, m) => sum + m.htmlSize, 0) / successMetrics.length
    : 0;
    
  if (avgSize > 100 * 1024) {
    console.log('⚠️ Reports >100KB - Consider:');
    console.log('   - Pagination for large issue lists');
    console.log('   - Compressed storage');
    console.log('   - Summary view with expandable details');
  }
  
  console.log('\n✅ General optimizations:');
  console.log('   - Pre-compile Handlebars templates');
  console.log('   - Use virtual DOM for large reports');
  console.log('   - Implement incremental rendering');
  console.log('   - Cache common visualizations');
  
  return metrics;
}

// Run test
testReportGeneration().catch(console.error);