#!/usr/bin/env node
/**
 * Real-World Pipeline Demo
 * 
 * This demonstrates how CodeQual works in practice:
 * 1. Analyze a real PR with mixed changes (security + performance + architecture)
 * 2. Show intelligent agent selection based on file patterns
 * 3. Demonstrate deduplication when multiple agents find similar issues
 * 4. Show cost savings from skipping irrelevant agents
 */

const { config } = require('dotenv');
const path = require('path');
const chalk = require('chalk');

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

// Import compiled modules
const { PRContentAnalyzer } = require('../../../../apps/api/src/services/intelligence/pr-content-analyzer.js');
const { IntelligentResultMerger } = require('../../../../apps/api/src/services/intelligence/intelligent-result-merger.js');
const { BasicDeduplicator } = require('../../../../packages/agents/dist/services/basic-deduplicator.js');

// Real-world scenario: E-commerce platform adding AI-powered product recommendations
const ECOMMERCE_AI_PR_FILES = [
  {
    filename: 'src/services/recommendation-engine.ts',
    additions: 200,
    deletions: 50,
    changes: 250,
    patch: `
+import { OpenAI } from 'openai';
+import { cache } from '../utils/cache';
+
+export class RecommendationEngine {
+  private openai: OpenAI;
+  private readonly API_KEY = process.env.OPENAI_API_KEY; // TODO: move to config
+  
+  constructor() {
+    this.openai = new OpenAI({ apiKey: this.API_KEY });
+  }
+  
+  async getRecommendations(userId: string, context: any) {
+    const cacheKey = \`recommendations:\${userId}\`;
+    const cached = await cache.get(cacheKey);
+    if (cached) return cached;
+    
+    // Call OpenAI API
+    const completion = await this.openai.chat.completions.create({
+      model: 'gpt-4',
+      messages: [
+        { role: 'system', content: 'You are a product recommendation assistant.' },
+        { role: 'user', content: \`Recommend products for user \${userId} with context: \${JSON.stringify(context)}\` }
+      ]
+    });
+    
+    const recommendations = completion.choices[0].message.content;
+    await cache.set(cacheKey, recommendations, 300); // 5 minute cache
+    return recommendations;
+  }
+}
`
  },
  {
    filename: 'src/controllers/product-controller.ts',
    additions: 80,
    deletions: 20,
    changes: 100,
    patch: `
+import { RecommendationEngine } from '../services/recommendation-engine';
+
 export class ProductController {
+  private recommendationEngine: RecommendationEngine;
+  
   constructor() {
+    this.recommendationEngine = new RecommendationEngine();
   }
   
+  async getPersonalizedProducts(req: Request, res: Response) {
+    const userId = req.user.id;
+    const userContext = {
+      browsingHistory: req.session.browsingHistory,
+      purchaseHistory: await this.getUserPurchases(userId),
+      preferences: req.user.preferences
+    };
+    
+    try {
+      const recommendations = await this.recommendationEngine.getRecommendations(userId, userContext);
+      const products = await this.fetchProductsByRecommendations(recommendations);
+      res.json({ products });
+    } catch (error) {
+      // Fallback to default recommendations
+      const defaultProducts = await this.getDefaultProducts();
+      res.json({ products: defaultProducts });
+    }
+  }
`
  },
  {
    filename: 'src/utils/prompt-validator.ts',
    additions: 120,
    deletions: 0,
    changes: 120,
    patch: `
+export class PromptValidator {
+  private readonly INJECTION_PATTERNS = [
+    /ignore.*previous.*instructions/i,
+    /system.*prompt/i,
+    /act.*as.*if/i,
+    /pretend.*you.*are/i
+  ];
+  
+  validatePrompt(prompt: string): { isValid: boolean; issues: string[] } {
+    const issues = [];
+    
+    // Check for injection attempts
+    for (const pattern of this.INJECTION_PATTERNS) {
+      if (pattern.test(prompt)) {
+        issues.push('Potential prompt injection detected');
+        break;
+      }
+    }
+    
+    // Check prompt length
+    if (prompt.length > 4000) {
+      issues.push('Prompt exceeds maximum length');
+    }
+    
+    // Check for sensitive data
+    if (this.containsSensitiveData(prompt)) {
+      issues.push('Prompt contains potentially sensitive data');
+    }
+    
+    return {
+      isValid: issues.length === 0,
+      issues
+    };
+  }
+  
+  private containsSensitiveData(prompt: string): boolean {
+    const sensitivePatterns = [
+      /\\b\\d{16}\\b/, // Credit card
+      /\\b\\d{3}-\\d{2}-\\d{4}\\b/, // SSN
+      /password\\s*[:=]\\s*\\S+/i
+    ];
+    
+    return sensitivePatterns.some(pattern => pattern.test(prompt));
+  }
+}
`
  },
  {
    filename: 'package.json',
    additions: 2,
    deletions: 0,
    changes: 2,
    patch: `
   "dependencies": {
+    "openai": "^4.20.0",
+    "@langchain/core": "^0.1.0",
     "express": "^4.18.2",
`
  }
];

