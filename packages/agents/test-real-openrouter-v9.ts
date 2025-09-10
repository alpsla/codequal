#!/usr/bin/env npx ts-node

/**
 * Simple Real OpenRouter API Test for V9
 * This will make an actual API call to verify charges
 */

import { AIService } from './src/standard/services/ai-service';

async function testRealOpenRouterCall() {
  console.log('🚨 Making REAL OpenRouter API call...\n');
  
  const aiService = new AIService({
    openRouterApiKey: process.env.OPENROUTER_API_KEY
  });
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not set');
    process.exit(1);
  }
  
  // Use a model that definitely exists on OpenRouter
  const model = {
    model: 'openai/gpt-3.5-turbo',
    provider: 'openai',
    pricing: { input: 0.5, output: 1.5 }
  };
  
  try {
    console.log('📤 Sending request to OpenRouter...');
    console.log('Model: openai/gpt-3.5-turbo');
    console.log('Analyzing Java code for V9 report...\n');
    
    const response = await aiService.call(model as any, {
      prompt: `Analyze this Java code for security issues and return a detailed analysis:

public class DatabaseConnection {
    private static String password = "admin123";
    
    public Connection getConnection() {
        String url = "jdbc:mysql://localhost:3306/db?user=root&password=" + password;
        return DriverManager.getConnection(url);
    }
    
    public ResultSet executeQuery(String userInput) {
        Statement stmt = connection.createStatement();
        String query = "SELECT * FROM users WHERE name = '" + userInput + "'";
        return stmt.executeQuery(query);
    }
}

Provide a detailed security analysis with:
1. Issues found (severity, type, line number)
2. Business impact
3. Suggested fixes with code examples
4. Educational resources`,
      temperature: 0.3,
      maxTokens: 1000
    });
    
    console.log('✅ Response received!\n');
    console.log('='.repeat(80));
    console.log('ANALYSIS RESULT:');
    console.log('='.repeat(80));
    console.log(response.content);
    console.log('='.repeat(80));
    
    if (response.usage) {
      console.log('\n📊 Token Usage:');
      console.log(`   Prompt tokens: ${response.usage.promptTokens}`);
      console.log(`   Completion tokens: ${response.usage.completionTokens}`);
      console.log(`   Total tokens: ${response.usage.totalTokens}`);
    }
    
    if (response.cost) {
      console.log(`\n💰 Cost: $${response.cost.toFixed(6)}`);
    }
    
    console.log('\n✅ Check your OpenRouter dashboard now!');
    console.log('   https://openrouter.ai/activity');
    console.log('   You should see this request and the charge!\n');
    
  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

// Run it
testRealOpenRouterCall().catch(console.error);