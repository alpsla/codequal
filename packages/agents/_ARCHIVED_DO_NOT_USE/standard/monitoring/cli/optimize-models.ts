#!/usr/bin/env node

/**
 * Model Optimization CLI
 * 
 * Analyzes model usage patterns and generates cost optimization recommendations
 */

import { program } from 'commander';
import { getModelUsageAnalytics } from '../services/model-usage-analytics';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import * as dotenv from 'dotenv';

// Load environment variables
const envPath = path.resolve(__dirname, '../../../../../../.env');
dotenv.config({ path: envPath });

program
  .name('optimize-models')
  .description('Analyze model usage and generate cost optimization recommendations')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze current model usage patterns')
  .option('-d, --days <number>', 'Number of days to analyze', '30')
  .action(async (options) => {
    console.log(chalk.blue('🔍 Analyzing model usage patterns...'));
    
    const analytics = getModelUsageAnalytics();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(options.days));

    const metrics = await analytics.getModelPerformanceMetrics(startDate, endDate);
    
    console.log(chalk.green(`\n📊 Model Performance Summary (Last ${options.days} days)\n`));
    
    // Group by agent
    const agentGroups = new Map<string, typeof metrics>();
    for (const metric of metrics) {
      if (!agentGroups.has(metric.agent)) {
        agentGroups.set(metric.agent, []);
      }
      agentGroups.get(metric.agent)!.push(metric);
    }

    for (const [agent, agentMetrics] of agentGroups.entries()) {
      console.log(chalk.yellow(`\n${agent} Agent:`));
      
      // Sort by total cost
      const sorted = agentMetrics.sort((a, b) => b.totalCost - a.totalCost);
      
      for (const metric of sorted.slice(0, 5)) {
        console.log(`  ${metric.operation} → ${metric.model}`);
        console.log(`    Calls: ${metric.totalCalls} | Success: ${metric.successRate.toFixed(1)}%`);
        console.log(`    Avg Cost: $${metric.avgCostPerCall.toFixed(4)} | Total: $${metric.totalCost.toFixed(2)}`);
        console.log(`    Avg Tokens: ${Math.round(metric.avgInputTokens + metric.avgOutputTokens)}`);
      }
    }
  });

program
  .command('recommend')
  .description('Generate optimization recommendations')
  .option('-o, --output <file>', 'Output file for recommendations')
  .action(async (options) => {
    console.log(chalk.blue('💡 Generating optimization recommendations...'));
    
    const analytics = getModelUsageAnalytics();
    const recommendations = await analytics.generateOptimizationRecommendations();
    
    if (recommendations.length === 0) {
      console.log(chalk.yellow('\nNo optimization opportunities found.'));
      console.log('This might be because:');
      console.log('  - You\'re already using optimal models');
      console.log('  - Not enough usage data available');
      console.log('  - Current models are best for quality requirements');
      return;
    }

    console.log(chalk.green(`\n✨ Found ${recommendations.length} optimization opportunities!\n`));
    
    const totalSavings = recommendations.reduce((sum, r) => sum + r.potentialSavings, 0);
    console.log(chalk.bold(`💰 Total Potential Monthly Savings: $${totalSavings.toFixed(2)}\n`));

    // Show top recommendations
    for (const rec of recommendations.slice(0, 5)) {
      console.log(chalk.yellow(`\n${rec.agent} - ${rec.operation}`));
      console.log(`  Current: ${rec.currentModel} → Recommended: ${rec.recommendedModel}`);
      console.log(chalk.green(`  Savings: $${rec.potentialSavings.toFixed(2)}/month (${rec.savingsPercentage.toFixed(1)}%)`));
      console.log(`  Quality Impact: ${rec.qualityImpact}`);
      
      if (rec.qualityImpact === 'minimal') {
        console.log(chalk.green('  ✅ Safe to switch - minimal quality impact'));
      } else if (rec.qualityImpact === 'moderate') {
        console.log(chalk.yellow('  ⚠️ Test before switching - moderate quality impact'));
      } else {
        console.log(chalk.red('  ⚠️ Careful testing required - significant quality impact'));
      }
    }

    if (options.output) {
      const report = await analytics.generateCostOptimizationReport();
      fs.writeFileSync(options.output, report);
      console.log(chalk.green(`\n📄 Full report saved to: ${options.output}`));
    }
  });

program
  .command('patterns')
  .description('Show model usage patterns by agent')
  .action(async () => {
    console.log(chalk.blue('📈 Analyzing usage patterns...'));
    
    const analytics = getModelUsageAnalytics();
    const patterns = await analytics.getAgentModelUsagePatterns();
    
    for (const pattern of patterns) {
      console.log(chalk.yellow(`\n${pattern.agent} Agent:`));
      
      console.log('\n  Most Used Models:');
      for (const model of pattern.modelsUsed.slice(0, 3)) {
        const bar = '█'.repeat(Math.round(model.percentage / 5));
        console.log(`    ${model.model.padEnd(25)} ${bar} ${model.percentage.toFixed(1)}% (${model.frequency} calls)`);
      }

      console.log('\n  Top Operations:');
      for (const op of pattern.topOperations.slice(0, 5)) {
        console.log(`    ${op.operation.padEnd(30)} ${op.callCount} calls | Model: ${op.dominantModel}`);
      }

      if (pattern.monthlyTrend.length > 0) {
        console.log('\n  Recent Trend:');
        const recent = pattern.monthlyTrend.slice(-3);
        for (const month of recent) {
          console.log(`    ${month.month}: ${month.totalCalls} calls, $${month.totalCost.toFixed(2)}`);
        }
      }
    }
  });

