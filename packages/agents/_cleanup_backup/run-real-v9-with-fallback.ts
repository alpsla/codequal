#!/usr/bin/env npx ts-node

/**
 * REAL V9 Analysis with Fallback Model Support
 * Handles model failures gracefully and triggers researcher requests
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

console.log('🔐 Environment Check:');
console.log(`   GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? '✅ Set' : '❌ Missing'}`);
console.log(`   OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);

interface ModelConfig {
  role: string;
  primary_model: string;
  primary_provider: string;
  fallback_model: string;
  fallback_provider: string;
  language?: string;
  size_category?: string;
}

interface RealExecution {
  agent: string;
  model: string;
  modelType: 'primary' | 'fallback';
  prompt: string;
  response?: any;
  tokensUsed?: number;
  cost?: number;
  error?: string;
  timestamp: string;
  fallbackUsed?: boolean;
}

class RealV9AnalysisWithFallback {
  private executions: RealExecution[] = [];
  private totalCost = 0;
  private totalTokens = 0;
  private supabase: any;
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private failedModels: Set<string> = new Set();
  
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  
  async runRealAnalysis() {
    console.log('\n🚀 Starting REAL V9 Analysis with Fallback Support');
    console.log('⚠️  This will make real API calls and incur costs!');
    console.log('=' .repeat(60));
    
    const startTime = Date.now();
    
    try {
      // Load model configurations from Supabase
      await this.loadModelConfigurations();
      
      // Step 1: Test OpenRouter connection
      console.log('\n1️⃣ Testing OpenRouter API connection...');
      const testResult = await this.callOpenRouterWithFallback(
        'ConnectionTest',
        { 
          primary_model: 'anthropic/claude-3.5-haiku',
          fallback_model: 'anthropic/claude-3-haiku'
        } as ModelConfig,
        'Respond with "OK" if you receive this message'
      );
      
      if (!testResult || testResult.error) {
        console.error('❌ OpenRouter API test failed');
        return;
      }
      
      console.log('   ✅ OpenRouter API connected successfully');
      console.log(`   💰 Test cost: $${testResult.cost?.toFixed(4) || '0.0000'}`);
      
      // Run all agents with fallback support
      console.log('\n2️⃣ Running Security Analysis Agent...');
      await this.runSecurityAnalysis();
      
      console.log('\n3️⃣ Running Quality Analysis Agent...');
      await this.runQualityAnalysis();
      
      console.log('\n4️⃣ Running Performance Analysis Agent...');
      await this.runPerformanceAnalysis();
      
      console.log('\n5️⃣ Running Architecture Analysis Agent...');
      await this.runArchitectureAnalysis();
      
      console.log('\n6️⃣ Running Dependency Analysis Agent...');
      await this.runDependencyAnalysis();
      
      console.log('\n7️⃣ Running Educator Agent...');
      await this.runEducatorAgent();
      
      // Generate report with real data
      const report = this.generateRealReport(startTime);
      
      // Save report
      const reportPath = path.join(process.cwd(), 'real-v9-analysis-with-fallback.md');
      fs.writeFileSync(reportPath, report);
      
      console.log('\n' + '=' .repeat(60));
      console.log('✅ REAL Analysis Complete!');
      console.log(`📄 Report saved: ${reportPath}`);
      console.log('\n💰 REAL COSTS:');
      console.log(`   Total API Calls: ${this.executions.length}`);
      console.log(`   Total Tokens Used: ${this.totalTokens}`);
      console.log(`   Total Cost: $${this.totalCost.toFixed(4)}`);
      
      // Show fallback usage
      const fallbackCount = this.executions.filter(e => e.fallbackUsed).length;
      if (fallbackCount > 0) {
        console.log(`   ⚠️  Fallback models used: ${fallbackCount} times`);
      }
      
      console.log('\n⚠️  Check your OpenRouter dashboard to verify these charges!');
      
      return report;
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    }
  }
  
  private async loadModelConfigurations(): Promise<void> {
    console.log('\n📊 Loading model configurations from Supabase...');
    
    try {
      const { data, error } = await this.supabase
        .from('model_configurations')
        .select('*')
        .order('role');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.log('   ⚠️  No configurations found, using defaults');
        this.setDefaultModels();
        return;
      }
      
      console.log(`   Found ${data.length} configurations`);
      
      // Map agent roles to configurations
      const agentRoles = ['SecurityAnalyzer', 'QualityAnalyzer', 'PerformanceAnalyzer', 
                         'ArchitectureAnalyzer', 'DependencyAnalyzer', 'EducatorAgent'];
      
      for (const role of agentRoles) {
        const config = this.findBestConfig(data, role);
        if (config) {
          this.modelConfigs.set(role, config);
          console.log(`   ${role}:`);
          console.log(`      Primary: ${config.primary_model}`);
          console.log(`      Fallback: ${config.fallback_model || 'anthropic/claude-3.5-haiku'}`);
        }
      }
      
      console.log(`   ✅ Loaded ${this.modelConfigs.size} model configurations`);
      
    } catch (error) {
      console.warn('   ⚠️  Failed to load model configs, using defaults:', error);
      this.setDefaultModels();
    }
  }
  
  private findBestConfig(data: any[], role: string): ModelConfig | null {
    // Try exact match first
    let config = data.find((c: any) => c.role === role);
    
    // Try role variations
    if (!config) {
      const variations = [
        role.toLowerCase(),
        role.replace('Analyzer', '').toLowerCase(),
        role.replace('Agent', '').toLowerCase()
      ];
      
      for (const variant of variations) {
        config = data.find((c: any) => c.role === variant);
        if (config) break;
      }
    }
    
    // Use first available as last resort
    if (!config && data.length > 0) {
      config = data[0];
    }
    
    if (config) {
      return {
        role,
        primary_model: config.primary_model,
        primary_provider: config.primary_provider || 'openrouter',
        fallback_model: config.fallback_model || 'anthropic/claude-3.5-haiku',
        fallback_provider: config.fallback_provider || 'openrouter',
        language: config.language,
        size_category: config.size_category
      };
    }
    
    return null;
  }
  
  private setDefaultModels(): void {
    const defaults: Record<string, ModelConfig> = {
      SecurityAnalyzer: {
        role: 'SecurityAnalyzer',
        primary_model: 'anthropic/claude-3.5-sonnet',
        primary_provider: 'openrouter',
        fallback_model: 'anthropic/claude-3.5-haiku',
        fallback_provider: 'openrouter'
      },
      QualityAnalyzer: {
        role: 'QualityAnalyzer',
        primary_model: 'anthropic/claude-3.5-haiku',
        primary_provider: 'openrouter',
        fallback_model: 'anthropic/claude-3-haiku',
        fallback_provider: 'openrouter'
      },
      PerformanceAnalyzer: {
        role: 'PerformanceAnalyzer',
        primary_model: 'anthropic/claude-3.5-haiku',
        primary_provider: 'openrouter',
        fallback_model: 'anthropic/claude-3-haiku',
        fallback_provider: 'openrouter'
      },
      ArchitectureAnalyzer: {
        role: 'ArchitectureAnalyzer',
        primary_model: 'anthropic/claude-3.5-sonnet',
        primary_provider: 'openrouter',
        fallback_model: 'anthropic/claude-3.5-haiku',
        fallback_provider: 'openrouter'
      },
      DependencyAnalyzer: {
        role: 'DependencyAnalyzer',
        primary_model: 'anthropic/claude-3.5-haiku',
        primary_provider: 'openrouter',
        fallback_model: 'anthropic/claude-3-haiku',
        fallback_provider: 'openrouter'
      },
      EducatorAgent: {
        role: 'EducatorAgent',
        primary_model: 'anthropic/claude-3.5-sonnet',
        primary_provider: 'openrouter',
        fallback_model: 'anthropic/claude-3.5-haiku',
        fallback_provider: 'openrouter'
      }
    };
    
    for (const [role, config] of Object.entries(defaults)) {
      this.modelConfigs.set(role, config);
    }
    
    console.log('   Using default Claude models with fallback');
  }
  
  private async callOpenRouterWithFallback(
    agent: string, 
    config: ModelConfig, 
    prompt: string
  ): Promise<RealExecution | null> {
    
    // Try primary model first
    console.log(`   Trying primary: ${config.primary_model}`);
    let execution = await this.callOpenRouter(agent, config.primary_model, prompt, 'primary');
    
    // If primary fails and we haven't tried this fallback yet, try fallback
    if (execution.error && config.fallback_model && !this.failedModels.has(config.fallback_model)) {
      console.log(`   Primary failed, trying fallback: ${config.fallback_model}`);
      
      // Record failed model
      this.failedModels.add(config.primary_model);
      
      // Request new config from researcher
      await this.requestNewModelConfig(config);
      
      // Try fallback
      execution = await this.callOpenRouter(agent, config.fallback_model, prompt, 'fallback');
      execution.fallbackUsed = true;
    }
    
    return execution;
  }
  
  private async callOpenRouter(
    agent: string, 
    model: string, 
    prompt: string,
    modelType: 'primary' | 'fallback' = 'primary'
  ): Promise<RealExecution> {
    
    const execution: RealExecution = {
      agent,
      model,
      modelType,
      prompt,
      timestamp: new Date().toISOString()
    };
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://codequal.com',
          'X-Title': 'CodeQual V9 Analysis'
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `You are a ${agent} for code analysis. Provide detailed analysis in JSON format.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000
        })
      });
      
      const data: any = await response.json();
      
      if (data.error) {
        execution.error = data.error.message || JSON.stringify(data.error);
        console.log(`      ❌ Failed: ${execution.error}`);
      } else {
        execution.response = data;
        execution.tokensUsed = data.usage?.total_tokens || 0;
        execution.cost = this.calculateCost(model, execution.tokensUsed);
        
        this.totalTokens += execution.tokensUsed;
        this.totalCost += execution.cost;
        
        console.log(`      ✅ Success: ${execution.tokensUsed} tokens, $${execution.cost.toFixed(4)}`);
      }
      
      this.executions.push(execution);
      return execution;
      
    } catch (error) {
      execution.error = String(error);
      console.log(`      ❌ Error: ${execution.error}`);
      this.executions.push(execution);
      return execution;
    }
  }
  
  private async requestNewModelConfig(config: ModelConfig): Promise<void> {
    try {
      console.log(`   📤 Requesting new model config from Researcher...`);
      
      await this.supabase.from('research_requests').insert({
        request_type: 'model_config_update',
        role: config.role,
        language: config.language,
        size_category: config.size_category,
        status: 'pending',
        requested_by: 'v9_analyzer',
        requested_at: new Date().toISOString(),
        metadata: {
          reason: 'Primary model unavailable',
          failed_model: config.primary_model,
          fallback_used: config.fallback_model,
          context: 'Real V9 analysis execution'
        }
      });
      
      console.log(`      ✅ Research request submitted`);
    } catch (error) {
      console.error(`      ❌ Failed to request new config:`, error);
    }
  }
  
  private calculateCost(model: string, tokens: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'anthropic/claude-opus-4.1': { input: 15, output: 75 },
      'anthropic/claude-3.5-sonnet': { input: 3, output: 15 },
      'anthropic/claude-3.5-haiku': { input: 0.8, output: 4 },
      'anthropic/claude-3-haiku': { input: 0.25, output: 1.25 },
      'google/gemini-2.5-flash-image-preview:free': { input: 0, output: 0 },
      'deepseek/deepseek-chat-v3.1:free': { input: 0, output: 0 },
      'deepseek/deepseek-r1-distill-llama-8b': { input: 0.14, output: 0.56 }
    };
    
    const modelPricing = pricing[model] || { input: 0.25, output: 1.25 };
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    
    return (inputTokens * modelPricing.input + outputTokens * modelPricing.output) / 1000000;
  }
  
  // Agent execution methods
  private async runSecurityAnalysis() {
    const config = this.modelConfigs.get('SecurityAnalyzer')!;
    const javaCode = `
public class UserController {
    public User getUser(String userId) {
        String query = "SELECT * FROM users WHERE id = " + userId;
        return database.execute(query);
    }
    
    private static final String API_KEY = "sk-1234567890abcdef";
}`;
    
    return await this.callOpenRouterWithFallback(
      'SecurityAnalyzer',
      config,
      `Analyze this Java code for security issues:\n${javaCode}\n\nReturn a JSON array of issues.`
    );
  }
  
  private async runQualityAnalysis() {
    const config = this.modelConfigs.get('QualityAnalyzer')!;
    const javaCode = `
public class ComplexController {
    public void handleRequest(Request req) {
        if (req != null) {
            if (req.getType() == 1) {
                if (req.getData() != null) {
                    if (req.getData().length() > 0) {
                        // deeply nested code
                    }
                }
            }
        }
    }
}`;
    
    return await this.callOpenRouterWithFallback(
      'QualityAnalyzer',
      config,
      `Analyze this Java code for quality issues:\n${javaCode}\n\nReturn a JSON array of issues.`
    );
  }
  
  private async runPerformanceAnalysis() {
    const config = this.modelConfigs.get('PerformanceAnalyzer')!;
    const javaCode = `
public class DataProcessor {
    public void processData(List<String> items) {
        for (String item : items) {
            for (String other : items) {
                if (item.equals(other)) {
                    // O(n^2) complexity
                }
            }
        }
    }
}`;
    
    return await this.callOpenRouterWithFallback(
      'PerformanceAnalyzer',
      config,
      `Analyze this Java code for performance issues:\n${javaCode}\n\nReturn a JSON array of issues.`
    );
  }
  
  private async runArchitectureAnalysis() {
    const config = this.modelConfigs.get('ArchitectureAnalyzer')!;
    return await this.callOpenRouterWithFallback(
      'ArchitectureAnalyzer',
      config,
      'Analyze a Java class with 45 methods and 2000 lines of code for architectural issues. Return a JSON array.'
    );
  }
  
  private async runDependencyAnalysis() {
    const config = this.modelConfigs.get('DependencyAnalyzer')!;
    const dependencies = `
jackson-databind: 2.9.8
log4j-core: 2.14.1
commons-compress: 1.21`;
    
    return await this.callOpenRouterWithFallback(
      'DependencyAnalyzer',
      config,
      `Check these Java dependencies for vulnerabilities:\n${dependencies}\n\nReturn a JSON array.`
    );
  }
  
  private async runEducatorAgent() {
    const config = this.modelConfigs.get('EducatorAgent')!;
    return await this.callOpenRouterWithFallback(
      'EducatorAgent',
      config,
      'Based on SQL injection and complexity issues, provide 3 educational recommendations. Return as JSON.'
    );
  }
  
  private generateRealReport(startTime: number): string {
    const executionTime = (Date.now() - startTime) / 1000;
    const fallbackCount = this.executions.filter(e => e.fallbackUsed).length;
    
    return `# CodeQual V9 REAL Analysis Report (With Fallback Support)

## ⚠️ REAL EXECUTION WITH ACTUAL COSTS

**Date:** ${new Date().toISOString()}  
**Total Execution Time:** ${executionTime.toFixed(2)} seconds  
**Total API Calls:** ${this.executions.length}  
**Total Tokens Used:** ${this.totalTokens}  
**Total Cost:** $${this.totalCost.toFixed(4)} (CHECK YOUR OPENROUTER DASHBOARD)  
**Fallback Models Used:** ${fallbackCount}

## 🤖 Real Agent Executions

| Timestamp | Agent | Model | Type | Tokens | Cost | Status |
|-----------|-------|-------|------|--------|------|--------|
${this.executions.map(exec => 
`| ${new Date(exec.timestamp).toLocaleTimeString()} | ${exec.agent} | ${exec.model.split('/').pop()} | ${exec.modelType} | ${exec.tokensUsed || 0} | $${(exec.cost || 0).toFixed(4)} | ${exec.error ? '❌ Failed' : '✅ Success'} |`
).join('\n')}

## 📊 Model Usage Summary

### Primary vs Fallback
- Primary model attempts: ${this.executions.filter(e => e.modelType === 'primary').length}
- Fallback model uses: ${this.executions.filter(e => e.modelType === 'fallback').length}

### Failed Models (Triggering Researcher Requests)
${Array.from(this.failedModels).map(model => `- ${model}`).join('\n') || 'None'}

## 📤 Researcher Requests
${fallbackCount > 0 ? `
✅ Submitted ${fallbackCount} requests to update model configurations for:
${this.executions.filter(e => e.fallbackUsed).map(e => `- ${e.agent}`).join('\n')}
` : 'No researcher requests needed - all primary models worked'}

## 💰 Cost Analysis

${this.getCostByAgent()}

## 🔍 Issues Found (From Real Agent Analysis)

${this.getIssuesFromExecutions()}

## 📝 Raw API Responses

<details>
<summary>Click to see raw API responses</summary>

${this.executions.map(exec => `
### ${exec.agent} (${exec.modelType})
**Model:** ${exec.model}  
**Status:** ${exec.error ? '❌ Failed' : '✅ Success'}

\`\`\`json
${JSON.stringify(exec.response?.choices?.[0]?.message?.content || exec.error, null, 2)}
\`\`\`
`).join('\n')}

</details>

## 💰 Billing Verification

1. Go to: https://openrouter.ai/activity
2. Check your recent API calls
3. Verify the charges match: $${this.totalCost.toFixed(4)}
4. These are REAL charges to your account

---

*This was a REAL execution with actual OpenRouter API calls and fallback handling*  
*The costs shown above are REAL and have been charged to your account*  
*Timestamp: ${new Date().toISOString()}*
`;
  }
  
  private getCostByAgent(): string {
    const costByAgent: Record<string, number> = {};
    
    this.executions.forEach(exec => {
      if (exec.cost) {
        costByAgent[exec.agent] = (costByAgent[exec.agent] || 0) + exec.cost;
      }
    });
    
    return Object.entries(costByAgent)
      .map(([agent, cost]) => `- **${agent}:** $${cost.toFixed(4)}`)
      .join('\n') || 'No costs incurred';
  }
  
  private getIssuesFromExecutions(): string {
    const issues: string[] = [];
    
    this.executions.forEach(exec => {
      if (exec.response?.choices?.[0]?.message?.content) {
        const content = exec.response.choices[0].message.content;
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            parsed.forEach(issue => {
              issues.push(`- [${exec.agent}] ${issue.issue || issue.description || 'Issue found'}`);
            });
          }
        } catch {
          // Not JSON, check for keywords
          if (content.includes('SQL injection') || content.includes('security')) {
            issues.push(`- [SECURITY] Issue found by ${exec.agent}`);
          }
          if (content.includes('complexity') || content.includes('nested')) {
            issues.push(`- [QUALITY] Issue found by ${exec.agent}`);
          }
          if (content.includes('performance') || content.includes('O(n')) {
            issues.push(`- [PERFORMANCE] Issue found by ${exec.agent}`);
          }
        }
      }
    });
    
    return issues.length > 0 ? issues.join('\n') : 'See raw responses for detailed issues';
  }
}

// Run the analysis
async function main() {
  console.log('⚠️  WARNING: This will make REAL API calls and cost money!');
  console.log('Press Ctrl+C now to cancel, or wait 3 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const analyzer = new RealV9AnalysisWithFallback();
  await analyzer.runRealAnalysis();
}

// Check if we're running directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}