// Simulated findings from different agents
const AI_PR_FINDINGS = {
  security: [
    {
      id: 'sec-ai-1',
      type: 'vulnerability',
      severity: 'critical',
      category: 'security',
      title: 'Hardcoded API Key',
      description: 'OpenAI API key hardcoded in source code',
      file: 'src/services/recommendation-engine.ts',
      line: 6,
      confidence: 0.98,
      _agentSource: 'security'
    },
    {
      id: 'sec-ai-2',
      type: 'vulnerability',
      severity: 'high',
      category: 'security',
      title: 'Insufficient Prompt Injection Protection',
      description: 'Prompt validator may not catch all injection patterns',
      file: 'src/utils/prompt-validator.ts',
      line: 15,
      confidence: 0.85,
      _agentSource: 'security'
    },
    {
      id: 'sec-ai-3',
      type: 'vulnerability',
      severity: 'medium',
      category: 'security',
      title: 'User Data in AI Prompts',
      description: 'Sensitive user context passed to external AI service',
      file: 'src/controllers/product-controller.ts',
      line: 23,
      confidence: 0.78,
      _agentSource: 'security'
    }
  ],
  codeQuality: [
    {
      id: 'cq-ai-1',
      type: 'issue',
      severity: 'high',
      category: 'code-quality',
      title: 'Missing Error Handling',
      description: 'No retry logic for AI API calls',
      file: 'src/services/recommendation-engine.ts',
      line: 25,
      confidence: 0.9,
      _agentSource: 'codeQuality'
    },
    {
      id: 'cq-ai-2',
      type: 'issue',
      severity: 'medium',
      category: 'code-quality',
      title: 'Hardcoded Configuration',
      description: 'API key should be in configuration service',
      file: 'src/services/recommendation-engine.ts',
      line: 6,
      confidence: 0.88,
      _agentSource: 'codeQuality'
    }
  ],
  architecture: [
    {
      id: 'arch-ai-1',
      type: 'issue',
      severity: 'high',
      category: 'architecture',
      title: 'Missing Abstraction Layer',
      description: 'Direct dependency on OpenAI SDK, no provider abstraction',
      file: 'src/services/recommendation-engine.ts',
      line: 10,
      confidence: 0.92,
      _agentSource: 'architecture'
    },
    {
      id: 'arch-ai-2',
      type: 'issue',
      severity: 'medium',
      category: 'architecture',
      title: 'Tight Coupling',
      description: 'Controller directly instantiates recommendation engine',
      file: 'src/controllers/product-controller.ts',
      line: 7,
      confidence: 0.8,
      _agentSource: 'architecture'
    }
  ],
  performance: [
    {
      id: 'perf-ai-1',
      type: 'issue',
      severity: 'high',
      category: 'performance',
      title: 'Short Cache TTL',
      description: 'AI response cache only 5 minutes, consider longer TTL',
      file: 'src/services/recommendation-engine.ts',
      line: 27,
      confidence: 0.75,
      _agentSource: 'performance'
    },
    {
      id: 'perf-ai-2',
      type: 'issue',
      severity: 'medium',
      category: 'performance',
      title: 'No Rate Limiting',
      description: 'AI API calls not rate limited, risk of quota exhaustion',
      file: 'src/services/recommendation-engine.ts',
      line: 20,
      confidence: 0.82,
      _agentSource: 'performance'
    }
  ]
};