program
  .command('combinations')
  .description('Show frequently used model combinations')
  .action(async () => {
    console.log(chalk.blue('🔗 Analyzing model combinations...'));
    
    const analytics = getModelUsageAnalytics();
    const combinations = await analytics.getFrequentModelCombinations();
    
    if (combinations.length === 0) {
      console.log(chalk.yellow('\nNo model combinations found.'));
      return;
    }

    console.log(chalk.green('\n🎯 Frequently Used Model Combinations:\n'));
    
    for (const combo of combinations.slice(0, 10)) {
      console.log(chalk.yellow(`[${combo.combination.join(' + ')}]`));
      console.log(`  Used ${combo.frequency} times | Total Cost: $${combo.totalCost.toFixed(2)}`);
      console.log(`  Agents: ${combo.agents.join(', ')}`);
      console.log();
    }

    // Suggest standardization
    if (combinations.length > 5) {
      console.log(chalk.cyan('\n💡 Standardization Opportunity:'));
      console.log('Consider standardizing model combinations across similar operations');
      console.log('to improve predictability and potentially negotiate better rates.');
    }
  });

program
  .command('report')
  .description('Generate comprehensive optimization report')
  .option('-o, --output <file>', 'Output file', 'model-optimization-report.md')
  .action(async (options) => {
    console.log(chalk.blue('📊 Generating comprehensive report...'));
    
    const analytics = getModelUsageAnalytics();
    const report = await analytics.generateCostOptimizationReport();
    
    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, report);
    
    console.log(chalk.green(`\n✅ Report generated successfully!`));
    console.log(`📄 Saved to: ${outputPath}`);
    
    // Parse and show summary
    const recommendations = await analytics.generateOptimizationRecommendations();
    const totalSavings = recommendations.reduce((sum, r) => sum + r.potentialSavings, 0);
    
    console.log(chalk.yellow('\n📋 Report Summary:'));
    console.log(`  - Optimization Opportunities: ${recommendations.length}`);
    console.log(`  - Potential Monthly Savings: $${totalSavings.toFixed(2)}`);
    console.log(`  - Top Recommendation: Switch ${recommendations[0]?.currentModel} to ${recommendations[0]?.recommendedModel}`);
    
    console.log(chalk.cyan('\n💡 Next Steps:'));
    console.log('  1. Review the report for detailed recommendations');
    console.log('  2. Test recommended models on non-critical operations');
    console.log('  3. Monitor quality metrics after changes');
    console.log('  4. Implement gradual rollout for production');
  });

program
  .command('simulate <agent> <operation> <model>')
  .description('Simulate cost impact of switching to a different model')
  .action(async (agent, operation, newModel) => {
    console.log(chalk.blue(`🔮 Simulating model switch for ${agent} - ${operation}...`));
    
    const analytics = getModelUsageAnalytics();
    const metrics = await analytics.getModelPerformanceMetrics();
    
    // Find current metrics for this agent/operation
    const current = metrics.find(m => 
      m.agent === agent && m.operation === operation
    );
    
    if (!current) {
      console.log(chalk.red(`\n❌ No data found for ${agent} - ${operation}`));
      return;
    }

    // Calculate new costs
    const pricing = {
      'openai/gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'openai/gpt-4': { input: 0.03, output: 0.06 },
      'openai/gpt-4o': { input: 0.005, output: 0.015 },
      'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'openai/gpt-4-turbo': { input: 0.01, output: 0.03 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      'claude-3-opus': { input: 0.015, output: 0.075 }
    };

    const newPricing = pricing[newModel as keyof typeof pricing];
    if (!newPricing) {
      console.log(chalk.red(`\n❌ Unknown model: ${newModel}`));
      return;
    }

    const newCostPerCall = 
      (current.avgInputTokens * newPricing.input / 1000) + 
      (current.avgOutputTokens * newPricing.output / 1000);
    
    const currentMonthly = current.avgCostPerCall * current.totalCalls;
    const newMonthly = newCostPerCall * current.totalCalls;
    const savings = currentMonthly - newMonthly;
    const savingsPercent = (savings / currentMonthly) * 100;

    console.log(chalk.green('\n📊 Simulation Results:\n'));
    console.log(`Current Model: ${current.model}`);
    console.log(`  - Avg Cost/Call: $${current.avgCostPerCall.toFixed(4)}`);
    console.log(`  - Monthly Cost: $${currentMonthly.toFixed(2)}`);
    console.log(`  - Success Rate: ${current.successRate.toFixed(1)}%`);
    
    console.log(`\nNew Model: ${newModel}`);
    console.log(`  - Avg Cost/Call: $${newCostPerCall.toFixed(4)}`);
    console.log(`  - Monthly Cost: $${newMonthly.toFixed(2)}`);
    
    if (savings > 0) {
      console.log(chalk.green(`\n💰 Potential Savings: $${savings.toFixed(2)}/month (${savingsPercent.toFixed(1)}%)`));
    } else {
      console.log(chalk.red(`\n⚠️ Cost Increase: $${Math.abs(savings).toFixed(2)}/month (${Math.abs(savingsPercent).toFixed(1)}%)`));
    }
    
    console.log(chalk.yellow('\n⚠️ Note: This simulation assumes:'));
    console.log('  - Same token usage patterns');
    console.log('  - Similar success rates');
    console.log('  - No change in retry behavior');
    console.log('\nActual results may vary. Test thoroughly before switching.');
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}