async function runRealWorldDemo() {
  console.log(chalk.bold.cyan('🌟 CodeQual Real-World Pipeline Demo\n'));
  console.log(chalk.gray('Scenario: E-commerce platform adding AI-powered product recommendations\n'));
  
  try {
    // Step 1: PR Content Analysis
    console.log(chalk.yellow('📊 Step 1: Intelligent PR Analysis'));
    const analyzer = new PRContentAnalyzer();
    const prAnalysis = await analyzer.analyzePR(ECOMMERCE_AI_PR_FILES);
    
    console.log('  Files changed:', ECOMMERCE_AI_PR_FILES.length);
    console.log('  Change types detected:', prAnalysis.changeTypes);
    console.log('  Complexity:', prAnalysis.complexity);
    console.log('  Risk level:', prAnalysis.riskLevel);
    console.log('');
    
    console.log(chalk.cyan('  🎯 Agent Selection:'));
    console.log('  Agents to run:', chalk.green(prAnalysis.agentsToKeep.join(', ')));
    console.log('  Agents skipped:', chalk.red(prAnalysis.agentsToSkip.length > 0 ? prAnalysis.agentsToSkip.join(', ') : 'none'));
    
    // Validate AI/ML detection
    const hasAIPatterns = ECOMMERCE_AI_PR_FILES.some(f => 
      f.filename.includes('recommendation') || 
      f.filename.includes('prompt') ||
      f.patch.includes('openai') ||
      f.patch.includes('prompt')
    );
    
    if (hasAIPatterns && prAnalysis.agentsToKeep.includes('security')) {
      console.log(chalk.green('  ✓ AI/ML patterns detected - security agent activated'));
    }
    console.log('');
    
    // Step 2: Simulate Agent Execution
    console.log(chalk.yellow('🤖 Step 2: Multi-Agent Analysis'));
    const agentResults = [];
    
    // Run only the agents that weren't skipped
    if (prAnalysis.agentsToKeep.includes('security')) {
      console.log('  Running Security Agent...');
      agentResults.push({
        agentId: 'sec-001',
        agentRole: 'security',
        findings: AI_PR_FINDINGS.security
      });
      console.log('    Found:', chalk.red(`${AI_PR_FINDINGS.security.length} security issues`));
    }
    
    if (prAnalysis.agentsToKeep.includes('codeQuality')) {
      console.log('  Running Code Quality Agent...');
      agentResults.push({
        agentId: 'cq-001',
        agentRole: 'codeQuality',
        findings: AI_PR_FINDINGS.codeQuality
      });
      console.log('    Found:', chalk.yellow(`${AI_PR_FINDINGS.codeQuality.length} code quality issues`));
    }
    
    if (prAnalysis.agentsToKeep.includes('architecture')) {
      console.log('  Running Architecture Agent...');
      agentResults.push({
        agentId: 'arch-001',
        agentRole: 'architecture',
        findings: AI_PR_FINDINGS.architecture
      });
      console.log('    Found:', chalk.blue(`${AI_PR_FINDINGS.architecture.length} architecture issues`));
    }
    
    if (prAnalysis.agentsToKeep.includes('performance')) {
      console.log('  Running Performance Agent...');
      agentResults.push({
        agentId: 'perf-001',
        agentRole: 'performance',
        findings: AI_PR_FINDINGS.performance
      });
      console.log('    Found:', chalk.magenta(`${AI_PR_FINDINGS.performance.length} performance issues`));
    }
    
    const totalFindings = agentResults.reduce((sum, r) => sum + r.findings.length, 0);
    console.log(`\n  Total raw findings: ${totalFindings}`);
    console.log('');
    
    // Step 3: Deduplication Demo
    console.log(chalk.yellow('🔍 Step 3: Intelligent Deduplication'));
    
    // Show that security and code quality both found the API key issue
    const apiKeyFindings = [];
    agentResults.forEach(result => {
      const apiKeyIssues = result.findings.filter(f => 
        f.description.toLowerCase().includes('api key') ||
        f.description.toLowerCase().includes('hardcoded')
      );
      if (apiKeyIssues.length > 0) {
        apiKeyFindings.push({ agent: result.agentRole, findings: apiKeyIssues });
      }
    });
    
    if (apiKeyFindings.length > 1) {
      console.log(chalk.cyan('  📍 Cross-agent duplicate detected:'));
      apiKeyFindings.forEach(af => {
        console.log(`    - ${af.agent} agent: "${af.findings[0].title}"`);
      });
      console.log('    → Will be merged into single finding with consensus\n');
    }
    
    // Run deduplication
    const deduplicator = new BasicDeduplicator();
    for (const agentResult of agentResults) {
      const dedupResult = deduplicator.deduplicateFindings(agentResult.findings);
      agentResult.findings = dedupResult.deduplicated;
    }
    
    // Step 4: Cross-agent merging
    console.log(chalk.yellow('🔄 Step 4: Cross-Agent Intelligence'));
    const merger = new IntelligentResultMerger();
    const mergedResults = await merger.mergeResults(agentResults);
    
    console.log('  Merging results across agents...');
    console.log('  Before merge:', mergedResults.statistics.totalFindings.beforeMerge, 'findings');
    console.log('  After merge:', mergedResults.statistics.totalFindings.afterMerge, 'findings');
    console.log('  Duplicates removed:', mergedResults.statistics.totalFindings.crossAgentDuplicates);
    
    if (mergedResults.crossAgentPatterns.length > 0) {
      console.log(chalk.cyan('\n  🔗 Cross-agent patterns detected:'));
      mergedResults.crossAgentPatterns.forEach(pattern => {
        console.log(`    - "${pattern.pattern}" found by ${pattern.agents.join(' & ')} agents`);
      });
    }
    console.log('');
    
    // Step 5: AI-Specific Insights
    console.log(chalk.yellow('🧠 Step 5: AI/ML-Specific Analysis'));
    
    const aiFindings = mergedResults.findings.filter(f => 
      f.description.toLowerCase().includes('ai') ||
      f.description.toLowerCase().includes('prompt') ||
      f.description.toLowerCase().includes('openai') ||
      f.file.includes('recommendation') ||
      f.file.includes('prompt')
    );
    
    console.log(`  AI/ML-related findings: ${aiFindings.length}`);
    
    const criticalAIFindings = aiFindings.filter(f => f.severity === 'critical' || f.severity === 'high');
    if (criticalAIFindings.length > 0) {
      console.log(chalk.red(`  ⚠️  Critical AI/ML issues found:`));
      criticalAIFindings.forEach(f => {
        console.log(`    - ${f.title} (${f.file})`);
      });
    }
    console.log('');
    
    // Step 6: Final Report
    console.log(chalk.yellow('📝 Step 6: Actionable Report Generation'));
    
    const report = {
      summary: `AI-Powered Recommendation System Analysis`,
      statistics: {
        totalFindings: mergedResults.findings.length,
        criticalFindings: mergedResults.findings.filter(f => f.severity === 'critical').length,
        highFindings: mergedResults.findings.filter(f => f.severity === 'high').length,
        aiSpecificFindings: aiFindings.length
      },
      topRecommendations: [
        '🔴 CRITICAL: Remove hardcoded API key and use secure configuration',
        '🟡 HIGH: Implement provider abstraction for AI services',
        '🟡 HIGH: Enhance prompt injection protection',
        '🔵 MEDIUM: Add retry logic and rate limiting for AI API calls',
        '🔵 MEDIUM: Increase cache TTL for AI responses to reduce costs'
      ]
    };
    
    console.log('  ' + chalk.bold(report.summary));
    console.log('  ────────────────────────────────────');
    console.log('  Total issues:', report.statistics.totalFindings);
    console.log('  Critical:', chalk.red(report.statistics.criticalFindings));
    console.log('  High:', chalk.yellow(report.statistics.highFindings));
    console.log('  AI-specific:', chalk.cyan(report.statistics.aiSpecificFindings));
    console.log('');
    
    console.log('  ' + chalk.bold('Top Recommendations:'));
    report.topRecommendations.forEach(rec => {
      console.log('  ' + rec);
    });
    console.log('');
    
    // Cost Analysis
    console.log(chalk.green.bold('💰 Cost Optimization Analysis:'));
    const allAgents = ['security', 'codeQuality', 'architecture', 'performance', 'dependencies'];
    const skippedAgents = allAgents.filter(a => !prAnalysis.agentsToKeep.includes(a));
    const costSavings = (skippedAgents.length / allAgents.length * 100).toFixed(1);
    
    console.log(`  Agents run: ${prAnalysis.agentsToKeep.length} of ${allAgents.length}`);
    console.log(`  Agents skipped: ${skippedAgents.join(', ') || 'none'}`);
    console.log(`  Cost savings: ${costSavings}%`);
    
    if (prAnalysis.agentsToSkip.includes('dependencies') && !ECOMMERCE_AI_PR_FILES.some(f => f.filename === 'package.json')) {
      console.log(chalk.gray('  Note: Dependencies agent would have been skipped if no package.json changes'));
    }
    
    console.log('');
    console.log(chalk.green.bold('✅ Pipeline Execution Complete!'));
    console.log(chalk.gray('\nThis demo shows how CodeQual:'));
    console.log(chalk.gray('• Intelligently selects agents based on PR content'));
    console.log(chalk.gray('• Detects AI/ML patterns and activates specialized checks'));
    console.log(chalk.gray('• Deduplicates findings across multiple agents'));
    console.log(chalk.gray('• Provides actionable, prioritized recommendations'));
    console.log(chalk.gray('• Optimizes costs by skipping irrelevant agents'));
    
  } catch (error) {
    console.error(chalk.red('❌ Demo failed:'), error);
    process.exit(1);
  }
}

// Run the demo
runRealWorldDemo().catch(console.error);